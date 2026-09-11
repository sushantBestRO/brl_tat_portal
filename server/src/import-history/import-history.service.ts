import { Injectable, Logger } from '@nestjs/common';
import { ChatMessage } from '../entities/message.entity';
import { MatcherService } from '../matcher/matcher.service';
import { AppConfigService } from '../config/app-config.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ImportHistoryService {
  private readonly logger = new Logger(ImportHistoryService.name);
  private importStatus: { running: boolean; progress: any } = {
    running: false,
    progress: null,
  };
  private stopRequested = false;

  stop() {
    this.stopRequested = true;
    return { status: 'stopping' };
  }

  constructor(
    @InjectRepository(ChatMessage) private messageRepo: Repository<ChatMessage>,
    private matcher: MatcherService,
    private config: AppConfigService,
  ) {}

  getStatus() {
    return this.importStatus;
  }

  async runImport(startDate: string, endDate: string) {
    if (this.importStatus.running) {
      return { error: 'Import already running' };
    }

    const apiKey = this.config.SETTINGS?.['maytapi_api_key'] || '';
    const productId = this.config.SETTINGS?.['maytapi_product_id'] || '';
    const phoneId = this.config.SETTINGS?.['maytapi_phone_id'] || '';
    const groupKey =
      this.config.SETTINGS?.['group_key'] ||
      this.config.CONFIG?.groups?.[0]?.group_key ||
      '';

    if (!apiKey || !productId || !phoneId || !groupKey) {
      return { error: 'Missing Maytapi settings' };
    }

    // Parse dates
    let start: Date, end: Date, label: string;

    if (startDate && /^\d{4}$/.test(startDate)) {
      const year = parseInt(startDate);
      start = new Date(year, 0, 1);
      end = endDate
        ? new Date(parseInt(endDate), 11, 31, 23, 59, 59)
        : new Date(year, 11, 31, 23, 59, 59);
      label = `Year ${startDate}`;
    } else if (startDate && /^\d{4}-\d{2}$/.test(startDate)) {
      const [y, m] = startDate.split('-').map(Number);
      start = new Date(y, m - 1, 1);
      end = new Date(y, m, 0, 23, 59, 59);
      label = `${startDate}`;
    } else {
      start = new Date(Date.now() - 90 * 86400000);
      end = new Date();
      label = 'Last 3 months';
    }

    this.importStatus = {
      running: true,
      progress: {
        label,
        start: start.toISOString(),
        end: end.toISOString(),
        currentPage: 0,
        totalPages: 0,
        fetched: 0,
        ingested: 0,
        skipped: 0,
        outOfRange: 0,
        errors: 0,
        done: false,
        message: 'Starting...',
      },
    };

    // Run in background
    this.doImport(
      apiKey,
      productId,
      phoneId,
      groupKey,
      start,
      end,
      label,
    ).catch((err) => {
      this.logger.error(`Import failed: ${err.message}`);
      this.importStatus.progress.message = `Import stopped by user. ${this.importStatus.progress.ingested} messages ingested.`;
      this.importStatus.running = false;
      this.importStatus.progress.done = true;
      this.importStatus.progress.message = `Error: ${err.message}`;
    });

    return { status: 'started', label };
  }

  private async doImport(
    apiKey: string,
    productId: string,
    phoneId: string,
    groupKey: string,
    startDate: Date,
    endDate: Date,
    label: string,
  ) {
    const startTs = startDate.getTime();
    const endTs = Math.min(endDate.getTime(), Date.now());
    let page = 1;
    let done = false;

    this.logger.log(`[ImportHistory] Starting import: ${label}`);
    this.logger.log(
      `[ImportHistory] From: ${startDate.toISOString()} To: ${new Date(endTs).toISOString()}`,
    );

    while (!done && page <= 100 && !this.stopRequested) {
      this.importStatus.progress.currentPage = page;
      this.importStatus.progress.message = `Fetching page ${page}...`;

      const url = `https://api.maytapi.com/api/${productId}/${phoneId}/getMessages/${groupKey}?page=${page}&limit=100`;

      let data: any;
      try {
        const resp = await fetch(url, {
          headers: { 'x-maytapi-key': apiKey },
        });
        data = await resp.json();
      } catch (err: any) {
        this.logger.error(
          `[ImportHistory] Page ${page} fetch failed: ${err.message}`,
        );
        this.importStatus.progress.errors++;
        break;
      }

      if (!data.success) {
        this.logger.error(
          `[ImportHistory] API error on page ${page}: ${data.message}`,
        );
        this.importStatus.progress.errors++;
        break;
      }

      const messages = data?.data?.messages || [];
      const users = data?.data?.users || {};

      if (messages.length === 0) {
        this.logger.log(`[ImportHistory] No more messages on page ${page}.`);
        done = true;
        break;
      }

      let pageIngested = 0;
      let pageSkipped = 0;
      let pageOutOfRange = 0;
      let oldestOnPage: Date | null = null;

      for (const m of messages) {
        this.importStatus.progress.fetched++;

        // if (m.fromMe) {
        //   pageSkipped++;
        //   this.importStatus.progress.skipped++;
        //   continue;
        // }/

        // const body = m.message?.text || m.message?.caption || '';
        // if (!body) {
        //   pageSkipped++;
        //   this.importStatus.progress.skipped++;
        //   continue;
        // }

        if (m.fromMe) {
          pageSkipped++;
          this.importStatus.progress.skipped++;
          this.logger.log(
            `[ImportHistory] Skipped (fromMe): type=${m.message?.type}, timestamp=${new Date(parseInt(m.timestamp) * 1000).toISOString()}`,
          );
          continue;
        }

        const body = m.message?.text || m.message?.caption || '';
        if (!body) {
          pageSkipped++;
          this.importStatus.progress.skipped++;
          this.logger.log(
            `[ImportHistory] Skipped (no body): type=${m.message?.type}, subtype=${m.message?.subtype}, timestamp=${new Date(parseInt(m.timestamp) * 1000).toISOString()}`,
          );
          continue;
        }

        const msgTime = new Date(parseInt(m.timestamp) * 1000);
        const msgTs = msgTime.getTime();

        if (!oldestOnPage || msgTime < oldestOnPage) oldestOnPage = msgTime;

        if (msgTs < startTs || msgTs > endTs) {
          pageOutOfRange++;
          this.importStatus.progress.outOfRange++;
          continue;
        }

        const senderUid = m.uid || '';
        // const senderName = users[senderUid]?.name || senderUid.split('@')[0] || null;
        // ─── FIX: Prefer push name for import history too ───
        const senderName =
          m.pushname ||
          m.sender_name ||
          m.name ||
          users[senderUid]?.name ||
          senderUid.split('@')[0] ||
          null;
        const waId = m.message?.id || undefined;

        try {
          const mid =
            waId || `${groupKey}|${senderUid}|${msgTime.toISOString()}|${body}`;
          const existing = await this.messageRepo.findOne({
            where: { waMessageId: mid },
          });
          if (existing) {
            pageSkipped++;
            this.importStatus.progress.skipped++;
            continue;
          }

          const msg = new ChatMessage();
          msg.waMessageId = mid;
          msg.groupKey = groupKey;
          msg.senderKey = senderUid.split('@')[0] || '';
          msg.senderName = senderName;
          msg.body = body;
          msg.postedAt = msgTime;
          msg.source = 'import';
          msg.quotedWaId = null;
          msg.quotedText = null;

          await this.messageRepo.save(msg);

          const classification = await this.matcher.routeMessage(msg);
          msg.classification = classification;
          await this.messageRepo.save(msg);

          pageIngested++;
          this.importStatus.progress.ingested++;
        } catch (err: any) {
          this.logger.error(`[ImportHistory] Ingest error: ${err.message}`);
          this.importStatus.progress.errors++;
        }
      }

      this.logger.log(
        `[ImportHistory] Page ${page}: ${messages.length} msgs, ${pageIngested} ingested, ${pageSkipped} skipped, ${pageOutOfRange} out of range`,
      );

      this.importStatus.progress.message = `Page ${page}: ${pageIngested} ingested, ${pageSkipped} skipped, ${pageOutOfRange} out of range`;

      // Stop if oldest message is before our start date
      if (oldestOnPage && oldestOnPage.getTime() < startTs) {
        this.logger.log(`[ImportHistory] Reached before start date. Stopping.`);
        done = true;
        break;
      }

      page++;
      await new Promise((r) => setTimeout(r, 500));
    }

    this.importStatus.running = false;
    this.importStatus.progress.done = true;
    this.importStatus.progress.message = `Import complete: ${this.importStatus.progress.ingested} messages ingested`;

    this.logger.log(
      `[ImportHistory] COMPLETE: ${this.importStatus.progress.ingested} ingested, ${this.importStatus.progress.skipped} skipped, ${this.importStatus.progress.outOfRange} out of range`,
    );
  }
}
