import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Inquiry } from '../entities/inquiry.entity';
import { Event } from '../entities/event.entity';
import { AppConfigService } from '../config/app-config.service';
import { CallLog } from 'src/entities/call-log.entity';

// ─── Click-to-call via Runo ───
// Flow: the agent's phone rings first; once they pick up, Runo connects
// the customer. We only initiate the call and record the attempt — the
// outcome (connected / duration) comes from Runo's webhook or is logged
// manually from the Call Logs tab.
//
// Settings keys used (stored in the app_setting table):
//   runo_api_key       → the Runo Auth-Key      (REQUIRED)
//   caller_phone       → your phone number      (REQUIRED — rings first)
//   runo_process_name  → Runo process name      (default: "Default Process")
@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  private static readonly RUNO_URL =
    'https://api.runo.in/v1/crm/allocation?isAutoDialLead=true';

  constructor(
    @InjectRepository(CallLog) private callRepo: Repository<CallLog>,
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    private config: AppConfigService,
  ) {}

  // ─── Settings helpers ───
  private setting(key: string, fallback = ''): string {
    return (this.config.SETTINGS as any)?.[key] || fallback;
  }

  get callerPhone(): string {
    return this.setting('caller_phone');
  }

  get runoKey(): string {
    return this.setting('runo_api_key') || process.env.RUNO_API_KEY || '';
  }

  get processName(): string {
    return this.setting('runo_process_name', 'Default Process');
  }

  get enabled(): boolean {
    return !!this.runoKey && !!this.callerPhone;
  }

  // ─── Normalize any phone format to +91XXXXXXXXXX ───
  private normalizePhone(p: string): string {
    const raw = (p || '').trim();
    if (!raw) return '';
    const d = raw.replace(/\D/g, '');
    if (!d) return '';
    if (d.length === 10) return '+91' + d;
    if (d.length === 12 && d.startsWith('91')) return '+' + d;
    if (raw.startsWith('+')) return raw;
    return '+' + d;
  }

  // ─── Config for the frontend popup ───
  async getConfig() {
    return {
      enabled: this.enabled,
      caller_phone: this.callerPhone
        ? this.normalizePhone(this.callerPhone)
        : '',
      has_key: !!this.runoKey,
    };
  }

  // ─── Initiate a call ───
  async connect(params: {
    inquiryId?: number;
    customerPhone: string;
    customerName?: string;
    agentPhone?: string;
    agentName?: string;
    by?: string;
  }) {
    if (!this.runoKey) {
      throw new BadRequestException(
        'Calling is not configured — add the Runo API key in Settings',
      );
    }

    const customer = this.normalizePhone(params.customerPhone);
    if (!customer) {
      throw new BadRequestException('Customer phone number is required');
    }

    const agent = this.normalizePhone(params.agentPhone || this.callerPhone);
    if (!agent) {
      throw new BadRequestException(
        'No calling number set — add your Phone No in Settings',
      );
    }

    // Create the log row FIRST, so failed attempts are recorded too
    const log = this.callRepo.create({
      inquiryId: params.inquiryId ?? null,
      customerName: params.customerName || 'Customer',
      customerPhone: customer,
      agentPhone: agent,
      agentName: params.agentName || '',
      status: 'INITIATED',
      startedAt: new Date(),
      initiatedBy: params.by || 'coordinator',
    });
    await this.callRepo.save(log);

    try {
      const resp = await fetch(CallsService.RUNO_URL, {
        method: 'POST',
        headers: {
          'Auth-Key': this.runoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: {
            name: params.customerName || 'Customer',
            phoneNumber: customer,
          },
          processName: this.processName,
          assignedTo: agent,
        }),
      });

      const text = await resp.text();
      log.runoResponse = text.slice(0, 2000);

      if (!resp.ok) {
        log.status = 'FAILED';
        log.note = `Runo HTTP ${resp.status}`;
        await this.callRepo.save(log);
        this.logger.error(
          `[Call] Runo HTTP ${resp.status}: ${text.slice(0, 200)}`,
        );
        throw new BadRequestException(
          `Call failed — Runo returned ${resp.status}. Check the API key in Settings.`,
        );
      }

      await this.callRepo.save(log);

      // also record on the inquiry's timeline
      if (log.inquiryId) {
        await this.eventRepo.save(
          this.eventRepo.create({
            inquiryId: log.inquiryId,
            kind: 'CALL_LOGGED',
            actor: params.by || 'coordinator',
            channel: 'call',
            detail: `Call initiated via Runo → customer ${customer} (ringing ${agent} first)`,
          }),
        );
      }

      this.logger.log(
        `[Call] Initiated: customer=${customer} agent=${agent} log#${log.id}`,
      );
      return { ok: true, callId: log.id, status: log.status };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      log.status = 'FAILED';
      log.note = err.message;
      await this.callRepo.save(log);
      this.logger.error(`[Call] failed: ${err.message}`);
      throw new BadRequestException(`Call failed: ${err.message}`);
    }
  }

  // ─── Runo webhook: call status updates land here ───
  // Flexible parsing — Runo's exact payload may differ; we look for the
  // customer phone + a status word, and update the most recent call.
  async handleWebhook(payload: any) {
    this.logger.log(
      `[Call] webhook received: ${JSON.stringify(payload).slice(0, 600)}`,
    );
    const p = payload || {};
    const cust = p.customer || {};

    const phone = this.normalizePhone(
      String(
        p.customerPhone ||
          p.phoneNumber ||
          p.phone ||
          p.to ||
          cust.phoneNumber ||
          '',
      ),
    );

    const statusRaw = String(
      p.status || p.callStatus || p.event || p.disposition || '',
    ).toLowerCase();
    const durationRaw =
      p.duration ?? p.callDuration ?? p.durationSeconds ?? p.talkTime ?? null;

    let log: CallLog | null = null;
    if (phone) {
      log = await this.callRepo.findOne({
        where: { customerPhone: phone },
        order: { id: 'DESC' },
      });
    }
    if (!log) {
      this.logger.warn('[Call] webhook: no matching call log found');
      return { ok: false, reason: 'no matching call' };
    }

    log.runoResponse = JSON.stringify(payload).slice(0, 2000);

    if (/connect|answer|in.?progress|talk|started/.test(statusRaw)) {
      log.status = 'CONNECTED';
      if (!log.connectedAt) log.connectedAt = new Date();
    } else if (/no.?answer|unanswer|not.?connect/.test(statusRaw)) {
      log.status = 'NO_ANSWER';
    } else if (/busy/.test(statusRaw)) {
      log.status = 'BUSY';
    } else if (/fail|reject|cancel|error/.test(statusRaw)) {
      log.status = 'FAILED';
    } else if (/complete|end|hang|disconnect|done|finish/.test(statusRaw)) {
      log.status = log.connectedAt ? 'COMPLETED' : 'NO_ANSWER';
      if (!log.endedAt) log.endedAt = new Date();
    }

    if (durationRaw != null) {
      const secs = Number(String(durationRaw).replace(/\D/g, '')) || 0;
      if (secs > 0) {
        log.durationSeconds = secs;
        if (log.connectedAt && !log.endedAt) {
          log.endedAt = new Date(log.connectedAt.getTime() + secs * 1000);
        }
      }
    }
    if (!log.durationSeconds && log.connectedAt && log.endedAt) {
      log.durationSeconds = Math.round(
        (log.endedAt.getTime() - log.connectedAt.getTime()) / 1000,
      );
    }

    await this.callRepo.save(log);
    return { ok: true, callId: log.id, status: log.status };
  }

  // ─── Manual outcome (when the webhook isn't configured yet) ───
  async setOutcome(
    id: number,
    body: {
      status?: string;
      durationSeconds?: number;
      note?: string;
      by?: string;
    },
  ) {
    const log = await this.callRepo.findOne({ where: { id } });
    if (!log) throw new NotFoundException('call not found');

    if (body.status) log.status = String(body.status).toUpperCase();
    if (body.durationSeconds != null) {
      log.durationSeconds = Number(body.durationSeconds) || 0;
    }
    if (body.note) log.note = body.note;

    if (log.status === 'CONNECTED' && !log.connectedAt) {
      log.connectedAt = new Date();
    }
    if (
      ['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY'].includes(log.status) &&
      !log.endedAt
    ) {
      log.endedAt = new Date();
    }
    if (!log.durationSeconds && log.connectedAt && log.endedAt) {
      log.durationSeconds = Math.round(
        (log.endedAt.getTime() - log.connectedAt.getTime()) / 1000,
      );
    }

    await this.callRepo.save(log);

    if (log.inquiryId) {
      await this.eventRepo.save(
        this.eventRepo.create({
          inquiryId: log.inquiryId,
          kind: 'CALL_LOGGED',
          actor: body.by || 'coordinator',
          channel: 'call',
          detail: `Call outcome: ${log.status}${
            log.durationSeconds
              ? ` (${Math.round(log.durationSeconds / 60)} min)`
              : ''
          }${body.note ? ` — ${body.note}` : ''}`,
        }),
      );
    }

    return { ok: true, id: log.id, status: log.status };
  }

  // ─── Call logs for the Settings → Call Logs tab ───
  async list(limit = 200) {
    const rows = await this.callRepo.find({
      order: { id: 'DESC' },
      take: Math.min(limit, 1000),
    });
    return rows.map((r) => ({
      id: r.id,
      inquiry_id: r.inquiryId,
      customer_name: r.customerName,
      customer_phone: r.customerPhone,
      agent_name: r.agentName,
      agent_phone: r.agentPhone,
      status: r.status,
      started_at: r.startedAt,
      connected_at: r.connectedAt,
      ended_at: r.endedAt,
      duration_seconds: r.durationSeconds,
      duration_min:
        r.durationSeconds != null
          ? Math.round((r.durationSeconds / 60) * 10) / 10
          : null,
      initiated_by: r.initiatedBy,
      note: r.note,
    }));
  }

  async stats() {
    const all = await this.callRepo.find();
    const connected = all.filter(
      (c) => !!c.connectedAt || ['CONNECTED', 'COMPLETED'].includes(c.status),
    );
    const totalSecs = all.reduce((s, c) => s + (c.durationSeconds || 0), 0);
    return {
      total: all.length,
      connected: connected.length,
      not_connected: all.length - connected.length,
      total_minutes: Math.round((totalSecs / 60) * 10) / 10,
      avg_minutes: connected.length
        ? Math.round((totalSecs / 60 / connected.length) * 10) / 10
        : 0,
    };
  }
}
