import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, Not } from 'typeorm';
import { createHash } from 'crypto';
import { ChatMessage } from '../entities/message.entity';
import { MatcherService } from '../matcher/matcher.service';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    @InjectRepository(ChatMessage) private messageRepo: Repository<ChatMessage>,
    private matcher: MatcherService,
    private config: AppConfigService,
  ) {}

  // ─── Generate a unique ID from message content (for idempotency) ───
  // If WhatsApp doesn't give us a message ID, we create one from the content
  // so we never store the same message twice.
  contentHash(group: string, sender: string, ts: string, body: string): string {
    return createHash('sha1')
      .update(`${group}|${sender}|${ts}|${body}`)
      .digest('hex');
  }

  // ─── MAIN: Store a message and classify it ───
  // Called by all webhook handlers and the chat importer.
  // Returns null if the message was already ingested (idempotent).
  async ingestMessage(params: {
    groupKey: string;
    senderKey: string;
    senderName?: string;
    body: string;
    postedAt: Date;
    waMessageId?: string;
    source?: string;
    quotedWaId?: string;
    quotedText?: string;
  }): Promise<ChatMessage | null> {
    // Ignore messages from unknown groups
    if (!this.config.isKnownGroup(params.groupKey)) {
      this.logger.debug(`ignoring message from unknown group ${params.groupKey}`);
      return null;
    }

    // Generate or use the message ID
    const mid =
      params.waMessageId ||
      this.contentHash(
        params.groupKey,
        params.senderKey,
        params.postedAt.toISOString(),
        params.body,
      );

    // Check if already exists (idempotent — never store the same message twice)
    const existing = await this.messageRepo.findOne({
      where: { waMessageId: mid },
    });
    if (existing) return null;

        // Save the message
    const msg = new ChatMessage();
    msg.waMessageId = mid;
    msg.groupKey = params.groupKey;
    msg.senderKey = params.senderKey;
    msg.senderName = params.senderName || null;
    msg.body = params.body;
    msg.postedAt = params.postedAt;
    msg.source = params.source || 'webhook';
    msg.quotedWaId = params.quotedWaId || null;
    msg.quotedText = params.quotedText || null;

    await this.messageRepo.save(msg);


    // Classify it using the matcher engine
    const classification = await this.matcher.routeMessage(msg);
    msg.classification = classification;
    await this.messageRepo.save(msg);

    return msg;
  }

  // ─── Parse Meta WhatsApp Cloud API webhook payload ───
  // Meta sends: { entry: [{ changes: [{ value: { messages: [...] } }] }] }
  parseMetaPayload(payload: any): any[] {
    const out: any[] = [];
    for (const entry of payload?.entry || []) {
      for (const change of entry?.changes || []) {
        const value = change?.value || {};

        // Build a phone → name lookup from contacts array
        const contacts: Record<string, string> = {};
        for (const c of value?.contacts || []) {
          contacts[c.wa_id] = c?.profile?.name;
        }

        for (const m of value?.messages || []) {
          if (m.type !== 'text') continue; // only handle text messages

          // Convert Unix timestamp to Date
          const ts = new Date(parseInt(m.timestamp || '0') * 1000);

          out.push({
            groupKey:
              m.group_id ||
              value?.metadata?.display_phone_number ||
              'unknown',
            senderKey: m.from || '',
            senderName: contacts[m.from] || null,
            body: m?.text?.body || '',
            postedAt: ts,
            waMessageId: m.id,
          });
        }
      }
    }
    return out;
  }

  // ─── Parse DoubleTick webhook payload ───
  // DoubleTick sends one message per call with a simpler structure.
  parseDoubletickPayload(payload: any): any[] {
    const m = payload?.message || payload;
    const body = m?.text || m?.content?.text || m?.body || '';
    if (!body) return [];

    // Parse timestamp (DoubleTick uses ISO strings)
    let ts = new Date();
    const raw = m?.timestamp || m?.createdAt;
    if (raw) {
      try {
        ts = new Date(
          typeof raw === 'string' ? raw.replace('Z', '+00:00') : raw,
        );
      } catch {
        // keep default
      }
    }

    return [
      {
        groupKey: String(m?.chatId || m?.groupId || 'unknown'),
        senderKey: String(m?.from || m?.senderPhone || ''),
        senderName: m?.senderName || m?.pushName || null,
        body,
        postedAt: ts,
        waMessageId: m?.id || m?.messageId,
      },
    ];
  }

  // ─── Message types to skip (Evolution API sends many non-chat events) ───
  private SKIP_TYPES = new Set([
    'secretEncryptedMessage',
    'protocolMessage',
    'senderKeyDistributionMessage',
    'reactionMessage',
    'pollUpdateMessage',
    'messageContextInfo',
  ]);

  // ─── Extract text from an Evolution API message object ───
  // WhatsApp messages can have text in different fields depending on type.
  private evolutionText(message: any): string {
    if (!message || typeof message !== 'object') return '';
    return (
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      message.videoMessage?.caption ||
      message.documentMessage?.caption ||
      ''
    );
  }

  // ─── Extract sender's phone number from Evolution API key object ───
  // Evolution uses participantAlt (real phone) or participant (might be @lid)
  private evolutionSenderKey(key: any): string {
    const alt = key?.participantAlt || '';
    if (alt) return alt.split('@')[0];

    const participant = key?.participant || '';
    if (participant && !participant.endsWith('@lid')) {
      return participant.split('@')[0];
    }

    // 1:1 chat (no participant) — remoteJid IS the sender
    return (key?.remoteJid || '').split('@')[0];
  }

  // ─── Parse one Evolution API message record ───
  // Also used by the importer for bulk history pull.
  parseOneEvolutionRecord(rec: any): any | null {
    const key = rec?.key || {};

    // Skip messages sent by us
    if (key.fromMe) return null;

    // Skip non-text message types
    if (rec?.messageType && this.SKIP_TYPES.has(rec.messageType)) return null;

    const body = this.evolutionText(rec?.message);
    if (!body) return null;

    const remoteJid = key?.remoteJid || 'unknown';

    // Parse timestamp
    let ts = new Date();
    if (rec?.messageTimestamp) {
      try {
        ts = new Date(parseInt(rec.messageTimestamp) * 1000);
      } catch {
        // keep default
      }
    }

    const waId = key?.id || rec?.id;

    // Extract reply-to info if this message was a WhatsApp reply
    const contextInfo = rec?.message?.extendedTextMessage?.contextInfo;
    const quotedWaId = contextInfo?.stanzaId || null;
    const quotedText =
      contextInfo?.quotedMessage?.conversation || null;

    return {
      groupKey: remoteJid,
      senderKey: this.evolutionSenderKey(key),
      senderName: rec?.pushName || null,
      body,
      postedAt: ts,
      waMessageId: waId ? `${remoteJid}:${waId}` : undefined,
      quotedWaId,
      quotedText,
    };
  }

  // ─── Parse Evolution API webhook payload ───
  // Evolution sends: { event: "messages.upsert", data: { ... } or [...] }
  parseEvolutionPayload(payload: any): any[] {
    const data = payload?.data || payload;
    const records = Array.isArray(data) ? data : [data];
    const out: any[] = [];
    for (const rec of records) {
      const item = this.parseOneEvolutionRecord(rec);
      if (item) out.push(item);
    }
    return out;
  }

  // ─── Re-run classification on old messages ───
  // Called when a coordinator adds a new phrase or rule in Settings.
  // Only touches messages that were classified as OTHER or null (never
  // re-processes an inquiry or rate reply — avoids double-counting).
  async reclassifyMessages(days: number): Promise<any> {
    const since = new Date(Date.now() - days * 86400000);
    const candidates = await this.messageRepo.find({
      where: {
        postedAt: LessThan(new Date()) as any,
        inquiryId: IsNull(),
        classification: Not('INQUIRY'),
      },
      order: { postedAt: 'ASC' },
    });

    const filtered = candidates.filter(
      (m) =>
        new Date(m.postedAt) >= since &&
        (m.classification === null ||
          m.classification === undefined ||
          m.classification === 'OTHER'),
    );

    const before: Record<number, string> = {};
    for (const m of filtered) before[m.id] = m.classification || 'PENDING';

    const changed: any[] = [];
    for (const m of filtered) {
      const newCls = await this.matcher.routeMessage(m);
      if (newCls !== before[m.id]) {
        changed.push({
          id: m.id,
          sender: m.senderName || m.senderKey,
          body: (m.body || '').slice(0, 120),
          old: before[m.id],
          new: newCls,
          inquiry_id: m.inquiryId,
        });
      }
    }
    await this.messageRepo.save(filtered);
    return {
      checked: filtered.length,
      changed: changed.length,
      details: changed,
    };
  }
}



// Why do we need this module?
// WhatsApp messages can arrive through three different providers, each with a completely different JSON structure:



// Meta Cloud API:
// { entry: [{ changes: [{ value: { messages: [{ from: "919...", text: { body: "rate plz" } }] } }] }] }

// DoubleTick:
// { message: { from: "919...", text: "rate plz", chatId: "..." } }

// Evolution API:
// { data: { key: { remoteJid: "919...", participant: "919..." }, message: { conversation: "rate plz" } } }
// The ingest module normalizes all three into the same shape:

// typescript


// { groupKey: "919...", senderKey: "919...", body: "rate plz", postedAt: Date, waMessageId: "..." }
// Then calls ingestMessage() which stores it and passes it to the matcher for classification.

// ingestMessage() — the core method
// Check group — if the message is from an unknown group, ignore it
// Generate ID — use WhatsApp's message ID if available, otherwise create a SHA1 hash from content. This makes the system idempotent — if the same webhook fires twice, the message is only stored once.
// Check for duplicates — if a message with this ID already exists, skip it
// Save — store in the messages table
// Classify — call matcher.routeMessage(msg) which decides INQUIRY/RATE_REPLY/CHASE/OTHER
// Save classification — update the message with its classification
// parseOneEvolutionRecord() — used in two places
// This method is public because it's used by both the webhook handler (live messages) and the importer (bulk history pull from Evolution API). Same parsing logic, one place — no duplication.

// reclassifyMessages() — re-run after rule changes
// If a coordinator adds a new phrase like "plz place" via Settings, old messages that were classified as OTHER get re-processed. This only touches messages that had no effect the first time (no inquiry, no rate reply) — it can never double-count a chase or create a duplicate inquiry.