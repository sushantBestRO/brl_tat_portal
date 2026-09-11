import { Controller, Get, Post, Body, Query, Res, Headers } from '@nestjs/common';
import type { Response } from 'express';
import { IngestService } from '../ingest/ingest.service';
import { ConfigService } from '@nestjs/config';

@Controller()
export class WebhooksController {
  constructor(
    private ingest: IngestService,
    private envConfig: ConfigService,
  ) {}

  // ─── Meta Webhook Verification ───
  // Meta sends a GET request first to verify the endpoint.
  @Get('webhooks/whatsapp')
  verifyMeta(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (
      mode === 'subscribe' &&
      token === this.envConfig.get<string>('WA_VERIFY_TOKEN')
    ) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('verification failed');
    }
  }

  // ─── Meta Inbound Message ───
  @Post('webhooks/whatsapp')
  async receiveMeta(@Body() payload: any) {
    let n = 0;
    for (const item of this.ingest.parseMetaPayload(payload)) {
      if (await this.ingest.ingestMessage({ ...item, source: 'webhook' })) n++;
    }
    return { ingested: n };
  }

  // ─── DoubleTick Inbound Message ───
  @Post('webhooks/doubletick')
  async receiveDoubletick(
    @Body() payload: any,
    @Headers('x-webhook-secret') secret: string,
  ) {
    const expected = this.envConfig.get<string>('DOUBLETICK_WEBHOOK_SECRET') || '';
    if (expected && secret !== expected) return { error: 'bad webhook secret' };

    let n = 0;
    for (const item of this.ingest.parseDoubletickPayload(payload)) {
      if (await this.ingest.ingestMessage({ ...item, source: 'doubletick' })) n++;
    }
    return { ingested: n };
  }

  // ─── Evolution API Inbound Message ───
  @Post('webhooks/evolution')
  async receiveEvolution(
    @Body() payload: any,
    @Headers('apikey') apikey: string,
  ) {
    const expected = this.envConfig.get<string>('EVOLUTION_WEBHOOK_SECRET') || '';
    if (expected && apikey !== expected) return { error: 'bad webhook secret' };

    // Evolution fires this route for every event type (connection updates, qr codes, etc.)
    // Only messages.upsert carries chat messages.
    if (payload?.event && payload.event !== 'messages.upsert') {
      return { ingested: 0, skipped_event: payload.event };
    }

    let n = 0;
    for (const item of this.ingest.parseEvolutionPayload(payload)) {
      if (await this.ingest.ingestMessage({ ...item, source: 'evolution' })) n++;
    }
    return { ingested: n };
  }

  // ─── Import WhatsApp _chat.txt export ───
  // Accepts raw text body of a WhatsApp chat export.
  // @Post('webhooks/import/txt')
  // async importTxt(@Body() text: string, @Query('groupKey') groupKey?: string) {
  //   const gk = groupKey || 'import';
  //   let n = 0;
  //   for (const { dt, sender, body } of this.parseChatExport(text)) {
  //     if (await this.ingest.ingestMessage({
  //       groupKey: gk,
  //       senderKey: sender,
  //       senderName: sender,
  //       body,
  //       postedAt: dt,
  //       source: 'import',
  //     })) {
  //       n++;
  //     }
  //   }
  //   return { ingested: n };
  // }

    @Post('webhooks/import/txt')
  async importTxt(@Body() text: string, @Query('groupKey') groupKey?: string) {
    console.log('Received text length:', text?.length);
    console.log('Group Key:', groupKey);
     console.log('RAW TEXT START---');
    console.log(JSON.stringify(text));
    console.log('---RAW TEXT END');
    
    
    const gk = groupKey || 'import';
    let n = 0;
    const parsed = this.parseChatExport(text);
    console.log('Parsed messages:', parsed.length);
    
    for (const { dt, sender, body } of parsed) {
      console.log('Processing:', sender, '-', body.slice(0, 30));
      try {
        const ok = await this.ingest.ingestMessage({
          groupKey: gk,
          senderKey: sender,
          senderName: sender,
          body,
          postedAt: dt,
          source: 'import',
        });
        console.log('  Result:', ok);
        if (ok) n++;
      } catch (err) {
        console.error('  INGEST ERROR:', err.message);
      }
    }
    return { ingested: n };
  }


  // ─── Parse WhatsApp _chat.txt export ───
  // Supports both iOS format: [25/07/26, 3:29:00 PM] Sender: message
  // and Android format: 25/07/26, 15:29 - Sender: message
  private parseChatExport(text: string): { dt: Date; sender: string; body: string }[] {
      
    // const iosRe = /\[(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}:\d{2}\s?[AP]M)\] ([^:\[\]]+): /g;
    // const androidRe = /(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}(?:\s?[AP]M)?) - ([^:\n]+): /g;

    // Normalize Windows line endings
        const cleanText = text.replace(/\\r/g, '').replace(/\\n/g, '\n');

    
    console.log('CLEAN TEXT START---');
    console.log(JSON.stringify(cleanText));
    console.log('---CLEAN TEXT END');
    
    const iosRe = /\[(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}:\d{2}\s?[AP]M)\] ([^:\[\]]+): /g;
    const androidRe = /(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}(?:\s?[AP]M)?) - ([^:\n]+): /g;

    const iosHits = [...cleanText.matchAll(iosRe)];
    const androidHits = [...cleanText.matchAll(androidRe)];
    const matches = iosHits.length >= androidHits.length ? iosHits : androidHits;
    console.log('iOS matches:', iosHits.length, '| Android matches:', androidHits.length);

    const results: { dt: Date; sender: string; body: string }[] = [];

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const start = m.index! + m[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
      const body = text.slice(start, end).trim().replace(/\u200e/g, '');
      
      let dt: Date;
      try {
        dt = this.parseDate(m[1], m[2]);
      } catch {
        continue; // skip invalid dates
      }
      
      results.push({
        dt,
        sender: m[3].replace(/\u200e/g, '').trim(),
        body,
      });
    }
    return results;
  }

  // ─── Parse date from chat export ───
  private parseDate(d: string, t: string): Date {
    const combined = `${d}, ${t}`.replace(/\u202f/g, ' ').trim();

    // Try 24-hour format: 25/07/26, 15:29
    const m24 = combined.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}), (\d{1,2}):(\d{2})$/);
    if (m24) {
      const dd = parseInt(m24[1]);
      const mm = parseInt(m24[2]);
      const yy = 2000 + parseInt(m24[3]);
      const hh = parseInt(m24[4]);
      const mi = parseInt(m24[5]);
      return new Date(yy, mm - 1, dd, hh, mi, 0);
    }

    // Try 12-hour format: 25/07/26, 3:29 PM
    const m12 = combined.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}), (\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (m12) {
      const dd = parseInt(m12[1]);
      const mm = parseInt(m12[2]);
      const yy = 2000 + parseInt(m12[3]);
      let hh = parseInt(m12[4]);
      const mi = parseInt(m12[5]);
      const ap = m12[6].toUpperCase();
      
      if (ap === 'PM' && hh < 12) hh += 12;
      if (ap === 'AM' && hh === 12) hh = 0;
      
      return new Date(yy, mm - 1, dd, hh, mi, 0);
    }

    // Try 12-hour with seconds: 25/07/26, 3:29:00 PM
    const m12s = combined.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}), (\d{1,2}):(\d{2}):(\d{2})\s?(AM|PM)$/i);
    if (m12s) {
      const dd = parseInt(m12s[1]);
      const mm = parseInt(m12s[2]);
      const yy = 2000 + parseInt(m12s[3]);
      let hh = parseInt(m12s[4]);
      const mi = parseInt(m12s[5]);
      const ss = parseInt(m12s[6]);
      const ap = m12s[7].toUpperCase();
      
      if (ap === 'PM' && hh < 12) hh += 12;
      if (ap === 'AM' && hh === 12) hh = 0;
      
      return new Date(yy, mm - 1, dd, hh, mi, ss);
    }

    throw new Error(`Unrecognized date format: ${combined}`);
  }
}



// Meta Verification (GET /webhooks/whatsapp)
// When you set up a webhook in Meta's WhatsApp dashboard, Meta sends a GET request with hub.mode=subscribe, hub.verify_token=..., and hub.challenge=.... We must echo back the challenge if the token matches our .env WA_VERIFY_TOKEN. This proves we own the endpoint.

// Evolution API Event Filtering
// Evolution API sends webhooks for everything — connection updates, QR codes, battery status, etc. We only care about messages.upsert events, which carry actual chat messages. The check payload.event !== 'messages.upsert' filters out the noise.

// WhatsApp Chat Export Import (POST /webhooks/import/txt)
// This is a powerful feature. You can export a WhatsApp group chat as a text file (_chat.txt) and POST the raw text to this endpoint. The parseChatExport method parses both iOS and Android export formats, extracting the timestamp, sender, and message body. It then ingests each message through the exact same pipeline as live messages.

// This is how you backfill 8 months of history into the portal.