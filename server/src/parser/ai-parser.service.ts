import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

// ─── Structured result returned by the AI ───
export interface AiParseResult {
  type: 'inquiry';
  lane: string;
  vehicleType: string;
  spec: string;
  weights: string[];
  roundTrip: boolean;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Typed outcome so the matcher can tell "AI said no" apart from
// "AI was unavailable (quota / rate limit / network)". A plain null
// cannot express that difference — which is how a 429 quota death got
// logged as "Text not an inquiry — ignored" and real inquiries were
// silently misclassified as OTHER. ───
export type AiParseOutcome =
  | { status: 'parsed'; data: AiParseResult } // AI ran and extracted an inquiry
  | { status: 'not_inquiry' } // AI ran and said it's not an inquiry
  | { status: 'unavailable'; reason: string }; // AI never ran / call failed — conclude NOTHING

// ─── The prompt: teaches the AI YOUR group's message formats ───
const SYSTEM_PROMPT = `You extract structured logistics data from WhatsApp messages of an Indian freight/transport company (shipping containers, trailers, partloads). Messages come from transport requesters and pricing staff, with typos, OCR-like garbles, and inconsistent formatting.

Return ONLY valid JSON — no explanations, no markdown fences. Schema:
{
  "type": "inquiry" | "rate_reply" | "chase" | "other",
  "lane": "<FROM> <pincode> TO <TO> <pincode>",
  "vehicleType": "e.g. 1X40' or 45FT TRAILER X1 or PARTLOAD",
  "spec": "weight spec e.g. 22MT+C",
  "weights": ["22"],
  "roundTrip": true/false
}

Rules:
- "type": inquiry = message requests a rate/vehicle. rate_reply = message mainly provides rates. chase = just a reminder/nudge. other = neither.
- lane: uppercase, "FROM TO" format; include pincodes ONLY if present in the message. For long addresses use the city + pincode.
- Clean up garbles: "1×20GP" means 1X20' GP; "<1" means "x1"; "4s tater x1" means a trailer; "fy wee"/"fy wae" means WEIGHT.
- roundTrip true ONLY if the message says "empty back" / "loaded back".
- Missing fields: use empty string / empty array.

Examples:

MESSAGE: jnpt to Greater Noida 201208 and empty back to jnpt
1x40' weight 22.mt+C
1x40' weight 24.mt+C
IMPORT RATE
JSON: {"type":"inquiry","lane":"JNPT TO GREATER NOIDA 201208","vehicleType":"1X40'","spec":"22MT+C / 24MT+C","weights":["22","24"],"roundTrip":true}

MESSAGE: jnpt to Datani Plaza Mall, Unit 68, Babala-Papdi Road Vasai (West), Maharashtra - 401207
1x20GP weight-13 MT
import rate
JSON: {"type":"inquiry","lane":"JNPT TO VASAI 401207","vehicleType":"1X20' GP","spec":"13MT","weights":["13"],"roundTrip":false}

MESSAGE: Mumbai Airport to Delhi airport
partload weight-210kg
rate
JSON: {"type":"inquiry","lane":"MUMBAI AIRPORT TO DELHI AIRPORT","vehicleType":"PARTLOAD","spec":"210KG","weights":["210"],"roundTrip":false}

MESSAGE: JNPT to L-15/1, TALOJA MIDC, DIST RAIGAD - 410208 and loaded back to jnpt
1x20' weight 5.mt+C
1x40' weight 5.mt+C
EXPO
JSON: {"type":"inquiry","lane":"JNPT TO TALOJA 410208","vehicleType":"1X20' / 1X40'","spec":"5MT+C","weights":["5"],"roundTrip":true}

MESSAGE: 155000/-
JSON: {"type":"rate_reply","lane":"","vehicleType":"","spec":"","weights":[],"roundTrip":false}

MESSAGE: rate plz
JSON: {"type":"chase","lane":"","vehicleType":"","spec":"","weights":[],"roundTrip":false}

For screenshots (SuperProcure load postings): read the route (arrow line + pincodes), VEHICLE row, WEIGHT row, and PICKUP/DROP cities.`;

// ─── Cheap keyword gate, run BEFORE spending a Gemini call. On the free
// tier most group traffic ("👆", "ok", "cargo size") is not worth an API
// call — each junk message was costing quota. ───
const INQUIRY_HINTS = [
  'rate',
  'r8',
  'plz',
  'pls',
  'please',
  'need',
  'want',
  'requir',
  'avail',
  'load',
  'loading',
  'truck',
  'trailer',
  'trola',
  'contain',
  'ship',
  "20'",
  "40'",
  "45'",
  '20ft',
  '40ft',
  '32ft',
  '22ft',
  'partload',
  'import',
  'expo',
  'exim',
  'stuff',
  'pick up',
  'pickup',
  'weight',
  'kg',
  'mt',
  'ton',
  'jnpt',
  'nhava',
  'from',
];

// ─── Circuit-breaker durations ───
const QUOTA_BREAKER_MS = 60 * 60 * 1000; // daily quota gone → stop for an hour
const TRANSIENT_BREAKER_MS = 5 * 60 * 1000; // other HTTP failure → brief pause
const ERROR_BREAKER_MS = 2 * 60 * 1000; // network/parse failure → very brief pause

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);

  // ─── Circuit breaker: while open, no Gemini calls are attempted ───
  private breakerUntil = 0;
  // Last call outcome, so the public methods can distinguish
  // "AI answered but not an inquiry" from "the call itself failed".
  private lastCallFailed = false;
  private lastFailureReason = '';

  constructor(private config: AppConfigService) {}

  // ─── Config: key + model (env var or Settings row) ───
  private get apiKey(): string {
    return (
      process.env.GEMINI_API_KEY ||
      (this.config.SETTINGS as any)?.['gemini_api_key'] ||
      ''
    );
  }

  private get model(): string {
    return (
      process.env.AI_MODEL ||
      (this.config.SETTINGS as any)?.['ai_model'] ||
      'gemini-3.5-flash-lite'
    );
  }

  get enabled(): boolean {
    return !!this.apiKey;
  }

  get breakerActive(): boolean {
    return this.enabled && Date.now() < this.breakerUntil;
  }

  private openBreaker(ms: number, reason: string): void {
    const until = Date.now() + ms;
    if (until <= this.breakerUntil) return; // already open at least this long
    this.breakerUntil = until;
    this.logger.warn(
      `[AI] Circuit breaker OPEN for ${Math.round(ms / 60000)} min (${reason}) — AI parsing paused`,
    );
  }

  // ─── Pre-filter: is this message even worth a Gemini call? ───
  private looksLikeInquiryCandidate(body: string): boolean {
    const t = body.trim();
    if (t.length < 4) return false; // "👆", "ok", "?", "ji"

    // Strip emojis / punctuation: if nothing meaningful remains, skip.
    const stripped = t
      .replace(/[\p{Extended_Pictographic}\p{P}\p{S}]/gu, ' ')
      .trim();
    if (stripped.replace(/\s+/g, ' ').length < 2) return false;

    const lower = ' ' + t.toLowerCase() + ' ';
    const hasHint = INQUIRY_HINTS.some((h) => lower.includes(h));
    const hasNumber = /\d/.test(t);
    return hasHint || hasNumber;
  }

  // ─── Core: call Gemini with a prompt (+ optional image) ───
  private async call(
    prompt: string,
    imageBase64?: string,
    mimeType?: string,
  ): Promise<any | null> {
    this.lastCallFailed = false;
    this.lastFailureReason = '';

    if (!this.enabled) {
      this.lastCallFailed = true;
      this.lastFailureReason = 'no api key';
      return null;
    }

    // Breaker open → don't even try (quota already gone, retrying wastes it).
    if (this.breakerActive) return null;

    try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${this.model}:generateContent?key=${this.apiKey}`;

      const parts: any[] = [{ text: prompt }];
      if (imageBase64) {
        parts.push({
          inline_data: {
            mime_type: mimeType || 'image/jpeg',
            data: imageBase64,
          },
        });
      }

      const reqInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
      };

      let resp = await fetch(url, reqInit);

      // ─── RETRY: only truly transient failures (503 overload,
      // per-minute 429). A daily-quota 429 is NOT transient — retrying
      // is pointless, so we detect it and open the breaker instead. ───
      for (
        let attempt = 1;
        attempt <= 2 && (resp.status === 503 || resp.status === 429);
        attempt++
      ) {
        const bodyText = await resp.text().catch(() => '');

        if (
          resp.status === 429 &&
          /exceeded your current quota/i.test(bodyText)
        ) {
          this.lastCallFailed = true;
          this.lastFailureReason = 'quota exhausted (429)';
          this.openBreaker(QUOTA_BREAKER_MS, 'daily quota exhausted (429)');
          this.logger.error(
            `[AI] Gemini daily quota exhausted — pausing AI calls for ${QUOTA_BREAKER_MS / 60000} min. ` +
              `Free tier resets at midnight Pacific time. Body: ${bodyText.slice(0, 150)}`,
          );
          return null;
        }

        const waitMs = attempt * 2000;
        this.logger.warn(
          `[AI] HTTP ${resp.status} (transient) — retrying in ${waitMs}ms, attempt ${attempt + 1}/3...`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        resp = await fetch(url, reqInit);
      }

      if (!resp.ok) {
        const bodyText = await resp.text().catch(() => '');
        this.lastCallFailed = true;
        this.lastFailureReason = `HTTP ${resp.status}`;
        this.logger.error(
          `[AI] Gemini HTTP ${resp.status} after retries: ${bodyText.slice(0, 200)}`,
        );
        this.openBreaker(TRANSIENT_BREAKER_MS, `HTTP ${resp.status}`);
        return null;
      }

      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        this.logger.warn('[AI] Empty response from Gemini');
        this.lastCallFailed = true;
        this.lastFailureReason = 'empty response';
        return null;
      }

      // strip markdown fences if the model adds them anyway
      const cleaned = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      this.logger.error(`[AI] call failed: ${err.message}`);
      this.lastCallFailed = true;
      this.lastFailureReason = `exception: ${err.message}`;
      this.openBreaker(ERROR_BREAKER_MS, 'network/parse error');
      return null;
    }
  }

  // ─── Validate the AI's answer — never trust it blindly ───
  private validate(raw: any): AiParseResult | null {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.type !== 'inquiry') return null;

    const lane = String(raw.lane || '').trim();
    if (!lane || lane.length < 5) return null;
    if (!/TO/i.test(lane)) {
      // Pickup-only inquiry (destination not stated yet) — accept only if
      // the message has a vehicle type or weights to back it up.
      const hasSpec =
        String(raw.vehicleType || '').trim() ||
        (Array.isArray(raw.weights) && raw.weights.length);
      if (!hasSpec) return null;
    }

    return {
      type: 'inquiry',
      lane: lane.toUpperCase(),
      vehicleType: String(raw.vehicleType || '').toUpperCase(),
      spec: String(raw.spec || '').toUpperCase(),
      weights: Array.isArray(raw.weights)
        ? raw.weights.map((w: any) => String(w))
        : [],
      roundTrip: !!raw.roundTrip,
      confidence:
        raw.confidence === 'low'
          ? 'low'
          : raw.confidence === 'medium'
            ? 'medium'
            : 'high',
    };
  }

  // ─── PUBLIC 1: parse a text message the regex parser failed on ───
  async parseInquiryText(body: string): Promise<AiParseOutcome> {
    if (!this.enabled) {
      return { status: 'unavailable', reason: 'no api key' };
    }
    if (this.breakerActive) {
      this.logger.debug(
        '[AI] Circuit breaker open — skipping parseInquiryText',
      );
      return { status: 'unavailable', reason: 'circuit breaker open' };
    }
    if (!this.looksLikeInquiryCandidate(body)) {
      this.logger.log(
        `[AI] Pre-filter: not worth an API call → "${body.replace(/\s+/g, ' ').slice(0, 50)}"`,
      );
      return { status: 'not_inquiry' };
    }

    const raw = await this.call(SYSTEM_PROMPT + '\n\nMESSAGE:\n' + body);

    if (raw === null || this.lastCallFailed) {
      // The AI never gave an answer — the matcher must NOT conclude this
      // message is OTHER; it should fall back to local rules / requeue.
      this.logger.warn(
        `[AI] parseInquiryText unavailable (${this.lastFailureReason}) — message not classified by AI`,
      );
      return {
        status: 'unavailable',
        reason: this.lastFailureReason || 'call failed',
      };
    }

    const parsed = this.validate(raw);
    if (!parsed) {
      this.logger.log('[AI] Text ran through AI — not an inquiry');
      return { status: 'not_inquiry' };
    }

    this.logger.log(`[AI] Text parsed → lane="${parsed.lane}"`);
    return { status: 'parsed', data: parsed };
  }

  // ─── PUBLIC 2: parse an image (load posting screenshot) ───
  async parseImage(imageUrl: string): Promise<AiParseOutcome> {
    if (!this.enabled) {
      return { status: 'unavailable', reason: 'no api key' };
    }
    if (this.breakerActive) {
      this.logger.debug('[AI] Circuit breaker open — skipping parseImage');
      return { status: 'unavailable', reason: 'circuit breaker open' };
    }
    try {
      const resp = await fetch(imageUrl);
      if (!resp.ok) {
        this.logger.error(`[AI] Image download failed: HTTP ${resp.status}`);
        return {
          status: 'unavailable',
          reason: `image download HTTP ${resp.status}`,
        };
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      if (!buf.length) {
        this.logger.error('[AI] Image download returned 0 bytes');
        return { status: 'unavailable', reason: 'image 0 bytes' };
      }

      const b64 = buf.toString('base64');
      const mime = resp.headers.get('content-type') || 'image/jpeg';

      const raw = await this.call(
        SYSTEM_PROMPT +
          '\n\nThis is a screenshot of a load posting. Extract the inquiry data.',
        b64,
        mime,
      );

      if (raw === null || this.lastCallFailed) {
        return {
          status: 'unavailable',
          reason: this.lastFailureReason || 'call failed',
        };
      }

      const parsed = this.validate(raw);
      if (!parsed) {
        this.logger.log('[AI] Image ran through AI — not an inquiry');
        return { status: 'not_inquiry' };
      }

      this.logger.log(`[AI] Image parsed → lane="${parsed.lane}"`);
      return { status: 'parsed', data: parsed };
    } catch (err: any) {
      this.logger.error(`[AI] parseImage failed: ${err.message}`);
      return { status: 'unavailable', reason: `exception: ${err.message}` };
    }
  }
}
