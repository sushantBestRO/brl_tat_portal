// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { ClassificationPhrase } from '../entities/classification-phrase.entity';

// // ─── Regex patterns (copied from the original parser.py) ───

// // Detects if someone is asking for a rate
// const ASK_RE = new RegExp(
//   '(IMPORT\\s*RATE|EXPORT\\s*RATE|rate\\s*(plz|please|pls)|please share rate|' +
//     'plz share rate|share rate|PLZ RATE|RATE PLZ|\\brate\\b\\s*$|^\\s*rate\\b|' +
//     '\\brate\\s*\\?|market rate\\s*\\?|rate chahiye|freight|' +
//     'plz\\s*place|please\\s*place|pls\\s*place)',
//   'im',
// );

// // Detects a lane (route) — must contain the word "to"
// const LANE_RE = /\bto\b/i;

// // Detects container specs — size, weight, type
// const SPEC_RE = new RegExp(
//   "(\\d+\\s*x\\s*\\d+'|\\d+'\\s|\\d+\\s*ft|\\d+\\s*feet|\\bMT\\b|weight|kg|SXL|MXL|trailer|trailore|cont)",
//   'i',
// );

// // If the message already contains "RATE: 95000", it's not an inquiry
// const QUOTED_RATE_IN_BODY_RE = /RATE[\s:-]*\d{4,6}/i;

// // Import/export container implies a lane + rate ask even without "to" or "rate"
// const IMPLICIT_LANE_ASK_RE = /\b(import|export)\s*container\b/i;

// // Extract weight values: "weight 20300 kg"
// const WEIGHT_RE = /weight\s*([\d.,]+)\s*(kg|mt)?/gi;

// // Phone numbers (to strip them so they don't get mistaken for rates)
// const PHONE_RE = /(\+91[\s-]?\d{5}[\s-]?\d{5}|\b[6-9]\d{9}\b)/g;

// // Vehicle plates (to strip them so they don't get mistaken for rates)
// const VEHICLE_RE = /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4}\b/g;

// // Extract rate amounts: 4-6 digit numbers (₹2000 to ₹400000)
// const AMOUNT_RE = /(?<![\d/])(\d{4,6})(?=\s*(?:\/-|\/|\b))/g;

// // Must contain a rate keyword to be a rate reply
// const RATE_KEYWORD_RE =
//   /(market rate|mkt|rate[\s:=-]*\d|\d{4,6}\s*\/-|\d{4,6}\s*\/)/i;

// // Detects follow-up nudges: "rate?", "plz", "any update", "jaldi"
// const CHASE_RE = new RegExp(
//   '^\\s*(rate|rates|plz rate|rate plz|rate please|please rate|reply|update|' +
//     '\\?+|any update|rate\\?|plz|pls|awaiting|waiting|urgent|jaldi|bhejo rate|' +
//     'rate do|rate batao|rate bata do|plz rate share|rate nahi mila)\\s*[.?!]*\\s*$',
//   'i',
// );

// // Rate values must be in this range
// const MIN_RATE = 2000;
// const MAX_RATE = 400000;

// // Common words to ignore when comparing messages
// const STOPWORDS = new Set([
//   'jnpt',
//   'to',
//   'and',
//   'back',
//   'the',
//   'rate',
//   'import',
//   'export',
//   'weight',
//   'plz',
//   'please',
//   'empty',
//   'loaded',
//   'cargo',
//   'share',
//   'from',
//   'with',
//   'for',
// ]);

// // Container type keywords for vehicleTypeOf
// const CONTAINER_TYPE_KEYWORDS = new Set([
//   'HC',
//   'HQ',
//   'SXL',
//   'MXL',
//   'GP',
//   'OT',
//   'FR',
//   'RT',
//   'DC',
//   'CONTAINER',
//   'TRAILER',
//   'PALETTE',
//   'PALLET',
//   'OPEN',
//   'CLOSED',
//   'DOMESTIC',
//   'IMPORT',
//   'EXPORT',
//   'FLATBED',
//   'TIPPER',
//   'TANKER',
// ]);

// // ─── Result types ───

// export interface ParsedInquiry {
//   lane: string;
//   spec: string;
//   weights: Set<string>;
//   tokens: Set<string>;
//   vehicleType: string;
// }

// export interface ParsedRateReply {
//   rates: string[];
//   weights: Set<string>;
//   tokens: Set<string>;
// }

// @Injectable()
// export class ParserService {
//   private readonly logger = new Logger(ParserService.name);

//   private customAskPhrases: string[] = [];
//   private customChasePhrases: string[] = [];
//   private customAskRe: RegExp | null = null;
//   private customChaseRe: RegExp | null = null;

//   constructor(
//     @InjectRepository(ClassificationPhrase)
//     private phraseRepo: Repository<ClassificationPhrase>,
//   ) {}

//   // ─── Build a regex from user-added phrases ───
//   private buildCustomRe(phrases: string[]): RegExp | null {
//     const escaped = phrases
//       .filter((p) => p && p.trim())
//       .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
//     return escaped.length
//       ? new RegExp('(' + escaped.join('|') + ')', 'i')
//       : null;
//   }

//   setCustomPhrases(asks: string[], chases: string[]) {
//     this.customAskPhrases = [...asks];
//     this.customChasePhrases = [...chases];
//     this.customAskRe = this.buildCustomRe(asks);
//     this.customChaseRe = this.buildCustomRe(chases);
//   }

//   async reloadCustomPhrases() {
//     const rows = await this.phraseRepo.find();
//     this.setCustomPhrases(
//       rows.filter((r) => r.kind === 'ask').map((r) => r.phrase),
//       rows.filter((r) => r.kind === 'chase').map((r) => r.phrase),
//     );
//   }

//   // ─── Helper: normalize text (lowercase, strip punctuation) ───
//   norm(s: string): string {
//     return s
//       .toLowerCase()
//       .replace(/[^a-z0-9 ]/g, ' ')
//       .replace(/\s+/g, ' ')
//       .trim();
//   }

//   // ─── Helper: extract meaningful words (tokens) from text ───
//   tokensOf(s: string): Set<string> {
//     return new Set(
//       this.norm(s)
//         .split(' ')
//         .filter((w) => w.length >= 2 && !STOPWORDS.has(w)),
//     );
//   }

//   // ─── Helper: extract weight values from text ───
//   weightsOf(s: string): Set<string> {
//     const out = new Set<string>();
//     const re = new RegExp(WEIGHT_RE.source, 'gi');
//     let m;
//     while ((m = re.exec(s)) !== null) {
//       const w = m[1].replace(/[^0-9.]/g, '').replace(/\.$/, '');
//       if (w) out.add(w);
//     }
//     return out;
//   }

//   // ─── Helper: clean up extracted text ───
//   private cleanSpecText(text: string): string {
//     let cleaned = text;
//     // Fix "25.mt" → "25MT", "25.kg" → "25KG"
//     cleaned = cleaned.replace(
//       /(\d+)\.(mt|kg|tn)/gi,
//       (_, d, u) => d + u.toUpperCase(),
//     );
//     // Fix "25 mt" → "25MT", "25 kg" → "25KG"
//     cleaned = cleaned.replace(
//       /(\d+)\s+(mt|kg|tn)\b/gi,
//       (_, d, u) => d + u.toUpperCase(),
//     );
//     // Capitalize standalone units
//     cleaned = cleaned.replace(/\bmt\b/gi, 'MT');
//     cleaned = cleaned.replace(/\bkg\b/gi, 'KG');
//     cleaned = cleaned.replace(/\btn\b/gi, 'TN');
//     cleaned = cleaned.replace(/\bton\b/gi, 'TON');
//     // Remove "Cargo" (redundant when "weight" or "container" is present)
//     cleaned = cleaned.replace(/\bCargo\b/gi, '');
//     // Remove duplicate "weight" keywords (keep first)
//     cleaned = cleaned.replace(/\bweight\b.*\bweight\b/i, 'weight');
//     // Clean up extra spaces
//     cleaned = cleaned.replace(/\s+/g, ' ').trim();
//     // Remove trailing/leading punctuation
//     cleaned = cleaned.replace(/[,;\s]+$/, '').trim();
//     cleaned = cleaned.replace(/^[,;\s]+/, '').trim();
//     return cleaned;
//   }

//   // ─── Helper: extract lane (first line, cut before specs) ───
//   laneOf(body: string): string {
//     let firstLine = body.trim().split('\n')[0].trim().replace(/\s+/g, ' ');

//     // Cut before any spec pattern including container sizes like "40'" and "1X20'"
//     const specStart = firstLine.search(
//       /\s\d+\s*[xX]\s*\d+'?|\s\d+'|\s\d+\s*(?:tn|ton|kg|ft|MT|HC|HQ|wheel)|\sweight\b|\scontainer\b/i,
//     );
//     if (specStart > 10) {
//       firstLine = firstLine.slice(0, specStart).trim();
//     }

//     return firstLine.slice(0, 120);
//   }

//   // ─── Helper: extract vehicle type (container size + type, NO weight) ───
//   vehicleTypeOf(body: string): string {
//     if (!body) return '';

//     const lines = body
//       .split('\n')
//       .map((l) => l.trim())
//       .filter(Boolean);
//     const results: string[] = [];

//     for (const line of lines) {
//       // Skip addresses and pincodes
//       if (/\b\d{6}\b/.test(line)) continue;
//       if (/\b(no\.|dist|apmc|india|pin|block|sector|plot|road)\b/i.test(line))
//         continue;

//       // Must contain a container size pattern (e.g., "1X20'", "40'")
//       const sizeMatch = line.match(
//         /(\d+\s*[xX]\s*\d+'?|\d+'\s*(?:HC|HQ|SXL|MXL|GP|OT|FR|RT|DC)?)/i,
//       );
//       if (!sizeMatch) continue;

//       let segment = line;

//       // If the lane is mixed in (contains " to " before the spec), cut from spec start
//       // Also match \d+' patterns (like "40'")
//       const specStartMatch = segment.match(
//         /\b\d+\s*[xX]\s*\d+|\b\d+'|\b\d+\s*(?:tn|ton|kg|ft|MT|HC|HQ)|\bweight\b|\bcontainer\b/i,
//       );
//       if (
//         specStartMatch &&
//         specStartMatch.index !== undefined &&
//         specStartMatch.index > 5
//       ) {
//         const beforeSpec = segment.slice(0, specStartMatch.index);
//         if (/\bto\b/i.test(beforeSpec)) {
//           segment = segment.slice(specStartMatch.index);
//         }
//       }

//       // Cut off trailing route names (e.g., "40' HC to JNPT")
//       const routeMatch = segment.match(
//         /\s+(?:to|from)\s+|\s+empty\s*[,;]?\s*back\b|\s+loaded\s*back\b/i,
//       );
//       if (routeMatch && routeMatch.index !== undefined) {
//         segment = segment.slice(0, routeMatch.index);
//       }

//       // Extract container size + type tokens (SKIP weight-related tokens, DON'T break)
//       const tokens = segment.trim().split(/\s+/);
//       const typeTokens: string[] = [];
//       let skipNextNumber = false;

//       for (const tok of tokens) {
//         const upper = tok.toUpperCase().replace(/[^A-Z+\']/g, '');
//         const hasSize = /\d+\s*[xX]\s*\d+'?|\d+'/.test(tok);
//         const hasDigit = /\d/.test(tok);

//         // Route words — stop
//         if (/\b(to|from|back|empty|loaded)\b/i.test(tok)) break;

//         // Weight keywords (weight, wt, cargo) — skip but DON'T break, continue collecting
//         if (upper === 'WEIGHT' || upper === 'WT' || upper === 'CARGO') {
//           skipNextNumber = true;
//           continue;
//         }

//         // Unit keywords (kg, mt, tn, ton) — skip
//         if (
//           upper === 'KG' ||
//           upper === 'MT' ||
//           upper === 'TN' ||
//           upper === 'TON' ||
//           upper === 'TONS'
//         ) {
//           skipNextNumber = false;
//           continue;
//         }

//         // Container sizes (1X20', 40', etc.)
//         if (hasSize) {
//           typeTokens.push(tok);
//           skipNextNumber = false;
//           continue;
//         }

//         // Container type keywords (HC, HQ, Domestic, Container, etc.)
//         if (CONTAINER_TYPE_KEYWORDS.has(upper)) {
//           typeTokens.push(tok);
//           skipNextNumber = false;
//           continue;
//         }

//         // A number after "weight" — this is a weight value, skip it
//         if (hasDigit && skipNextNumber) {
//           skipNextNumber = false;
//           continue;
//         }

//         // Other numbers that are NOT sizes — skip if 5+ digits (likely weight)
//         if (hasDigit && !hasSize) {
//           const digitsOnly = tok.replace(/[^0-9]/g, '');
//           if (digitsOnly.length >= 5) continue;
//           if (!tok.includes("'") && digitsOnly.length <= 4) continue;
//         }
//       }

//       const typeStr = this.cleanSpecText(typeTokens.join(' '));
//       if (typeStr.length >= 3) {
//         results.push(typeStr.slice(0, 120));
//       }
//     }

//     const unique = [...new Set(results)];
//     return unique.join(' | ').slice(0, 300);
//   }

//   // ─── Helper: extract spec (weight, dimensions) ───
//   specOf(body: string): string {
//     if (!body) return '';

//     const lines = body
//       .split('\n')
//       .map((l) => l.trim())
//       .filter(Boolean);
//     const results: string[] = [];

//     for (const line of lines) {
//       // Skip addresses
//       if (/\b\d{6}\b/.test(line)) continue;
//       if (/\b(no\.|dist|apmc|india|pin|block|sector|plot|road)\b/i.test(line))
//         continue;

//       // Must contain weight or spec patterns
//       const hasWeight = /\bweight\b/i.test(line);
//       const hasKg = /\b\d+\s*kg\b/i.test(line);
//       const hasMt =
//         /\b\d+\s*\.?\s*m\.?t\b/i.test(line) || /\b\d+\s*MT\b/i.test(line);
//       const hasTon = /\b\d+\s*(tn|ton|tons)\b/i.test(line);

//       if (!hasWeight && !hasKg && !hasMt && !hasTon) continue;

//       let segment = line;

//       // If the lane is mixed in, cut from where specs start
//       const specStartMatch = segment.match(
//         /\bweight\b|\b\d+\s*(?:kg|mt|tn|ton)/i,
//       );
//       if (
//         specStartMatch &&
//         specStartMatch.index !== undefined &&
//         specStartMatch.index > 5
//       ) {
//         const beforeSpec = segment.slice(0, specStartMatch.index);
//         if (/\bto\b/i.test(beforeSpec)) {
//           segment = segment.slice(specStartMatch.index);
//         }
//       }

//       // Cut off trailing route names
//       const routeMatch = segment.match(
//         /\s+(?:to|from)\s+|\s+empty\s*[,;]?\s*back\b|\s+loaded\s*back\b/i,
//       );
//       if (routeMatch && routeMatch.index !== undefined) {
//         segment = segment.slice(0, routeMatch.index);
//       }

//       // Extract only weight-related tokens
//       const tokens = segment.trim().split(/\s+/);
//       const specTokens: string[] = [];
//       let foundWeight = false;

//       for (const tok of tokens) {
//         const upper = tok.toUpperCase().replace(/[^A-Z+.]/g, '');

//         if (/\bweight\b/i.test(tok) || /\bwt\b/i.test(tok)) {
//           foundWeight = true;
//           specTokens.push('weight');
//           continue;
//         }

//         // Route words — stop
//         if (/\b(to|from|back|empty|loaded)\b/i.test(tok)) break;

//         if (foundWeight || /\d/.test(tok)) {
//           // Skip container dimensions like "10'n", "40'", "20X39" — not weight
//           if (/\d+\s*[xX]\s*\d+/.test(tok) || /\d+'/.test(tok)) continue;
//           if (/\d/.test(tok)) {
//             specTokens.push(tok);
//           } else if (['KG', 'MT', 'TN', 'TON', 'TONS', '+C'].includes(upper)) {
//             specTokens.push(upper);
//           }
//         }
//       }

//       // If no "weight" keyword but has kg/mt, build from there
//       if (specTokens.length === 0) {
//         for (const tok of tokens) {
//           if (/\d/.test(tok) || /\b(kg|mt|tn|ton)\b/i.test(tok)) {
//             specTokens.push(tok);
//           }
//         }
//       }

//       const specStr = this.cleanSpecText(specTokens.join(' '));
//       if (specStr.length >= 3) {
//         results.push(specStr.slice(0, 120));
//       }
//     }

//     const unique = [...new Set(results)];
//     return unique.join(' | ').slice(0, 300);
//   }

//   // ─── Helper: Jaccard similarity between two sets of tokens ───
//   jaccard(a: Set<string>, b: Set<string>): number {
//     if (!a.size || !b.size) return 0;
//     let inter = 0;
//     for (const x of a) if (b.has(x)) inter++;
//     return inter / (a.size + b.size - inter);
//   }

//   // ─── MAIN: Is this message a rate inquiry? ───
//   parseInquiry(body: string): ParsedInquiry | null {
//     if (body.length < 5 || (body.includes('omitted') && body.length < 60)) {
//       return null;
//     }

//     if (QUOTED_RATE_IN_BODY_RE.test(body)) return null;

//     const implicit = IMPLICIT_LANE_ASK_RE.test(body);
//     const asked =
//       ASK_RE.test(body) ||
//       (this.customAskRe && this.customAskRe.test(body)) ||
//       implicit;

//     const hasLane = LANE_RE.test(body) || implicit;
//     const hasSpec = SPEC_RE.test(body);

//     // ─── Strict mode: rate keyword + lane + spec ───
//     if (asked && hasLane && hasSpec) {
//       return {
//         lane: this.laneOf(body),
//         spec: this.specOf(body),
//         weights: this.weightsOf(body),
//         tokens: this.tokensOf(body),
//         vehicleType: this.vehicleTypeOf(body),
//       };
//     }

//     // ─── Lenient mode: just has a lane ("to") and is long enough ───
//     if (hasLane && body.length >= 8) {
//       return {
//         lane: this.laneOf(body),
//         spec: this.specOf(body),
//         weights: this.weightsOf(body),
//         tokens: this.tokensOf(body),
//         vehicleType: this.vehicleTypeOf(body),
//       };
//     }

//     return null;
//   }

//   // ─── MAIN: Is this message a rate reply? ───
//   parseRateReply(body: string): ParsedRateReply | null {
//     const cleaned = body.replace(PHONE_RE, ' ').replace(VEHICLE_RE, ' ');
//     const wts = this.weightsOf(body);

//     const rates: string[] = [];
//     const re = new RegExp(AMOUNT_RE.source, 'g');
//     let m;
//     while ((m = re.exec(cleaned)) !== null) {
//       const a = m[1];
//       if (wts.has(a)) continue;
//       const val = parseInt(a);
//       if (val >= MIN_RATE && val <= MAX_RATE && !rates.includes(a)) {
//         rates.push(a);
//       }
//     }

//     if (!rates.length) return null;

//     const isShortReply = body.trim().length <= 10;
//     if (!isShortReply && !RATE_KEYWORD_RE.test(cleaned)) return null;

//     return {
//       rates: rates.slice(0, 6),
//       weights: wts,
//       tokens: this.tokensOf(body),
//     };
//   }

//   // ─── MAIN: Is this a follow-up chase? ───
//   isChase(body: string): boolean {
//     if (CHASE_RE.test(body)) return true;
//     if (this.customChaseRe && this.customChaseRe.test(body)) return true;
//     return false;
//   }
// }

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassificationPhrase } from '../entities/classification-phrase.entity';

// ─── Regex patterns (copied from the original parser.py) ───

// Detects if someone is asking for a rate
const ASK_RE = new RegExp(
  '(IMPORT\\s*RATE|EXPORT\\s*RATE|rate\\s*(plz|please|pls)|please share rate|' +
    'plz share rate|share rate|PLZ RATE|RATE PLZ|\\brate\\b\\s*$|^\\s*rate\\b|' +
    '\\brate\\s*\\?|market rate\\s*\\?|rate chahiye|freight|' +
    'plz\\s*place|please\\s*place|pls\\s*place)',
  'im',
);

// Detects a lane (route) — must contain the word "to"
const LANE_RE = /\bto\b/i;

// // Detects container specs — size, weight, type
// const SPEC_RE = new RegExp(
//   "(\\d+\\s*x\\s*\\d+'|\\d+'\\s|\\d+\\s*ft|\\d+\\s*feet|\\bMT\\b|weight|kg|SXL|MXL|trailer|trailore|cont)",
//   'i',
// );
// Detects container specs — size, weight, type
// const SPEC_RE = new RegExp(
//   "(\\d+\\s*[xX]\\s*\\d+'?|\\d+'(?=\\s|$)|\\d+\\s*(?:ft|feet)\\b|\\bMT\\b|weight|kg|SXL|MXL|trailer|trailore|cont|drums?|gross)",
//   'i',
// );
// Detects container specs — size, weight, type
const SPEC_RE = new RegExp(
  "(\\d+\\s*[xX]\\s*\\d+'?|\\d+'(?=\\s|$)|\\d+\\s*(?:ft|feet)\\b|\\bMT\\b|weight|kg|SXL|MXL|trailer|trailore|cont|drums?|gross)",
  'i',
);

// If the message already contains "RATE: 95000", it's not an inquiry
const QUOTED_RATE_IN_BODY_RE = /RATE[\s:-]*\d{4,6}/i;

// Import/export container implies a lane + rate ask even without "to" or "rate"
const IMPLICIT_LANE_ASK_RE = /\b(import|export)\s*container\b/i;

// // Extract weight values: "weight 20300 kg"
// const WEIGHT_RE = /weight\s*([\d.,]+)\s*(kg|mt)?/gi;
// Extract weight values: "weight 20300 kg" or "gross 17960"
// const WEIGHT_RE = /(?:weight|gross)\s*([\d.,]+)\s*(kg|mt)?/gi;
const WEIGHT_RE =
  /(?:weight|gross|wt)\s*[-:=]?\s*([\d][\d.,]*)\s*(kg|mt|tn|tons?|tonnes?)?\s*(\+?\s*c)?\b/gi;

// Phone numbers (to strip them so they don't get mistaken for rates)
const PHONE_RE = /(\+91[\s-]?\d{5}[\s-]?\d{5}|\b[6-9]\d{9}\b)/g;

// Vehicle plates (to strip them so they don't get mistaken for rates)
const VEHICLE_RE = /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4}\b/g;

// Extract rate amounts: 4-6 digit numbers (₹2000 to ₹400000)
const AMOUNT_RE = /(?<![\d/])(\d{4,6})(?=\s*(?:\/-|\/|\b))/g;

// Must contain a rate keyword to be a rate reply
const RATE_KEYWORD_RE =
  /(market rate|mkt|rate[\s:.=–-]*\d|\d{4,6}\s*\/-|\d{4,6}\s*\/)/i;

// Detects "40ft-30000/-", "20'-25000/-", "1x40'-30000" style size+rate pairs
// Detects "40ft-30000/-", "20'-25000/-", "1x40'-30000" style size+rate pairs
// const SIZE_RATE_RE =
//   /(\d+\s*(?:x\s*\d+'?|'|ft\b|feet\b))\s*[-:]\s*(\d{4,6})(?=\s*(?:\/-|\/|\b))/gi;

// const SIZE_RATE_RE =
//   /(\d+\s*[xX]\s*\d+'?|\d+'\s*(?:HC|HQ|SXL|MXL|GP|OT|FR|RT|DC)?|\d+\s*(?:ft|feet)\b)\s*[-:]\s*(\d{4,6})(?=\s*(?:\/-|\/|\b))/gi;
const SIZE_RATE_RE =
  /(\d+\s*[xX]\s*\d+'?|\d+'\s*(?:HC|HQ|SXL|MXL|GP|OT|FR|RT|DC)?|\d+\s*(?:ft|feet)\b)\s*[-:]\s*(\d{4,6})(?=\s*(?:\/-|\/|\b))/gi;

// Detects follow-up nudges: "rate?", "plz", "any update", "jaldi"
const CHASE_RE = new RegExp(
  '^\\s*(rate|rates|plz rate|rate plz|rate please|please rate|reply|update|' +
    '\\?+|any update|rate\\?|plz|pls|awaiting|waiting|urgent|jaldi|bhejo rate|' +
    'rate do|rate batao|rate bata do|plz rate share|rate nahi mila)\\s*[.?!]*\\s*$',
  'i',
);

// Rate values must be in this range
const MIN_RATE = 2000;
const MAX_RATE = 400000;

// Common words to ignore when comparing messages
const STOPWORDS = new Set([
  'jnpt',
  'to',
  'and',
  'back',
  'the',
  'rate',
  'import',
  'export',
  'weight',
  'plz',
  'please',
  'empty',
  'loaded',
  'cargo',
  'share',
  'from',
  'with',
  'for',
]);

// Container type keywords for vehicleTypeOf
const CONTAINER_TYPE_KEYWORDS = new Set([
  'HC',
  'HQ',
  'SXL',
  'MXL',
  'GP',
  'OT',
  'FR',
  'RT',
  'DC',
  'CONTAINER',
  'TRAILER',
  'PALETTE',
  'PALLET',
  'OPEN',
  'CLOSED',
  'DOMESTIC',
  'IMPORT',
  'EXPORT',
  'FLATBED',
  'TIPPER',
  'TANKER',
  'OG',
  'ING',
  'FL',
  'RF',
  'DT',
  'RH', // ← Added these
]);

// ─── Result types ───

export interface ParsedInquiry {
  lane: string;
  spec: string;
  weights: Set<string>;
  tokens: Set<string>;
  vehicleType: string;
}

export interface ParsedRateReply {
  rates: string[];
  weights: Set<string>;
  tokens: Set<string>;
  // new changes done 8/9/26
  sizeRates: { size: string; rate: string }[]; // ← NEW
}

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  private customAskPhrases: string[] = [];
  private customChasePhrases: string[] = [];
  private customAskRe: RegExp | null = null;
  private customChaseRe: RegExp | null = null;

  // ─── ADD THIS HERE ───
  private static LANE_ALIASES: Record<string, string> = {
    hyd: 'HYDERABAD',
    bpl: 'BHOPAL',
    bhopal: 'BHOPAL',
    igat: 'IGATPURI',
    kop: 'KOPARGAON',
    jnp: 'JNPT',
    nsict: 'NSICT',
    gti: 'GTI',
    cfs: 'CFS',
    icd: 'ICD',
    dc: 'DC',
    gr: 'GR',
    bhiwandi: 'BHIWANDI',
    panvel: 'PANVEL',
    thane: 'THANE',
    vashi: 'VASHI',
    talegaon: 'TALEGAON',
    chakan: 'CHAKAN',
    pune: 'PUNE',
    mum: 'MUMBAI',
    bombay: 'MUMBAI',
    del: 'DELHI',
    ggn: 'GURUGRAM',
    gurgaon: 'GURUGRAM',
    faridabad: 'FARIDABAD',
    ahm: 'AHMEDABAD',
    amd: 'AHMEDABAD',
    surat: 'SURAT',
    vadodara: 'VADODARA',
    baroda: 'VADODARA',
    nagpur: 'NAGPUR',
    nashik: 'NASHIK',
    aurangabad: 'AURANGABAD',
    indore: 'INDORE',
    jaipur: 'JAIPUR',
    lucknow: 'LUCKNOW',
    kolkata: 'KOLKATA',
    calcutta: 'KOLKATA',
    chennai: 'CHENNAI',
    madras: 'CHENNAI',
    bangalore: 'BANGALORE',
    bengaluru: 'BANGALORE',
    blr: 'BANGALORE',
    hyderabad: 'HYDERABAD',
    vizag: 'VISAKHAPATNAM',
    vskp: 'VISAKHAPATNAM',
  };

  constructor(
    @InjectRepository(ClassificationPhrase)
    private phraseRepo: Repository<ClassificationPhrase>,
  ) {}

  // ─── Build a regex from user-added phrases ───
  private buildCustomRe(phrases: string[]): RegExp | null {
    const escaped = phrases
      .filter((p) => p && p.trim())
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return escaped.length
      ? new RegExp('(' + escaped.join('|') + ')', 'i')
      : null;
  }

  setCustomPhrases(asks: string[], chases: string[]) {
    this.customAskPhrases = [...asks];
    this.customChasePhrases = [...chases];
    this.customAskRe = this.buildCustomRe(asks);
    this.customChaseRe = this.buildCustomRe(chases);
  }

  async reloadCustomPhrases() {
    const rows = await this.phraseRepo.find();
    this.setCustomPhrases(
      rows.filter((r) => r.kind === 'ask').map((r) => r.phrase),
      rows.filter((r) => r.kind === 'chase').map((r) => r.phrase),
    );
  }

  // ─── Helper: normalize text (lowercase, strip punctuation) ───
  norm(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ─── Helper: extract meaningful words (tokens) from text ───
  tokensOf(s: string): Set<string> {
    return new Set(
      this.norm(s)
        .split(' ')
        .filter((w) => w.length >= 2 && !STOPWORDS.has(w)),
    );
  }

  // ─── Helper: extract weight values from text ───
  weightsOf(s: string): Set<string> {
    const out = new Set<string>();
    const re = new RegExp(WEIGHT_RE.source, 'gi');
    let m;
    while ((m = re.exec(s)) !== null) {
      const w = m[1].replace(/[^0-9.]/g, '').replace(/\.$/, '');
      if (w) out.add(w);
    }
    return out;
  }

  // // ─── Helper: extract per-size rates, e.g. "40ft-30000/-" → {size:"40ft", rate:"30000"} ───
  // sizeRatesOf(body: string): { size: string; rate: string }[] {
  //   const out: { size: string; rate: string }[] = [];
  //   const re = new RegExp(SIZE_RATE_RE.source, 'gi');
  //   let m;
  //   while ((m = re.exec(body)) !== null) {
  //     const size = m[1].replace(/\s+/g, '').toUpperCase();
  //     const rate = m[2];
  //     const val = parseInt(rate);
  //     if (val >= MIN_RATE && val <= MAX_RATE) {
  //       out.push({ size, rate });
  //     }
  //   }
  //   return out;
  // }
  // changes done 8/9/26
  // ─── Helper: extract per-size rates, e.g. "40ft-30000/-" → {size:"40ft", rate:"30000"} ───
  // sizeRatesOf(body: string): { size: string; rate: string }[] {
  //   const out: { size: string; rate: string }[] = [];
  //   const re = new RegExp(SIZE_RATE_RE.source, 'gi');
  //   let m;
  //   while ((m = re.exec(body)) !== null) {
  //     const size = m[1].replace(/\s+/g, '').toUpperCase();
  //     const rate = m[2];
  //     const val = parseInt(rate);
  //     if (val >= MIN_RATE && val <= MAX_RATE) {
  //       out.push({ size, rate });
  //     }
  //   }
  //   return out;
  // }

  sizeRatesOf(body: string): { size: string; rate: string }[] {
    const out: { size: string; rate: string }[] = [];

    const re = new RegExp(SIZE_RATE_RE.source, 'gi');

    let m;

    while ((m = re.exec(body)) !== null) {
      const size = m[1].replace(/\s+/g, '').toUpperCase();

      const rate = m[2];

      const val = parseInt(rate, 10);

      if (val >= MIN_RATE && val <= MAX_RATE) {
        out.push({
          size,
          rate,
        });
      }
    }

    return out;
  }

  // ─── Heuristic: truck/driver-details reply, not an inquiry ───
  private looksLikeTransportDetails(body: string): boolean {
    const vehicleNo = /\b[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}\b/.test(
      body.toUpperCase(),
    );
    const mobileCount = (body.match(/(\+91|0)?[6-9]\d{9}/g) || []).length;
    return vehicleNo && mobileCount >= 2;
  }

  // ─── Helper: clean up extracted text ───
  private cleanSpecText(text: string): string {
    let cleaned = text;
    // ─── FIX: Normalize spaces around 'x' (3 X 20 → 3X20) ───
    cleaned = cleaned.replace(/\s*[xX]\s*/g, 'x');
    // Fix "25.mt" → "25MT", "25.kg" → "25KG"
    cleaned = cleaned.replace(
      /(\d+)\.(mt|kg|tn)/gi,
      (_, d, u) => d + u.toUpperCase(),
    );
    // Fix "25 mt" → "25MT", "25 kg" → "25KG"
    cleaned = cleaned.replace(
      /(\d+)\s+(mt|kg|tn)\b/gi,
      (_, d, u) => d + u.toUpperCase(),
    );
    // Capitalize standalone units
    cleaned = cleaned.replace(/\bmt\b/gi, 'MT');
    cleaned = cleaned.replace(/\bkg\b/gi, 'KG');
    cleaned = cleaned.replace(/\btn\b/gi, 'TN');
    cleaned = cleaned.replace(/\bton\b/gi, 'TON');
    // Remove "Cargo"
    cleaned = cleaned.replace(/\bCargo\b/gi, '');
    // Remove duplicate "weight" keywords
    cleaned = cleaned.replace(/\bweight\b.*\bweight\b/i, 'weight');
    // Clean up spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Remove trailing/leading punctuation
    cleaned = cleaned.replace(/[,;\s]+$/, '').trim();
    cleaned = cleaned.replace(/^[,;\s]+/, '').trim();
    return cleaned;
  }

  // // ─── Helper: extract lane (first line, cut before specs) ───
  // laneOf(body: string): string {
  //   const lines = body
  //     .trim()
  //     .split('\n')
  //     .map((l) => l.trim())
  //     .filter(Boolean);

  //   // Find the first line that contains "to" (the actual lane)
  //   let firstLine = '';
  //   for (const line of lines) {
  //     if (/\bto\b/i.test(line)) {
  //       firstLine = line;
  //       break;
  //     }
  //   }
  //   // Fallback to first line if no "to" found
  //   if (!firstLine) firstLine = lines[0] || '';

  //   firstLine = firstLine.replace(/\s+/g, ' ');

  //   // Strip phone numbers and vehicle plates
  //   firstLine = firstLine.replace(
  //     /\+91[\s-]?\d{5}[\s-]?\d{5}|\b[6-9]\d{9}\b/g,
  //     ' ',
  //   );
  //   firstLine = firstLine.replace(
  //     /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4}\b/g,
  //     ' ',
  //   );
  //   firstLine = firstLine.replace(/\bMOBILE\s*NO\b/gi, ' ');
  //   firstLine = firstLine.replace(/\bCHA\b/gi, ' ');
  //   firstLine = firstLine.replace(/\s+/g, ' ').trim();

  //   // Cut before any spec pattern including container sizes like "40'" and "1X20'"
  //   const specStart = firstLine.search(
  //     /\s\d+\s*[xX]\s*\d+'?|\s\d+'|\s\d+\s*(?:tn|ton|kg|ft|MT|HC|HQ|wheel)|\sweight\b|\scontainer\b/i,
  //   );
  //   if (specStart > 10) {
  //     firstLine = firstLine.slice(0, specStart).trim();
  //   }

  //   // Remove "and empty back" and similar trailing phrases
  //   firstLine = firstLine.replace(/\sand\s+empty\s+back.*$/i, '');
  //   firstLine = firstLine.replace(/\sand\s+loaded\s+back.*$/i, '');

  //   return firstLine.slice(0, 120);
  // }

  // laneOf(body: string): string {
  //   const lines = body
  //     .trim()
  //     .split(/\r?\n/)
  //     .map((l) => l.trim())
  //     .filter(Boolean);

  //   if (!lines.length) return '';

  //   let lane = '';

  //   // Case 1:
  //   // Bhiwandi 421302
  //   // TO
  //   // Shamshabad, Hyderabad, Telangana, 501359
  //   for (let i = 0; i < lines.length; i++) {
  //     if (/^to$/i.test(lines[i])) {
  //       const from = lines[i - 1] || '';
  //       const to = lines[i + 1] || '';

  //       if (from && to) {
  //         lane = `${from} TO ${to}`;
  //         break;
  //       }
  //     }
  //   }

  //   // Case 2:
  //   // Bhiwandi 421302 TO Shamshabad, Hyderabad, Telangana, 501359
  //   //
  //   // or:
  //   // jnpt to AESSEAL Compound, Gat No.85 ...
  //   if (!lane) {
  //     const toIndex = lines.findIndex(
  //       (line) => /\bto\b/i.test(line) && !/^to$/i.test(line),
  //     );

  //     if (toIndex !== -1) {
  //       lane = lines[toIndex];

  //       // If the lane is continued on the next line,
  //       // append only lines before the first obvious specification.
  //       for (let i = toIndex + 1; i < lines.length; i++) {
  //         if (
  //           /^(wt|weight|packing|pallet|vehicle|cargo|temp|temperature|rate|rates|export|import)\b/i.test(
  //             lines[i],
  //           )
  //         ) {
  //           break;
  //         }

  //         lane += ` ${lines[i]}`;
  //       }
  //     }
  //   }

  //   // Fallback
  //   if (!lane) {
  //     lane = lines[0];
  //   }

  //   lane = lane.replace(/\s+/g, ' ').trim();

  //   // Remove phone numbers
  //   lane = lane.replace(/\+91[\s-]?\d{5}[\s-]?\d{5}|\b[6-9]\d{9}\b/g, ' ');

  //   // Remove vehicle numbers
  //   lane = lane.replace(/\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4}\b/gi, ' ');

  //   lane = lane.replace(/\bMOBILE\s*NO\b/gi, ' ');
  //   lane = lane.replace(/\bCHA\b/gi, ' ');

  //   lane = lane.replace(/\s+/g, ' ').trim();

  //   // Remove trailing specification text
  //   const specStart = lane.search(
  //     /\s(?:wt|weight|packing|pallet|vehicle|cargo|temp|temperature|rate|rates|export|import)\b/i,
  //   );

  //   if (specStart > 10) {
  //     lane = lane.slice(0, specStart).trim();
  //   }

  //   // Remove return/loading-back phrases
  //   lane = lane.replace(/\sand\s+empty\s+back.*$/i, '');
  //   lane = lane.replace(/\sand\s+loaded\s+back.*$/i, '');

  //   return lane.slice(0, 120);
  // }

  // ─── Detect & parse a multi-lane rate table (e.g. "Bhiwandi  Wagholi, Pune  6 MT") ───
  isLaneTable(body: string): boolean {
    return this.parseLaneTable(body).length >= 3;
  }

  parseLaneTable(
    body: string,
  ): { lane: string; spec: string; rate?: string }[] {
    const out: { lane: string; spec: string; rate?: string }[] = [];
    for (const line of body.split(/\r?\n/)) {
      // Columns separated by 2+ spaces: FROM   TO   WEIGHT UNIT   [rate..N]
      const m = line.match(
        /^\s*([A-Za-z][A-Za-z .&/-]{1,30}?)\s{2,}([A-Za-z][A-Za-z .,&()/-]{1,40}?)\s{2,}(\d+(?:\.\d+)?)\s*(MT|KG|TN|TONS?)\s*(?:rate[.\s:=-]*(\d{4,6}))?\s*$/i,
      );
      if (m) {
        const [, from, to, wt, unit, rate] = m;
        out.push({
          lane: this.standardizeLane(`${from} TO ${to}`),
          spec: `${wt}${unit.toUpperCase()}`,
          ...(rate ? { rate } : {}),
        });
      }
    }
    return out;
  }

  // ─── Helper: extract lane (first line, cut before specs) ───
  laneOf(body: string): string {
    const lines = body
      .trim()
      .split(/\r?\n/)
      // .map((l) => l.trim())
      //fixes done for address from to 10/09/2026
      .map((l) => l.replace(/[*_~`]/g, '').trim()) // Remove markdown
      .map((l) =>
        l.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '').trim(),
      ) // Remove emojis
      .filter(Boolean);

    if (!lines.length) return '';

    let lane = '';

    // Case 1: "FROM" \n "TO" \n "DESTINATION"
    // Case 1: "FROM" \n "TO" \n "DESTINATION"
    for (let i = 0; i < lines.length; i++) {
      if (/^to$/i.test(lines[i])) {
        const from = (lines[i - 1] || '')
          .replace(/^from\s*[-:]\s*/i, '')
          .trim();
        const to = (lines[i + 1] || '').replace(/^to\s*[-:]\s*/i, '').trim();
        if (from && to) {
          lane = `${from} TO ${to}`;
          break;
        }
      } else if (/^to\s*[-:]\s*(.+)$/i.test(lines[i])) {
        // Handles "To - 628905 628905"
        const match = lines[i].match(/^to\s*[-:]\s*(.+)$/i);
        const to = match ? match[1].trim() : '';
        const from = (lines[i - 1] || '')
          .replace(/^from\s*[-:]\s*/i, '')
          .trim();
        if (from && to) {
          lane = `${from} TO ${to}`;
          break;
        }
      }
    }

    // Case 2: "FROM TO DESTINATION" on same line (or spanning multiple lines)
    if (!lane) {
      const toIndex = lines.findIndex(
        (line) => /\bto\b/i.test(line) && !/^to$/i.test(line),
      );

      if (toIndex !== -1) {
        lane = lines[toIndex];

        for (let i = toIndex + 1; i < lines.length; i++) {
          if (
            /^(wt|weight|packing|pallet|vehicle|cargo|temp|temperature|rate|rates|export|import)\b/i.test(
              lines[i],
            )
          ) {
            break;
          }
          lane += ` ${lines[i]}`;
        }
      }
    }

    if (!lane) {
      lane = lines[0];
    }

    lane = lane.replace(/\s+/g, ' ').trim();

    // Remove phone numbers
    lane = lane.replace(/\+91[\s-]?\d{5}[\s-]?\d{5}|\b[6-9]\d{9}\b/g, ' ');
    // Remove vehicle numbers
    lane = lane.replace(/\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4}\b/gi, ' ');
    lane = lane.replace(/\bMOBILE\s*NO\b/gi, ' ');
    lane = lane.replace(/\bCHA\b/gi, ' ');
    lane = lane.replace(/\s+/g, ' ').trim();

    // ─── FIX: Cut before specs, vehicle counts, container sizes, and dimensions ───
    const specStart = lane.search(
      /\s(?:wt|weight|packing|pallets?|vehicles?|cargo|temp|temperature|rate|rates|export|import)\b|\s\d+\s*[xX]\s*\d+|\s\d+'|\s\d+\s*(?:tn|ton|kg|ft|MT|HC|HQ)|\sgross\b/i,
    );

    if (specStart > 10) {
      lane = lane.slice(0, specStart).trim();
    }

    // Remove return/loading-back phrases
    lane = lane.replace(/\sand\s+empty\s+back.*$/i, '');
    lane = lane.replace(/\sand\s+loaded\s+back.*$/i, '');

    // ─── FIX: Clean up trailing dots and commas ───
    lane = lane.replace(/[.,;]+$/, '').trim();

    // ─── Keep long destinations readable: first segment + pincode ───
    // ─── Keep long addresses readable — but NEVER drop the destination ───
    const pinOf = (s: string) => {
      // handles both "410501" and spaced "502 319"
      const m = s.match(/\b(\d{3}\s?\d{3})\b/);
      return m ? m[1].replace(/\s+/g, '') : '';
    };
    const shorten = (part: string): string => {
      if (part.length <= 40) return part;
      const pin = pinOf(part);
      const base = part.split(/[;,]/)[0].slice(0, 34).trim();
      return pin ? `${base} (${pin})` : base;
    };
    const toMatch = lane.match(/\s+to\s+/i);
    if (toMatch && toMatch.index !== undefined) {
      const fromPart = lane.slice(0, toMatch.index).trim();
      const toPart = lane.slice(toMatch.index + toMatch[0].length).trim();
      lane = `${shorten(fromPart)} TO ${shorten(toPart)}`;
    } else if (lane.length > 40) {
      lane = shorten(lane);
    }

    // ─── ADD THIS LINE: Standardize before returning ───
    lane = this.standardizeLane(lane);

    return lane.slice(0, 120);
  }

  // ─── Standardize lane text to neat format ───
  standardizeLane(lane: string): string {
    if (!lane) return '';

    let cleaned = lane.trim();

    // 1. Replace abbreviations (word-boundary match, case-insensitive)
    for (const [abbr, full] of Object.entries(ParserService.LANE_ALIASES)) {
      const re = new RegExp(
        `\\b${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'gi',
      );
      cleaned = cleaned.replace(re, full);
    }

    // 2. Uppercase route keywords
    cleaned = cleaned.replace(/\bto\b/gi, 'TO');
    cleaned = cleaned.replace(/\bfrom\b/gi, 'FROM');
    cleaned = cleaned.replace(/\band\b/gi, 'AND');
    cleaned = cleaned.replace(/\bvia\b/gi, 'VIA');

    // 3. Uppercase everything
    cleaned = cleaned.toUpperCase();

    // 4. Fix spacing
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // 5. Remove trailing commas, hyphens
    cleaned = cleaned.replace(/[,;-]+$/, '').trim();

    return cleaned.slice(0, 120);
  }

  // ─── Helper: extract vehicle type (container size + type, NO weight) ───
  vehicleTypeOf(body: string): string {
    if (!body) return '';

    const lines = body
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const results: string[] = [];

    for (const line of lines) {
      // Skip addresses and pincodes
      if (/\b\d{6}\b/.test(line)) continue;
      if (/\b(no\.|dist|apmc|india|pin|block|sector|plot|road)\b/i.test(line))
        continue;

      // Must contain a container size pattern (e.g., "1X20'", "40'")
      // const sizeMatch = line.match(
      //   /(\d+\s*[xX]\s*\d+'?|\d+'\s*(?:HC|HQ|SXL|MXL|GP|OT|FR|RT|DC)?)/i,
      // );
      const sizeMatch = line.match(
        /(\d+\s*[xX]\s*\d+'?|\d+\s*[xX]\s*[A-Za-z]+|\d+'\s*(?:HC|HQ|SXL|MXL|GP|OT|FR|RT|DC)?|\d+\s*(?:ft|feet)\b)/i,
      );
      if (!sizeMatch) continue;

      let segment = line;

      // If the lane is mixed in (contains " to " before the spec), cut from spec start
      // Also match \d+' patterns (like "40'")
      const specStartMatch = segment.match(
        /\b\d+\s*[xX]\s*\d+|\b\d+'|\b\d+\s*(?:tn|ton|kg|ft|MT|HC|HQ)|\bweight\b|\bcontainer\b/i,
      );
      if (
        specStartMatch &&
        specStartMatch.index !== undefined &&
        specStartMatch.index > 5
      ) {
        const beforeSpec = segment.slice(0, specStartMatch.index);
        if (/\bto\b/i.test(beforeSpec)) {
          segment = segment.slice(specStartMatch.index);
        }
      }

      // Cut off trailing route names (e.g., "40' HC to JNPT")
      const routeMatch = segment.match(
        /\s+(?:to|from)\s+|\s+empty\s*[,;]?\s*back\b|\s+loaded\s*back\b/i,
      );
      if (routeMatch && routeMatch.index !== undefined) {
        segment = segment.slice(0, routeMatch.index);
      }

      // Extract container size + type tokens (SKIP weight-related tokens, DON'T break)
      // ─── FIX: Group "1 x Trailer" and "1 X 20" into single tokens ───
      const tokens =
        segment
          .trim()
          .match(
            /\d+\s*[xX]\s*\d+'?(?:\s*[xX]\s*\d+'?)*|\d+\s*[xX]\s*[A-Za-z]+|\d+'(?:\s*[xX]\s*\d+'?)*|\b[A-Za-z]{2,}\b|\d+|\S+/g,
          ) || [];

      const typeTokens: string[] = [];
      let skipNextNumber = false;

      for (const tok of tokens) {
        const upper = tok.toUpperCase().replace(/[^A-Z+\']/g, '');
        // const hasSize = /\d+\s*[xX]\s*\d+'?|\d+'/.test(tok);
        // ─── FIX: Added \d+\s*[xX]\s*[A-Za-z] to match "1 x Trailer" ───
        const hasSize =
          /\d+\s*[xX]\s*\d+'?|\d+\s*[xX]\s*[A-Za-z]+|\d+'|\d+\s*(?:ft|feet)\b/i.test(
            tok,
          );

        const hasDigit = /\d/.test(tok);

        // Route words — stop
        if (/\b(to|from|back|empty|loaded)\b/i.test(tok)) break;

        // Skip "plz", "place", "please"
        if (/\b(plz|place|please|pls)\b/i.test(tok)) continue;

        // Weight keywords (weight, wt, cargo) — skip but DON'T break, continue collecting
        if (upper === 'WEIGHT' || upper === 'WT' || upper === 'CARGO') {
          skipNextNumber = true;
          continue;
        }

        // Unit keywords (kg, mt, tn, ton) — skip
        if (
          upper === 'KG' ||
          upper === 'MT' ||
          upper === 'TN' ||
          upper === 'TON' ||
          upper === 'TONS'
        ) {
          skipNextNumber = false;
          continue;
        }

        // Container sizes (1X20', 40', etc.)
        if (hasSize) {
          typeTokens.push(tok);
          skipNextNumber = false;
          continue;
        }

        // Container type keywords (HC, HQ, Domestic, Container, etc.)
        if (CONTAINER_TYPE_KEYWORDS.has(upper)) {
          typeTokens.push(tok);
          skipNextNumber = false;
          continue;
        }

        // A number after "weight" — this is a weight value, skip it
        if (hasDigit && skipNextNumber) {
          skipNextNumber = false;
          continue;
        }

        // Other numbers that are NOT sizes — skip if 5+ digits (likely weight)
        if (hasDigit && !hasSize) {
          const digitsOnly = tok.replace(/[^0-9]/g, '');
          if (digitsOnly.length >= 5) continue;
          if (!tok.includes("'") && digitsOnly.length <= 4) continue;
        }
      }

      const typeStr = this.cleanSpecText(typeTokens.join(' '));
      if (typeStr.length >= 3) {
        results.push(typeStr.slice(0, 120));
      }
    }

    const unique = [...new Set(results)];
    return unique.join(' | ').slice(0, 300);
  }

  // ─── Helper: extract spec (weight, dimensions) ───
  specOf(body: string): string {
    if (!body) return '';

    const lines = body
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const results: string[] = [];

    for (const line of lines) {
      if (/\b\d{6}\b/.test(line)) continue;
      if (/\b(no\.|dist|apmc|india|pin|block|sector|plot|road)\b/i.test(line))
        continue;

      const hasWeight = /\bweight\b/i.test(line);
      const hasKg = /\b\d+\s*kg\b/i.test(line);
      const hasMt =
        /\b\d+\s*\.?\s*m\.?t\b/i.test(line) || /\b\d+\s*MT\b/i.test(line);
      const hasTon = /\b\d+\s*(tn|ton|tons)\b/i.test(line);

      if (!hasWeight && !hasKg && !hasMt && !hasTon) continue;

      let segment = line;

      // ─── FIX: Replace "weight-25" with "weight 25" so it splits properly ───
      segment = segment.replace(/weight\s*-\s*/gi, 'weight ');
      segment = segment.replace(/wt\s*-\s*/gi, 'wt ');

      const specStartMatch = segment.match(
        /\bweight\b|\b\d+\s*(?:kg|mt|tn|ton)/i,
      );
      if (
        specStartMatch &&
        specStartMatch.index !== undefined &&
        specStartMatch.index > 5
      ) {
        const beforeSpec = segment.slice(0, specStartMatch.index);
        if (/\bto\b/i.test(beforeSpec)) {
          segment = segment.slice(specStartMatch.index);
        }
      }

      const routeMatch = segment.match(
        /\s+(?:to|from)\s+|\s+empty\s*[,;]?\s*back\b|\s+loaded\s+back\b/i,
      );
      if (routeMatch && routeMatch.index !== undefined) {
        segment = segment.slice(0, routeMatch.index);
      }

      const tokens = segment.trim().split(/\s+/);
      const specTokens: string[] = [];
      let foundWeight = false;

      for (const tok of tokens) {
        const upper = tok.toUpperCase().replace(/[^A-Z+.]/g, '');

        if (/\bweight\b/i.test(tok) || /\bwt\b/i.test(tok)) {
          foundWeight = true;
          specTokens.push('weight');
          continue;
        }

        if (/\b(to|from|back|empty|loaded)\b/i.test(tok)) break;
        if (/\b(plz|place|please|pls)\b/i.test(tok)) continue;

        if (foundWeight || /\d/.test(tok)) {
          // Skip container dimensions
          if (/\d+\s*[xX]\s*\d+/.test(tok) || /\d+'/.test(tok)) continue;

          // ─── FIX: Skip "x" token ───
          if (/^[xX]$/.test(tok)) continue;

          // ─── FIX: Skip pure numbers if we haven't found "weight" yet and there IS a weight keyword ───
          if (hasWeight && !foundWeight && /^\d+$/.test(tok)) continue;

          if (/^\+?\d{10,}$/.test(tok.replace(/[\s-]/g, ''))) continue;
          if (tok.startsWith('+91')) continue;

          if (/\d/.test(tok)) {
            specTokens.push(tok);
          } else if (['KG', 'MT', 'TN', 'TON', 'TONS', '+C'].includes(upper)) {
            specTokens.push(upper);
          }
        }
      }

      if (specTokens.length === 0) {
        for (const tok of tokens) {
          if (/\d/.test(tok) || /\b(kg|mt|tn|ton)\b/i.test(tok)) {
            specTokens.push(tok);
          }
        }
      }

      const specStr = this.cleanSpecText(specTokens.join(' '));
      if (specStr.length >= 3) {
        results.push(specStr.slice(0, 120));
      }
    }

    const unique = [...new Set(results)];
    return unique.join(' | ').slice(0, 300);
  }

  // ─── Helper: Jaccard similarity between two sets of tokens ───
  jaccard(a: Set<string>, b: Set<string>): number {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    return inter / (a.size + b.size - inter);
  }

  // ─── MAIN: Is this message a rate inquiry? ───
  parseInquiry(body: string): ParsedInquiry | null {
    if (body.length < 5 || (body.includes('omitted') && body.length < 60)) {
      return null;
    }

    // ─── NEW: reject truck/driver-details replies ───
    if (this.looksLikeTransportDetails(body)) return null;

    // if (QUOTED_RATE_IN_BODY_RE.test(body)) return null;

    const implicit = IMPLICIT_LANE_ASK_RE.test(body);
    const asked =
      ASK_RE.test(body) ||
      (this.customAskRe && this.customAskRe.test(body)) ||
      implicit;

    const hasLane = LANE_RE.test(body) || implicit;
    const hasSpec = SPEC_RE.test(body);

    // ─── Strict mode: rate keyword + lane + spec ───
    if (asked && hasLane && hasSpec) {
      return {
        lane: this.laneOf(body),
        spec: this.specOf(body),
        weights: this.weightsOf(body),
        tokens: this.tokensOf(body),
        vehicleType: this.vehicleTypeOf(body),
      };
    }

    // ─── Lenient mode: just has a lane ("to") and is long enough ───
    if (hasLane && body.length >= 8) {
      return {
        lane: this.laneOf(body),
        spec: this.specOf(body),
        weights: this.weightsOf(body),
        tokens: this.tokensOf(body),
        vehicleType: this.vehicleTypeOf(body),
      };
    }

    return null;
  }

  // ─── MAIN: Is this message a rate reply? ───
  // parseRateReply(body: string): ParsedRateReply | null {
  //   const cleaned = body.replace(PHONE_RE, ' ').replace(VEHICLE_RE, ' ');
  //   const wts = this.weightsOf(body);

  //   const rates: string[] = [];
  //   const re = new RegExp(AMOUNT_RE.source, 'g');
  //   let m;
  //   while ((m = re.exec(cleaned)) !== null) {
  //     const a = m[1];
  //     if (wts.has(a)) continue;
  //     const val = parseInt(a);
  //     if (val >= MIN_RATE && val <= MAX_RATE && !rates.includes(a)) {
  //       rates.push(a);
  //     }
  //   }

  //   if (!rates.length) return null;

  //   const isShortReply = body.trim().length <= 10;
  //   if (!isShortReply && !RATE_KEYWORD_RE.test(cleaned)) return null;

  //   return {
  //     rates: rates.slice(0, 6),
  //     weights: wts,
  //     tokens: this.tokensOf(body),
  //   };
  // }
  // changes done 8/9/26
  // parseRateReply(body: string): ParsedRateReply | null {
  //   const cleaned = body.replace(PHONE_RE, ' ').replace(VEHICLE_RE, ' ');
  //   const wts = this.weightsOf(body);
  //   const sizeRates = this.sizeRatesOf(body); // ← NEW

  //   const rates: string[] = [];
  //   const re = new RegExp(AMOUNT_RE.source, 'g');
  //   let m;
  //   while ((m = re.exec(cleaned)) !== null) {
  //     const a = m[1];
  //     if (wts.has(a)) continue;
  //     const val = parseInt(a);
  //     if (val >= MIN_RATE && val <= MAX_RATE && !rates.includes(a)) {
  //       rates.push(a);
  //     }
  //   }

  //   if (!rates.length) return null;

  //   const isShortReply = body.trim().length <= 10;
  //   if (!isShortReply && !RATE_KEYWORD_RE.test(cleaned)) return null;

  //   return {
  //     rates: rates.slice(0, 6),
  //     weights: wts,
  //     tokens: this.tokensOf(body),
  //     sizeRates, // ← NEW
  //   };
  // }

  parseRateReply(body: string): ParsedRateReply | null {
    // ─── FIX: Only reject "Market Rate" messages that are rate CARDS ───
    // (they contain a lane + spec). A short rate reply like
    // "MARKET RATE 115000/-" or "Market Rate-75000/-" is still a valid rate.
    if (/^\s*market\s*rate\b/i.test(body.trim())) {
      if (LANE_RE.test(body) && SPEC_RE.test(body)) {
        return null; // It's a rate card → reject
      }
      // No lane + spec → it's a rate reply → continue processing
    }

    const cleaned = body.replace(PHONE_RE, ' ').replace(VEHICLE_RE, ' ');

    const wts = this.weightsOf(body);

    // Extract size-specific rates
    const sizeRates = this.sizeRatesOf(body);

    const rates: string[] = [];

    const re = new RegExp(AMOUNT_RE.source, 'g');

    let m;

    while ((m = re.exec(cleaned)) !== null) {
      const a = m[1];

      // Don't treat weight as a rate
      if (wts.has(a)) continue;

      const val = parseInt(a, 10);

      if (val >= MIN_RATE && val <= MAX_RATE && !rates.includes(a)) {
        rates.push(a);
      }
    }

    // A size-specific rate is also a valid rate reply
    if (!rates.length && !sizeRates.length) {
      return null;
    }

    const isShortReply = body.trim().length <= 10;

    if (!isShortReply && !RATE_KEYWORD_RE.test(cleaned) && !sizeRates.length) {
      return null;
    }

    // ─── FIX: If the message also contains a lane + spec, it's an inquiry with an offered rate, NOT a rate reply ───
    if (LANE_RE.test(body) && SPEC_RE.test(body)) {
      return null;
    }

    return {
      rates: rates.slice(0, 6),
      weights: wts,
      tokens: this.tokensOf(body),
      sizeRates,
    };
  }

  // ─── MAIN: Is this a follow-up chase? ───
  isChase(body: string): boolean {
    if (CHASE_RE.test(body)) return true;
    if (this.customChaseRe && this.customChaseRe.test(body)) return true;
    return false;
  }
}
