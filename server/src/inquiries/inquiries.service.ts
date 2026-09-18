import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { Event } from '../entities/event.entity';
import { ChatMessage } from '../entities/message.entity';
import { AppConfigService } from '../config/app-config.service';
import { NotifyService } from '../notify/notify.service';
import { MatcherService } from '../matcher/matcher.service';
import { ParserService } from 'src/parser/parser.service';

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(ChatMessage) private messageRepo: Repository<ChatMessage>,
    private config: AppConfigService,
    private notify: NotifyService,
    private matcher: MatcherService,
    private parser: ParserService,
  ) {}

  // ─── Serialize inquiry for API response ───
  private serialize(inq: Inquiry): any {
    const end = inq.quotedAt || new Date();
    const ageMin =
      Math.round(
        ((end.getTime() - new Date(inq.postedAt).getTime()) / 60000) * 10,
      ) / 10;
    const m = inq.tatSeconds != null ? Math.floor(inq.tatSeconds / 60) : null;
    const tat =
      m == null
        ? '-'
        : m >= 60
          ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
          : `${m}m`;

    const fmtDur = (mins: number): string => {
      if (mins <= 0) return '0 min';
      const h = Math.floor(mins / 60);
      const m = Math.round(mins % 60);
      if (h > 0 && m > 0) return `${h} hr ${m} min`;
      if (h > 0) return `${h} hr`;
      return `${m} min`;
    };

    return {
      id: inq.id,
      group: this.config.GROUP_NAMES[inq.groupKey] || inq.groupKey,
      requester: inq.requesterName || inq.requesterKey,
      lane: inq.lane,
      spec: inq.spec,
      vehicle_type: inq.vehicleType || '',
      posted_at: inq.postedAt?.toISOString() || null,
      status: inq.status,
      assigned_to: inq.assignedToName,
      assigned_to_key: inq.assignedToKey,
      age_minutes: ageMin,
      age_display: fmtDur(ageMin),
      quoted_at: inq.quotedAt?.toISOString() || null,
      quoted_by: inq.quotedByName,
      // quoted_rates: inq.quotedRates,
      quoted_rates: inq.quotedRates,
      quoted_rates_detail: inq.quotedRatesDetail
        ? JSON.parse(inq.quotedRatesDetail)
        : null,
      match_basis: inq.matchBasis,
      tat,
      followups: inq.followupCount || 0,
      reminders: inq.reminderCount || 0,
      close_reason: inq.closeReason || '',
    };
  }

  // ─── List inquiries with optional filters ───
  // async findAll(status?: string, days = 30): Promise<any[]> {
  //   const since = new Date(Date.now() - days * 86400000);
  //   const qb = this.inquiryRepo
  //     .createQueryBuilder('i')
  //     .where('i.postedAt >= :since', { since })
  //     .andWhere('i.archived = false')
  //     .orderBy('i.id', 'DESC')
  //     .take(1000);

  //   if (status) {
  //     qb.andWhere('i.status = :status', { status: status.toUpperCase() });
  //   }

  //   const rows = await qb.getMany();
  //   return rows.map((i) => this.serialize(i));
  // }

  async findAll(
    status?: string,
    days = 30,
    startDate?: string,
    endDate?: string,
  ): Promise<any[]> {
    const qb = this.inquiryRepo
      .createQueryBuilder('i')
      .where('i.archived = false')
      .orderBy('i.id', 'DESC')
      .take(5000);

    // Use date range if provided, otherwise use days
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      qb.andWhere('i.postedAt >= :start', { start });
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        qb.andWhere('i.postedAt <= :end', { end });
      }
    } else {
      const since = new Date(Date.now() - days * 86400000);
      qb.andWhere('i.postedAt >= :since', { since });
    }

    if (status) {
      qb.andWhere('i.status = :status', { status: status.toUpperCase() });
    }

    const rows = await qb.getMany();
    return rows.map((i) => this.serialize(i));
  }

  async backfillVehicleTypes(): Promise<{ total: number; updated: number }> {
    const rows = await this.inquiryRepo
      .createQueryBuilder('inq')
      .where("inq.vehicleType = '' OR inq.vehicleType IS NULL")
      .getMany();

    let updated = 0;
    for (const row of rows) {
      const vt = this.parser.vehicleTypeOf(row.rawBody);
      if (vt) {
        row.vehicleType = vt;
        await this.inquiryRepo.save(row);
        updated++;
      }
    }

    return { total: rows.length, updated };
  }

  // ─── Check email quota status (for frontend warning) ───
  async emailStatus(): Promise<any> {
    return this.notify.getEmailStatus();
  }

  // ─── Get single inquiry with events ───
  async findOne(id: number): Promise<any> {
    if (!id || isNaN(id)) throw new NotFoundException('inquiry not found');

    const inq = await this.inquiryRepo.findOne({
      where: { id, archived: false },
      relations: { events: true },
    });
    if (!inq) throw new NotFoundException('inquiry not found');

    const data = this.serialize(inq);
    data.raw_body = inq.rawBody;
    data.events = (inq.events || []).map((e) => ({
      at: e.at?.toISOString(),
      kind: e.kind,
      actor: e.actor,
      channel: e.channel,
      detail: e.detail,
    }));
    return data;
  }

  // ─── Manually record a rate (coordinator quotes on behalf of pricer) ───
  // ─── Manually record a rate (coordinator quotes on behalf of pricer) ───
  // async manualQuote(
  //   id: number,
  //   rates: string,
  //   quotedBy = 'coordinator',
  //   note = '',
  // ): Promise<any> {
  //   const inq = await this.inquiryRepo.findOne({ where: { id } });
  //   if (!inq) throw new NotFoundException('inquiry not found');

  //   inq.status = 'QUOTED';
  //   inq.quotedAt = new Date();

  //   // ─── Ownership Logic ───
  //   // If a pricer was already selected, credit the quote to them
  //   // If no pricer was selected, the Coordinator takes ownership
  //   if (inq.assignedToKey) {
  //     inq.quotedByKey = inq.assignedToKey;
  //     inq.quotedByName = inq.assignedToName || 'Coordinator';
  //   } else {
  //     inq.assignedToKey = 'coordinator';
  //     inq.assignedToName = 'Coordinator';
  //     inq.quotedByKey = 'coordinator';
  //     inq.quotedByName = 'Coordinator';
  //   }

  //   inq.quotedRates = rates;
  //   inq.matchBasis = 'manual';
  //   inq.tatSeconds =
  //     (inq.quotedAt.getTime() - new Date(inq.postedAt).getTime()) / 1000;

  //   await this.inquiryRepo.save(inq);

  //   await this.eventRepo.save(
  //     this.eventRepo.create({
  //       inquiryId: id,
  //       kind: 'QUOTED',
  //       actor: inq.quotedByName,
  //       channel: 'dashboard',
  //       detail: `manual rate ${rates}. ${note}`.trim(),
  //     }),
  //   );

  //   // ─── Send the quoted rate to the requester via WhatsApp ───
  //   const requesterPhone = inq.requesterKey || '';
  //   if (requesterPhone) {
  //     const rateMsg =
  //       `✅ Rate Update\n\n` +
  //       `Lane: ${inq.lane}\n` +
  //       `Rate: ₹${rates}\n` +
  //       `Quoted by: ${inq.quotedByName}\n\n` +
  //       `Thank you for your inquiry.`;

  //     const sent = await this.notify.sendWhatsapp(requesterPhone, rateMsg);
  //     await this.eventRepo.save(
  //       this.eventRepo.create({
  //         inquiryId: id,
  //         kind: 'RATE_SENT',
  //         actor: inq.quotedByName,
  //         channel: sent ? 'whatsapp' : 'console',
  //         detail: sent
  //           ? `Rate sent to ${inq.requesterName} (${requesterPhone})`
  //           : `Rate not sent (WA not configured)`,
  //       }),
  //     );
  //   }

  //   return this.serialize(inq);
  // }

  async manualQuote(
    id: number,
    rates: string,
    quotedBy = 'coordinator',
    note = '',
  ): Promise<any> {
    const inq = await this.inquiryRepo.findOne({ where: { id } });
    if (!inq) throw new NotFoundException('inquiry not found');

    // ─── Was this inquiry already quoted? (rate correction) ───
    const wasAlreadyQuoted = inq.status === 'QUOTED' && !!inq.quotedRates;
    const oldRate = wasAlreadyQuoted ? inq.quotedRates : null;

    inq.status = 'QUOTED';

    // ─── Ownership Logic ───
    if (wasAlreadyQuoted && inq.quotedByKey) {
      // Rate correction — keep the original quoter's ownership
    } else if (inq.assignedToKey) {
      inq.quotedByKey = inq.assignedToKey;
      inq.quotedByName = inq.assignedToName || 'Coordinator';
    } else {
      inq.assignedToKey = 'coordinator';
      inq.assignedToName = 'Coordinator';
      inq.quotedByKey = 'coordinator';
      inq.quotedByName = 'Coordinator';
    }

    if (!wasAlreadyQuoted) {
      inq.quotedAt = new Date();
      inq.tatSeconds =
        (inq.quotedAt.getTime() - new Date(inq.postedAt).getTime()) / 1000;
    }

    inq.quotedRates = rates;
    inq.matchBasis = wasAlreadyQuoted ? 'manual_correction' : 'manual';

    await this.inquiryRepo.save(inq);

    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: id,
        kind: wasAlreadyQuoted ? 'RATE_CHANGED' : 'QUOTED',
        actor: quotedBy,
        channel: 'dashboard',
        detail: wasAlreadyQuoted
          ? `Rate corrected manually: ${oldRate} → ${rates}${note ? `. ${note}` : ''}`
          : `manual rate ${rates}. ${note}`.trim(),
      }),
    );

    return { updated: true, wasAlreadyQuoted, oldRate, newRate: rates };
  }

  // ─── Log a coordinator call outcome ───
  async logCall(id: number, outcome: string, by = 'coordinator'): Promise<any> {
    const inq = await this.inquiryRepo.findOne({ where: { id } });
    if (!inq) throw new NotFoundException('inquiry not found');

    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: id,
        kind: 'CALL_LOGGED',
        actor: by,
        channel: 'call',
        detail: outcome,
      }),
    );

    return { ok: true };
  }

  // ─── Reassign inquiry to a different pricing team member ───
  async reassign(
    id: number,
    assigneeKey: string | null,
    by = 'coordinator',
  ): Promise<any> {
    const inq = await this.inquiryRepo.findOne({ where: { id } });
    if (!inq) throw new NotFoundException('inquiry not found');

    // Store the original key to check if it actually changed later
    const originalKey = inq.assignedToKey;
    const oldName = inq.assignedToName;

    // ─── Handle "None" (null) assignment ───
    if (!assigneeKey || assigneeKey === 'NONE' || assigneeKey === '') {
      inq.assignedToKey = null;
      inq.assignedToName = null;
    } else {
      const norm = (assigneeKey || '').replace(/\D/g, '');
      let memberPhone: string | null = null;
      let memberName: string = assigneeKey;

      for (const [phone, member] of Object.entries(this.config.PRICING_TEAM)) {
        const pNorm = phone.replace(/\D/g, '');
        if (
          pNorm === norm ||
          (pNorm.length === 10 && '91' + pNorm === norm) ||
          (norm.length === 10 && '91' + norm === pNorm)
        ) {
          memberPhone = phone;
          memberName = member.name;
          break;
        }
      }

      if (!memberPhone) {
        throw new BadRequestException(
          `'${assigneeKey}' is not a known pricing-team phone`,
        );
      }

      inq.assignedToKey = memberPhone;
      inq.assignedToName = memberName;
    }

    // ─── FIX: Compare against the ORIGINAL key, not the one we just set ───
    if (assigneeKey === originalKey || (!assigneeKey && !originalKey)) {
      return { ok: true, unchanged: true, assigned_to: inq.assignedToName };
    }

    // Now it will properly save to the database!
    await this.inquiryRepo.save(inq);

    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: id,
        kind: 'REASSIGNED',
        actor: by,
        channel: 'system',
        detail: `reassigned from ${oldName || '—'} to ${inq.assignedToName || 'None'}`,
      }),
    );

    return { ok: true, unchanged: false, assigned_to: inq.assignedToName };
  }

  // ─── Get list of pricing team members for the assignee dropdown ───
  pricingTeam(): any[] {
    return Object.entries(this.config.PRICING_TEAM).map(
      ([phone, member]: [string, any]) => ({
        phone,
        name: member.name || phone,
        active: member.active !== false,
      }),
    );
  }

  // ─── Broadcast reminder to ALL active pricing members ───
  // Sends WhatsApp + Email to every active pricer for a specific inquiry
  async broadcastRemind(id: number, channel: string, note = ''): Promise<any> {
    const inq = await this.inquiryRepo.findOne({ where: { id } });
    if (!inq) throw new NotFoundException('inquiry not found');

    const ageMin = Math.round(
      (new Date().getTime() - new Date(inq.postedAt).getTime()) / 60000,
    );

    // ─── Build broadcast WhatsApp message ───
    const waText =
      `📢 BROADCAST — Inquiry #${inq.id}\n\n` +
      `Assigned to: ${inq.assignedToName || '—'} (no rate given yet)\n` +
      `Age: ${ageMin} min\n\n` +
      `Lane: ${inq.lane}\n` +
      `Vehicle Type: ${inq.vehicleType || '-'}\n\n` +
      `Original Message:\n${inq.rawBody || '-'}\n\n` +
      `Anyone available to quote? Reply in WhatsApp group.`;

    // ─── Build broadcast Email body ───
    const whatsappGroupLink =
      'https://chat.whatsapp.com/IkUNmQM94csFEQyEVJE73v';

    const emailBody =
      `📢 BROADCAST — Anyone available to quote?\n\n` +
      `Inquiry #${inq.id} is assigned to ${inq.assignedToName || '—'} ` +
      `but no rate has been given yet (${ageMin} min old).\n\n` +
      `Lane: ${inq.lane}\n` +
      `Vehicle Type: ${inq.vehicleType || '-'}\n` +
      `Requester: ${inq.requesterName}\n` +
      `Posted: ${new Date(inq.postedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
      `Original WhatsApp Message:\n` +
      `───────────────────────────\n` +
      `${inq.rawBody || '-'}\n` +
      `───────────────────────────\n\n` +
      `If you are available, please reply with the rate in the WhatsApp group.\n\n` +
      `<a href="${whatsappGroupLink}" target="_blank">👉 Click here to give rate on WhatsApp</a>\n\n` +
      `— BRL TAT Portal`;

    // ─── Get all active pricing members ───
    const team = Object.entries(this.config.PRICING_TEAM).filter(
      ([, m]: [string, any]) => m.active !== false,
    );

    let waSent = 0;
    let emailSent = 0;

    // ─── Send WhatsApp to all active members ───
    if (channel === 'whatsapp' || channel === 'both') {
      for (const [phone] of team) {
        const ok = await this.notify.sendWhatsapp(phone, waText);
        if (ok) waSent++;
      }
    }

    // ─── Send Email to all active members (bulk) ───
    if (channel === 'email' || channel === 'both') {
      const emails = team
        .map(([, m]: [string, any]) => (m as any).email)
        .filter((e: string) => e && e.trim());

      if (emails.length) {
        const ok = await this.notify.sendEmailBulk(
          emails,
          `📢 BROADCAST — Inquiry #${inq.id} needs a rate`,
          emailBody,
        );
        if (ok) emailSent = emails.length;
      }
    }

    // ─── Log broadcast event in database ───
    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: id,
        at: new Date(),
        kind: 'BROADCAST',
        actor: 'coordinator',
        channel,
        detail:
          `Broadcast sent to ${team.length} members — WA: ${waSent}, Email: ${emailSent}. ${note}`.trim(),
      }),
    );

    return {
      ok: true,
      wa_sent: waSent,
      email_sent: emailSent,
      total_members: team.length,
    };
  }

  // ─── Close an inquiry (won / lost / withdrawn) ───
  async close(id: number, reason: string, note = ''): Promise<any> {
    const inq = await this.inquiryRepo.findOne({ where: { id } });
    if (!inq) throw new NotFoundException('inquiry not found');

    const r = reason.toLowerCase();
    if (!['won', 'lost', 'withdrawn'].includes(r)) {
      throw new BadRequestException('reason must be won|lost|withdrawn');
    }

    const old = inq.status;
    const statusMap: Record<string, string> = {
      won: 'CLOSED_WON',
      lost: 'CLOSED_LOST',
      withdrawn: 'WITHDRAWN',
    };
    inq.status = statusMap[r];
    inq.closedAt = new Date();
    inq.closeReason = `${r}. ${note}`.trim();

    await this.inquiryRepo.save(inq);
    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: id,
        kind: 'STATUS_CHANGE',
        actor: 'coordinator',
        channel: 'dashboard',
        detail: `${old} -> ${inq.status}: ${note}`,
      }),
    );

    return this.serialize(inq);
  }

  // ─── Soft-delete (archive) an inquiry — coordinator action ───
  // async deleteInquiry(id: number, by: string = 'coordinator') {
  //   const inq = await this.inquiryRepo.findOne({ where: { id } });
  //   if (!inq) throw new NotFoundException('inquiry not found');

  //   inq.archived = true;
  //   await this.inquiryRepo.save(inq);

  //   await this.eventRepo.save(
  //     this.eventRepo.create({
  //       inquiryId: id,
  //       kind: 'STATUS_CHANGE',
  //       actor: by,
  //       channel: 'dashboard',
  //       detail:
  //         'Inquiry deleted by coordinator (archived, hidden from lists & reports)',
  //     }),
  //   );
  //   return { deleted: true };
  // }

  // ─── Soft-delete (archive) an inquiry — reason recorded for audit ───
  async deleteInquiry(id: number, reason: string, by: string = 'coordinator') {
    const inq = await this.inquiryRepo.findOne({ where: { id } });
    if (!inq) throw new NotFoundException('inquiry not found');

    inq.archived = true;
    await this.inquiryRepo.save(inq);

    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: id,
        kind: 'DELETE',
        actor: by,
        channel: 'dashboard',
        detail: `Inquiry deleted (archived). Reason: ${reason || 'not specified'}`,
      }),
    );
    return { deleted: true };
  }

  // ─── List soft-deleted inquiries with their delete reason ───
  async deletedInquiries() {
    const rows = await this.inquiryRepo
      .createQueryBuilder('i')
      .where('i.archived = true')
      .orderBy('i.postedAt', 'DESC')
      .getMany();

    const ids = rows.map((r) => r.id);
    const delEvents = ids.length
      ? await this.eventRepo.find({
          where: { inquiryId: In(ids), kind: 'DELETE' },
        })
      : [];
    const delBy: Record<number, any> = {};
    for (const e of delEvents) delBy[e.inquiryId] = e;

    return rows.map((r) => ({
      id: r.id,
      requester: r.requesterName || 'Unknown',
      lane: r.lane || '',
      spec: r.spec || '',
      posted_at: r.postedAt,
      status: r.status,
      deleted_at: delBy[r.id]?.at || null,
      deleted_by: delBy[r.id]?.actor || '',
      delete_reason: delBy[r.id]?.detail || '(no reason recorded)',
    }));
  }

  // ─── Restore a deleted inquiry ───
  async restoreInquiry(id: number, by = 'coordinator') {
    const inq = await this.inquiryRepo.findOne({ where: { id } });
    if (!inq) throw new NotFoundException('inquiry not found');
    inq.archived = false;
    await this.inquiryRepo.save(inq);
    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: id,
        kind: 'STATUS_CHANGE',
        actor: by,
        channel: 'dashboard',
        detail: 'Inquiry restored from deleted (un-archived)',
      }),
    );
    return { restored: true };
  }

  // ─── Send an ad-hoc reminder (manual trigger from dashboard) ─── for specific assignee

  async adhocRemind(id: number, channel: string, note = ''): Promise<any> {
    const inq = await this.inquiryRepo.findOne({ where: { id } });
    if (!inq) throw new NotFoundException('inquiry not found');

    const ageMin = Math.round(
      (new Date().getTime() - new Date(inq.postedAt).getTime()) / 60000,
    );

    const text =
      `⏰ RATE REMINDER (${ageMin} min)\n\n` +
      `Inquiry #${inq.id}\n` +
      `Lane: ${inq.lane}\n` +
      `Vehicle Type: ${inq.vehicleType || '-'}\n` +
      `Requester: ${inq.requesterName}\n` +
      `Posted: ${new Date(inq.postedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
      `Original Message:\n${inq.rawBody || '-'}\n\n` +
      `Please quote the rate ASAP in JNPT Whatsapp Group.\n` +
      `Reply in the JNPT WhatsApp group with the rate.`;

    const whatsappGroupLink =
      'https://chat.whatsapp.com/IkUNmQM94csFEQyEVJE73v';

    const emailBody =
      `Rate Please — this inquiry needs your attention.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Inquiry #${inq.id}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Requester: ${inq.requesterName}\n` +
      `Posted: ${new Date(inq.postedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` +
      `Age: ${ageMin} minutes\n` +
      `Status: No rate given yet\n\n` +
      `Lane: ${inq.lane}\n` +
      `Vehicle Type: ${inq.vehicleType || '-'}\n\n` +
      `Original WhatsApp Message:\n` +
      `───────────────────────────\n` +
      `${inq.rawBody || '-'}\n` +
      `───────────────────────────\n\n` +
      `Please quote the rate ASAP.\n` +
      `Reply in the WhatsApp group with the rate.\n\n` +
      `<a href="${whatsappGroupLink}" target="_blank">👉 Click here to give rate on WhatsApp</a>\n\n` +
      `— BRL TAT Portal`;

    let sent: boolean;
    let kind: string;

    if (channel === 'email') {
      const member = this.config.PRICING_TEAM[inq.assignedToKey || ''];
      const memberEmail = (member as any)?.email || '';

      if (!memberEmail) {
        return {
          ok: false,
          sent: false,
          error: 'No email configured for this team member',
        };
      }

      sent = await this.notify.sendEmail(
        memberEmail,
        `⏰ Rate Please — Inquiry #${inq.id} (${ageMin} min pending)`,
        emailBody,
      );
      kind = 'REMINDER_EMAIL';
    } else {
      sent = await this.notify.sendWhatsapp(inq.assignedToKey || '', text);
      kind = 'REMINDER_WA';
    }

    inq.reminderCount = (inq.reminderCount || 0) + 1;
    await this.inquiryRepo.save(inq);

    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: id,
        kind,
        actor: 'coordinator',
        channel,
        detail: (sent ? '' : 'dry-run: ') + text + ' ' + note,
      }),
    );

    return { ok: true, sent };
  }

  // ─── Append a coordinator note (follow-up log) ───
  async addCoordinatorNote(id: number, note: string) {
    const inq = await this.inquiryRepo.findOne({ where: { id } });
    if (!inq) throw new NotFoundException('inquiry not found');

    const clean = (note || '').trim().slice(0, 1000);
    if (!clean) throw new BadRequestException('note cannot be empty');

    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: id,
        kind: 'NOTE',
        actor: 'coordinator',
        channel: 'dashboard',
        detail: clean,
      }),
    );
    return { added: true };
  }

  // ─── Notes timelines for a batch of inquiry IDs: { [id]: "17/09 17:46 - note; ..." } ───
  async notesBatch(ids: number[]) {
    if (!ids.length) return {};
    const rows = await this.eventRepo.find({
      where: { inquiryId: In(ids), kind: 'NOTE' },
      order: { at: 'ASC' },
    });
    const out: Record<string, string> = {};
    for (const n of rows) {
      const t = new Date(n.at)
        .toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        .replace(',', '');
      out[n.inquiryId] = (out[n.inquiryId] || '') + `${t} - ${n.detail}; `;
    }
    return out;
  }

  // ─── Get all notes for an inquiry (oldest first) ───
  async getNotes(id: number) {
    return this.eventRepo.find({
      where: { inquiryId: id, kind: 'NOTE' },
      order: { at: 'ASC' },
    });
  }

  // ─── Per-pricer TAT scorecard ───
  // ─── Per-pricer TAT scorecard ───
  // ─── Per-pricer TAT scorecard ───
  async scorecard(days = 90): Promise<any[]> {
    const since = new Date(Date.now() - days * 86400000);

    // FIX 1: Group ONLY by quotedByKey to prevent duplicate names
    const rows = await this.inquiryRepo
      .createQueryBuilder('i')
      .select('i.quotedByKey', 'key')
      .addSelect('MAX(i.quotedByName)', 'name')
      .addSelect('COUNT(*)', 'n')
      .addSelect('AVG(i.tatSeconds)', 'avg_tat')
      .addSelect('COALESCE(SUM(i.followupCount), 0)', 'fu')
      .where('i.quotedAt IS NOT NULL')
      .andWhere('i.postedAt >= :since', { since })
      .groupBy('i.quotedByKey')
      .getRawMany();

    const out: any[] = [];
    for (const row of rows) {
      const key = row.key || '';
      let pricerName = row.name || '';

      // If quoted by coordinator (manual quote), show as Coordinator
      if (key === 'coordinator' || pricerName === 'coordinator') {
        pricerName = 'Coordinator';
      }

      // If name is empty or looks like a phone number, try to resolve it
      if (
        !pricerName ||
        pricerName === 'Unknown' ||
        /^\+?\d+$/.test(pricerName.replace(/\s/g, ''))
      ) {
        for (const [phone, member] of Object.entries(
          this.config.PRICING_TEAM,
        )) {
          const pNorm = phone.replace(/\D/g, '');
          const kNorm = key.replace(/\D/g, '');
          if (
            pNorm === kNorm ||
            (pNorm.length === 10 && '91' + pNorm === kNorm) ||
            (kNorm.length === 10 && '91' + kNorm === pNorm)
          ) {
            pricerName = member.name;
            break;
          }
        }
      }

      if (!pricerName) pricerName = 'Unknown';

      // FIX 2: Add date filter here to match the main query, fixing the 2500% bug
      const lags = (
        await this.inquiryRepo
          .createQueryBuilder('i')
          .where('i.archived = :archived', { archived: false })
          .andWhere('i.quotedByKey = :key', { key: key || '' })
          .andWhere('i.postedAt >= :since', { since })
          .getMany()
      )
        .map((i) => i.tatSeconds)
        .filter((v) => v != null)
        .sort((a, b) => a - b);

      const n = parseInt(row.n || '0');
      const median = lags.length ? lags[Math.floor(lags.length / 2)] : 0;

      out.push({
        pricer: pricerName,
        rates_given: n,
        median_tat_min: Math.round((median / 60) * 10) / 10,
        avg_tat_min:
          Math.round((parseFloat(row.avg_tat || '0') / 60) * 10) / 10,
        within_1hr_pct: n
          ? Math.round((100 * lags.filter((x) => x <= 3600).length) / n)
          : 0,
        over_4hr: lags.filter((x) => x > 4 * 3600).length,
        chases_received: parseInt(row.fu || '0'),
      });
    }

    out.sort((a, b) => a.median_tat_min - b.median_tat_min);
    return out;
  }

  // ─── Per-requester scorecard ───
  async requesterScorecard(days = 90): Promise<any[]> {
    const since = new Date(Date.now() - days * 86400000);

    const rows = await this.inquiryRepo.find({
      where: { archived: false },
      order: { postedAt: 'DESC' },
    });

    const filtered = rows.filter((r) => new Date(r.postedAt) >= since);

    const byRequester = new Map<
      string,
      {
        requester: string;
        total: number;
        quoted: number;
        open: number;
        tatSum: number;
        tatCount: number;
        pricers: Set<string>;
      }
    >();

    for (const i of filtered) {
      const key = i.requesterKey || 'unknown';
      if (!byRequester.has(key)) {
        byRequester.set(key, {
          requester: i.requesterName || 'Unknown',
          total: 0,
          quoted: 0,
          open: 0,
          tatSum: 0,
          tatCount: 0,
          pricers: new Set(),
        });
      }

      const entry = byRequester.get(key)!;
      entry.total++;

      if (i.status === 'QUOTED') {
        entry.quoted++;
        if (i.tatSeconds) {
          entry.tatSum += i.tatSeconds;
          entry.tatCount++;
        }
        if (i.assignedToName) {
          entry.pricers.add(i.assignedToName);
        }
      }

      if (i.status === 'OPEN') {
        entry.open++;
      }
    }

    const out: any[] = [];
    for (const [, entry] of byRequester) {
      out.push({
        requester: entry.requester,
        total_inquiries: entry.total,
        quoted_inquiries: entry.quoted, // FIXED: was "quoted"
        open_inquiries: entry.open, // FIXED: was "open"
        avg_tat_min: entry.tatCount
          ? Math.round((entry.tatSum / entry.tatCount / 60) * 10) / 10
          : 0,
        pricers_used_count: entry.pricers.size, // FIXED: was "pricers_used" (string)
        pricers_used: [...entry.pricers].join(', ') || '-', // kept for reference
      });
    }

    out.sort((a, b) => b.total_inquiries - a.total_inquiries);
    return out;
  }

  // async scorecard(days = 90): Promise<any[]> {
  //   const since = new Date(Date.now() - days * 86400000);

  //   const rows = await this.inquiryRepo
  //     .createQueryBuilder('i')
  //     .select('i.quotedByName', 'name')
  //     .addSelect('COUNT(*)', 'n')
  //     .addSelect('AVG(i.tatSeconds)', 'avg_tat')
  //     .addSelect('COALESCE(SUM(i.followupCount), 0)', 'fu')
  //     .where('i.quotedAt IS NOT NULL')
  //     .andWhere('i.postedAt >= :since', { since })
  //     .groupBy('i.quotedByName')
  //     .getRawMany();

  //   const out: any[] = [];
  //   for (const row of rows) {
  //     const lags = (
  //       await this.inquiryRepo.find({
  //         where: { quotedByName: row.name || '', archived: false },
  //       })
  //     )
  //       .map((i) => i.tatSeconds)
  //       .filter((v) => v != null)
  //       .sort((a, b) => a - b);

  //     const n = parseInt(row.n || '0');
  //     const median = lags.length ? lags[Math.floor(lags.length / 2)] : 0;

  //     out.push({
  //       pricer: row.name || 'Unknown',
  //       rates_given: n,
  //       median_tat_min: Math.round((median / 60) * 10) / 10,
  //       avg_tat_min:
  //         Math.round((parseFloat(row.avg_tat || '0') / 60) * 10) / 10,
  //       within_1hr_pct: n
  //         ? Math.round((100 * lags.filter((x) => x <= 3600).length) / n)
  //         : 0,
  //       over_4hr: lags.filter((x) => x > 4 * 3600).length,
  //       chases_received: parseInt(row.fu || '0'),
  //     });
  //   }

  //   out.sort((a, b) => a.median_tat_min - b.median_tat_min);
  //   return out;
  // }

  // ─── Export inquiries as CSV ───

  // async exportCsv(
  //   days = 400,
  //   startDate?: string,
  //   endDate?: string,
  // ): Promise<string> {
  //   let filtered: Inquiry[];

  //   if (startDate) {
  //     // ─── History page: use explicit date range ───
  //     const start = new Date(startDate);
  //     start.setHours(0, 0, 0, 0);

  //     const end = new Date(endDate || startDate);
  //     end.setHours(23, 59, 59, 999);

  //     const rows = await this.inquiryRepo
  //       .createQueryBuilder('i')
  //       .where('i.postedAt >= :start AND i.postedAt <= :end', { start, end })
  //       .andWhere('i.archived = false')
  //       .orderBy('i.postedAt', 'ASC')
  //       .getMany();
  //     filtered = rows;
  //   } else {
  //     // ─── Inquiries page: use days window ───
  //     const since = new Date(Date.now() - days * 86400000);
  //     const rows = await this.inquiryRepo.find({
  //       where: { archived: false },
  //       order: { postedAt: 'ASC' },
  //     });
  //     filtered = rows.filter((r) => new Date(r.postedAt) >= since);
  //   }

  //   if (!filtered.length) return 'No inquiries found for this date range.';

  //   const header =
  //     'ID,Requester,Lane,Vehicle Type,Spec,Posted At,Status,Assigned To,Quoted At,Quoted By,Rates,Previous Rates,TAT (min),Followups,Reminders,Match Basis';
  //   const lines = [header];

  //   // ─── Helper to resolve phone numbers to team member names ───
  //   const resolveName = (name: string, key: string | null): string => {
  //     if (name === 'coordinator') return 'Coordinator';
  //     if (name && !/^\+?\d+$/.test(name.replace(/\s/g, ''))) return name;

  //     const rawKey = key || '';
  //     for (const [phone, member] of Object.entries(this.config.PRICING_TEAM)) {
  //       // ─── FIX: Use normalizePhone for consistent matching ───
  //       if (
  //         this.config.normalizePhone(phone) ===
  //         this.config.normalizePhone(rawKey)
  //       ) {
  //         return member.name;
  //       }
  //     }
  //     return name || 'Unknown';
  //   };

  //   for (const i of filtered) {
  //     const tatMin = i.tatSeconds
  //       ? Math.round((i.tatSeconds / 60) * 10) / 10
  //       : '';

  //     const postedAt = i.postedAt
  //       ? new Date(i.postedAt).toLocaleString('en-IN', {
  //           timeZone: 'Asia/Kolkata',
  //           day: '2-digit',
  //           month: '2-digit',
  //           year: 'numeric',
  //           hour: '2-digit',
  //           minute: '2-digit',
  //           hour12: false,
  //         })
  //       : '';
  //     const quotedAt = i.quotedAt
  //       ? new Date(i.quotedAt).toLocaleString('en-IN', {
  //           timeZone: 'Asia/Kolkata',
  //           day: '2-digit',
  //           month: '2-digit',
  //           year: 'numeric',
  //           hour: '2-digit',
  //           minute: '2-digit',
  //           hour12: false,
  //         })
  //       : '';

  //     const quotedBy = resolveName(i.quotedByName || '', i.quotedByKey);
  //     const assignedTo = resolveName(i.assignedToName || '', i.assignedToKey);

  //     const cells = [
  //       i.id,
  //       i.requesterName || '',
  //       i.lane || '',
  //       i.vehicleType || '',
  //       i.spec || '',
  //       postedAt,
  //       i.status || '',
  //       assignedTo,
  //       quotedAt,
  //       quotedBy,
  //       i.quotedRates || '',
  //       i.previousRates || '',
  //       tatMin,
  //       i.followupCount || 0,
  //       i.reminderCount || 0,
  //       i.matchBasis || '',
  //     ];

  //     const escaped = cells.map(
  //       (c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`,
  //     );
  //     lines.push(escaped.join(','));
  //   }

  //   return lines.join('\n');
  // }

  // Export CSV by Date Range From and To
  // // ─── Export inquiries by explicit date range (History page) ───
  // async exportCsvByDateRange(
  //   startDate: string,
  //   endDate: string,
  // ): Promise<string> {
  //   const start = new Date(startDate);
  //   start.setHours(0, 0, 0, 0);

  //   const end = new Date(endDate);
  //   end.setHours(23, 59, 59, 999);

  //   const inquiries = await this.inquiryRepo
  //     .createQueryBuilder('i')
  //     .where('i.postedAt >= :start AND i.postedAt <= :end', { start, end })
  //     .andWhere('i.archived = false')
  //     .orderBy('i.postedAt', 'ASC')
  //     .getMany();

  //   if (!inquiries.length) return 'No inquiries found for this date range.';

  //   const header =
  //     'ID,Requester,Lane,Vehicle Type,Spec,Posted At,Status,Assigned To,Quoted At,Quoted By,Rates,Previous Rates,TAT (min),Followups,Reminders,Match Basis';
  //   const lines = [header];

  //   // ─── Helper to resolve phone numbers to team member names ───
  //   const resolveName = (name: string, key: string | null): string => {
  //     if (name === 'coordinator') return 'Coordinator';
  //     if (name && !/^\+?\d+$/.test(name.replace(/\s/g, ''))) return name;

  //     const rawKey = key || '';
  //     for (const [phone, member] of Object.entries(this.config.PRICING_TEAM)) {
  //       if (
  //         this.config.normalizePhone(phone) ===
  //         this.config.normalizePhone(rawKey)
  //       ) {
  //         return member.name;
  //       }
  //     }
  //     return name || 'Unknown';
  //   };

  //   for (const i of inquiries) {
  //     const tatMin = i.tatSeconds
  //       ? Math.round((i.tatSeconds / 60) * 10) / 10
  //       : '';

  //     const postedAt = i.postedAt
  //       ? new Date(i.postedAt).toLocaleString('en-IN', {
  //           timeZone: 'Asia/Kolkata',
  //           day: '2-digit',
  //           month: '2-digit',
  //           year: 'numeric',
  //           hour: '2-digit',
  //           minute: '2-digit',
  //           hour12: false,
  //         })
  //       : '';
  //     const quotedAt = i.quotedAt
  //       ? new Date(i.quotedAt).toLocaleString('en-IN', {
  //           timeZone: 'Asia/Kolkata',
  //           day: '2-digit',
  //           month: '2-digit',
  //           year: 'numeric',
  //           hour: '2-digit',
  //           minute: '2-digit',
  //           hour12: false,
  //         })
  //       : '';

  //     const quotedBy = resolveName(i.quotedByName || '', i.quotedByKey);
  //     const assignedTo = resolveName(i.assignedToName || '', i.assignedToKey);

  //     const cells = [
  //       i.id,
  //       i.requesterName || '',
  //       i.lane || '',
  //       i.vehicleType || '',
  //       i.spec || '',
  //       postedAt,
  //       i.status || '',
  //       assignedTo,
  //       quotedAt,
  //       quotedBy,
  //       i.quotedRates || '',
  //       i.previousRates || '',
  //       tatMin,
  //       i.followupCount || 0,
  //       i.reminderCount || 0,
  //       i.matchBasis || '',
  //     ];

  //     const escaped = cells.map(
  //       (c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`,
  //     );
  //     lines.push(escaped.join(','));
  //   }

  //   return lines.join('\n');
  // }

  // Recent commented
  // ─── Export inquiries by explicit date range (History page) ───
  async exportCsvByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<string> {
    // const start = new Date(startDate);
    // start.setHours(0, 0, 0, 0);

    // const end = new Date(endDate);
    // end.setHours(23, 59, 59, 999);

    // ─── Date parsing: handle missing endDate + explicit local time ───
    const start = new Date(startDate + 'T00:00:00');
    const end = endDate
      ? new Date(endDate + 'T23:59:59.999')
      : new Date(startDate + 'T23:59:59.999');

    const inquiries = await this.inquiryRepo
      .createQueryBuilder('i')
      .where('i.postedAt >= :start AND i.postedAt <= :end', { start, end })
      .andWhere('i.archived = false')
      .orderBy('i.postedAt', 'ASC')
      .getMany();

    if (!inquiries.length) return 'No inquiries found for this date range.';

    // ─── Aggregate events: reminders + coordinator notes for these inquiries ───
    const ids = inquiries.map((i) => i.id);
    const evtRows = await this.eventRepo
      .createQueryBuilder('e')
      .select('e.inquiryId', 'inquiryId')
      .addSelect('e.kind', 'kind')
      .addSelect('e.at', 'at')
      .addSelect('e.detail', 'detail')
      .where('e.inquiryId IN (:...ids)', { ids })
      .andWhere('e.kind IN (:...kinds)', {
        kinds: ['REMINDER_WA', 'REMINDER_EMAIL', 'NOTE'],
      })
      .orderBy('e.at', 'ASC')
      .getRawMany();

    const waReminders: Record<number, number> = {};
    const emailReminders: Record<number, number> = {};
    const notesByInquiry: Record<number, string> = {};
    for (const r of evtRows) {
      const iid = Number(r.inquiryId);
      if (r.kind === 'REMINDER_WA') {
        waReminders[iid] = (waReminders[iid] || 0) + 1;
      } else if (r.kind === 'REMINDER_EMAIL') {
        emailReminders[iid] = (emailReminders[iid] || 0) + 1;
      } else if (r.kind === 'NOTE') {
        const t = new Date(r.at)
          .toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
          .replace(',', '');
        notesByInquiry[iid] =
          (notesByInquiry[iid] || '') + `${t} — ${r.detail}; `;
      }
    }

    const header =
      'ID,Requester,Lane,Vehicle Type,Spec,Posted At,Status,Assigned To,Quoted At,Quoted By,Rates,Previous Rates,TAT (min),Followups,WA Reminders,Email Reminders,Match Basis,Coordinator Notes,Close Reason';

    const lines = [header];

    // ─── Helper to resolve phone numbers to team member names ───
    const resolveName = (name: string, key: string | null): string => {
      if (name === 'coordinator') return 'Coordinator';
      if (name && !/^\+?\d+$/.test(name.replace(/\s/g, ''))) return name;

      const rawKey = key || '';
      for (const [phone, member] of Object.entries(this.config.PRICING_TEAM)) {
        if (
          this.config.normalizePhone(phone) ===
          this.config.normalizePhone(rawKey)
        ) {
          return member.name;
        }
      }
      return name || 'Unknown';
    };

    for (const i of inquiries) {
      const tatMin = i.tatSeconds
        ? Math.round((i.tatSeconds / 60) * 10) / 10
        : '';

      const postedAt = i.postedAt
        ? new Date(i.postedAt).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '';
      const quotedAt = i.quotedAt
        ? new Date(i.quotedAt).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '';

      const quotedBy = resolveName(i.quotedByName || '', i.quotedByKey);
      const assignedTo = resolveName(i.assignedToName || '', i.assignedToKey);

      const cells = [
        i.id,
        i.requesterName || '',
        i.lane || '',
        i.vehicleType || '',
        i.spec || '',
        postedAt,
        i.status || '',

        assignedTo,
        quotedAt,
        quotedBy,
        i.quotedRates || '',
        i.previousRates || '',
        tatMin,
        i.followupCount || 0,
        waReminders[i.id] || 0, // ← WA Reminders (counted from events)
        emailReminders[i.id] || 0, // ← Email Reminders (counted from events)
        i.matchBasis || '',

        notesByInquiry[i.id] || '', // ← Coordinator Notes timeline
        i.closeReason || '', // ← ADD: "withdrawn. self rated" etc.
      ];

      const escaped = cells.map(
        (c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`,
      );
      lines.push(escaped.join(','));
    }

    return lines.join('\n');
  }

  // ─── Daily details: today's inquiries + rate history ───
  // Shows all inquiries posted on a given date, with their current rate and full rate-change history
  async dailyDetails(dateStr?: string): Promise<any> {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all inquiries posted on that day
    const inquiries = await this.inquiryRepo
      .createQueryBuilder('i')
      .where('i.postedAt >= :start AND i.postedAt <= :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .andWhere('i.archived = false')
      .orderBy('i.postedAt', 'ASC')
      .getMany();

    // For each inquiry, get all QUOTED and RATE_CHANGED events
    const inquiryIds = inquiries.map((i) => i.id);
    let rateEvents: Event[] = [];
    if (inquiryIds.length) {
      rateEvents = await this.eventRepo
        .createQueryBuilder('e')
        .where('e.inquiryId IN (:...ids)', { ids: inquiryIds })
        .andWhere('e.kind IN (:...kinds)', {
          kinds: ['QUOTED', 'RATE_CHANGED'],
        })
        .orderBy('e.at', 'ASC')
        .getMany();
    }

    // Group rate events by inquiryId
    const eventsByInquiry: Record<number, Event[]> = {};
    for (const ev of rateEvents) {
      if (!eventsByInquiry[ev.inquiryId]) eventsByInquiry[ev.inquiryId] = [];
      eventsByInquiry[ev.inquiryId].push(ev);
    }

    // Build the response
    const result = inquiries.map((inq) => {
      const events = eventsByInquiry[inq.id] || [];
      const rateHistory = events.map((ev) => ({
        kind: ev.kind,
        detail: ev.detail,
        actor: ev.actor,
        at: ev.at?.toISOString(),
      }));

      return {
        id: inq.id,
        requester: inq.requesterName || inq.requesterKey,
        lane: inq.lane,
        vehicle_type: inq.vehicleType || '',
        spec: inq.spec || '',
        posted_at: inq.postedAt?.toISOString(),
        status: inq.status,
        assigned_to: inq.assignedToName || '',
        current_rate: inq.quotedRates || '',
        quoted_by: inq.quotedByName || '',
        quoted_at: inq.quotedAt?.toISOString() || null,
        tat: inq.tatSeconds
          ? Math.round((inq.tatSeconds / 60) * 10) / 10 + ' min'
          : '-',
        rate_history: rateHistory,
        has_rate_change: events.some((ev) => ev.kind === 'RATE_CHANGED'),
      };
    });

    return {
      date: startOfDay.toISOString().split('T')[0],
      total_inquiries: result.length,
      quoted_count: result.filter((r) => r.current_rate).length,
      rate_changed_count: result.filter((r) => r.has_rate_change).length,
      inquiries: result,
    };
  }

  // ─── Sync status (last message time, counts) ───
  async syncStatus(): Promise<any> {
    const totalMessages = await this.messageRepo.count({
      where: { archived: false },
    });
    const totalInquiries = await this.inquiryRepo.count({
      where: { archived: false },
    });
    const openCount = await this.inquiryRepo.count({
      where: { status: 'OPEN', archived: false },
    });

    return {
      server_time: new Date().toISOString(),
      total_messages: totalMessages,
      total_inquiries: totalInquiries,
      open_inquiries: openCount,
    };
  }

  // ─── Recent messages feed ───
  async recentMessages(limit = 15): Promise<any[]> {
    const rows = await this.messageRepo.find({
      where: { archived: false },
      order: { ingestedAt: 'DESC' },
      take: Math.min(limit, 500),
    });

    return rows.map((m) => ({
      id: m.id,
      sender_name: m.senderName,
      sender_key: m.senderKey,
      body: (m.body || '').slice(0, 200),
      posted_at: m.postedAt?.toISOString(),
      ingested_at: m.ingestedAt?.toISOString(),
      source: m.source,
      classification: m.classification || 'PENDING',
      inquiry_id: m.inquiryId,
    }));
  }

  // ─── Unseen message count (for notification badge) ───
  async unseenCount(sinceId = 0): Promise<any> {
    const latest = await this.messageRepo.findOne({
      where: { archived: false },
      order: { id: 'DESC' },
    });

    const count = sinceId
      ? await this.messageRepo.count({ where: { archived: false } })
      : 0;

    return {
      latest_id: latest?.id || 0,
      count,
      latest: latest
        ? {
            id: latest.id,
            sender_name: latest.senderName,
            body: (latest.body || '').slice(0, 160),
            classification: latest.classification || 'PENDING',
            ingested_at: latest.ingestedAt?.toISOString(),
          }
        : null,
    };
  }

  // ─── Manually classify a message (override parser) ───
  async manualClassify(messageId: number, target: string): Promise<any> {
    const msg = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('message not found');

    if (target !== 'INQUIRY' && target !== 'OTHER') {
      throw new BadRequestException("target must be 'INQUIRY' or 'OTHER'");
    }

    if (msg.inquiryId != null) {
      throw new BadRequestException(
        'already linked to an inquiry — cannot reclassify',
      );
    }

    if (target === 'INQUIRY') {
      const inq = await this.matcher.forceClassifyAsInquiry(msg);
      await this.messageRepo.save(msg);
      return {
        id: msg.id,
        classification: msg.classification,
        inquiry_id: inq.id,
      };
    }

    msg.classification = 'OTHER';
    await this.messageRepo.save(msg);
    return { id: msg.id, classification: msg.classification, inquiry_id: null };
  }
}

// serialize(inq) — private helper
// Converts an Inquiry entity into a plain JSON object for the API response. It calculates age_minutes on the fly and formats the TAT display string.

// findAll(status?, days) — GET /inquiries
// Queries inquiries from the last N days, optionally filtered by status. Orders by postedAt DESC (newest first), limited to 1000 rows.

// manualQuote(id, rates, quotedBy, note) — POST /inquiries/:id/quote
// When a coordinator manually records a rate (instead of the system matching it from WhatsApp), this method:

// Sets status to QUOTED
// Records who quoted it and the rate values
// Computes TAT seconds
// Creates a QUOTED event with match_basis: 'manual'
// reassign(id, assigneeKey, by) — POST /inquiries/:id/reassign
// Validates the new assignee is a real pricing team member, updates the inquiry, and logs a REASSIGNED event.

// adhocRemind(id, channel, note) — POST /inquiries/:id/remind
// Sends an immediate reminder (WhatsApp or email) without waiting for the cron job. Formats the nudge template, sends it, and logs the event.

// close(id, reason, note) — POST /inquiries/:id/close
// Closes an inquiry as won/lost/withdrawn. Maps the reason to the status enum (CLOSED_WON, CLOSED_LOST, WITHDRAWN).

// scorecard(days) — GET /scorecard
// Aggregates TAT performance per pricing team member. For each person who has quoted rates, it calculates:

// rates_given — total count
// median_tat_min — median time to quote
// avg_tat_min — average time to quote
// within_1hr_pct — percentage quoted within 1 hour
// over_4hr — count of inquiries that took over 4 hours
// chases_received — how many follow-ups they got
// exportCsv(days) — GET /export.csv
// Generates a CSV string of all inquiries. Used by the frontend download button.

// manualClassify(messageId, target) — POST /messages/:id/classify
// When the parser misclassifies a message, the coordinator can manually override it. If target is INQUIRY, it calls matcher.forceClassifyAsInquiry() which creates a proper inquiry from the message.
