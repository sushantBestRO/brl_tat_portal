import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { Event } from '../entities/event.entity';
import { AppConfigService } from '../config/app-config.service';
import { NotifyService } from '../notify/notify.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    private config: AppConfigService,
    private notify: NotifyService,
  ) {}

  // ─── Check if current time is within quiet hours (21:00 - 08:00) ───
  // During quiet hours, we don't send messages, but we still log events.
  private inQuietHours(now: Date): boolean {
    const qh = this.config.CONFIG.quiet_hours || {};
    try {
      const startParts = (qh.start || '21:00').split(':').map(Number);
      const endParts = (qh.end || '08:00').split(':').map(Number);
      const start = startParts[0] * 60 + startParts[1];
      const end = endParts[0] * 60 + endParts[1];
      const t = now.getHours() * 60 + now.getMinutes();

      // Handle overnight wrap (e.g., 21:00 to 08:00)
      return start > end ? t >= start || t < end : start <= t && t < end;
    } catch {
      return false;
    }
  }

  // ─── Fill in template placeholders ───
  // Replaces {inquiry_id}, {lane}, {requester}, {age_min}
  private fmtTemplate(template: string, inq: Inquiry, ageMin: number): string {
    return template
      .replace(/\{inquiry_id\}/g, String(inq.id))
      .replace(/\{lane\}/g, inq.lane || '?')
      .replace(/\{requester\}/g, inq.requesterName || inq.requesterKey)
      .replace(/\{age_min\}/g, String(ageMin))
      .trim();
  }

  // ─── When was the last WhatsApp reminder sent for this inquiry? ───
  private async lastReminderAt(inquiryId: number): Promise<Date | null> {
    const ev = await this.eventRepo.findOne({
      where: { inquiryId, kind: 'REMINDER_WA' },
      order: { at: 'DESC' },
    });
    return ev ? ev.at : null;
  }

  // ─── Has a call task already been created for this inquiry? ───
  // We only create one call task per inquiry (not every tick).
  private async hasCallTask(inquiryId: number): Promise<boolean> {
    return (
      (await this.eventRepo.count({
        where: { inquiryId, kind: 'CALL_TASK' },
      })) > 0
    );
  }

  // ─── MAIN: One scheduler pass over all OPEN inquiries ───
  // This is called automatically every 60 seconds by the cron module.
  async tick(): Promise<void> {
    const tat = this.config.CONFIG.tat || {};
    const amber = tat.amber_minutes || 60;
    const red = tat.red_minutes || 120;
    const repeat = tat.repeat_minutes || 60;
    const maxRem = tat.max_reminders || 5;

    const now = new Date();
    const quiet = this.inQuietHours(now);

    const openInqs = await this.inquiryRepo.find({
      where: { status: 'OPEN', archived: false },
    });

    for (const inq of openInqs) {
      const ageMin = Math.floor(
        (now.getTime() - new Date(inq.postedAt).getTime()) / 60000,
      );

      // Skip if not yet amber
      if (ageMin < amber) continue;

      // ─── AMBER: WhatsApp nudge (repeating) ───
      if ((inq.reminderCount || 0) < maxRem) {
        const last = await this.lastReminderAt(inq.id);
        const due =
          !last || now.getTime() - last.getTime() >= repeat * 60000;

        if (due) {
          const text = this.fmtTemplate(
            this.config.CONFIG.templates?.nudge_pricer ||
              'TAT alert #{inquiry_id}',
            inq,
            ageMin,
          );

          // Don't send during quiet hours, just log it
          const sent = quiet
            ? false
            : await this.notify.sendWhatsapp(inq.assignedToKey || '', text);

          inq.reminderCount = (inq.reminderCount || 0) + 1;

          const prefix = quiet
            ? 'suppressed (quiet hours): '
            : sent
            ? ''
            : 'dry-run: ';

          await this.eventRepo.save(
            this.eventRepo.create({
              inquiryId: inq.id,
              kind: 'REMINDER_WA',
              actor: 'system',
              channel: 'whatsapp',
              detail: prefix + text,
            }),
          );
        }
      }

      // ─── RED: Call task + Email (once) ───
      if (ageMin >= red && !(await this.hasCallTask(inq.id))) {
        const coordName =
          this.config.SETTINGS['coordinator_name'] || 'coordinator';
        const coordEmail = this.config.SETTINGS['coordinator_email'] || '';

        // Create call task
        await this.eventRepo.save(
          this.eventRepo.create({
            inquiryId: inq.id,
            kind: 'CALL_TASK',
            actor: 'system',
            channel: 'call',
            detail: `call task for ${coordName}: chase rate for '${inq.lane}' (assigned ${inq.assignedToName}, ${ageMin} min old)`,
          }),
        );

        // Send escalation email
        const subj = this.fmtTemplate(
          this.config.CONFIG.templates?.escalation_email_subject ||
            'RED: inquiry #{inquiry_id}',
          inq,
          ageMin,
        );
        const body = this.fmtTemplate(
          this.config.CONFIG.templates?.escalation_email_body || '',
          inq,
          ageMin,
        );

        const sent = quiet
          ? false
          : await this.notify.sendEmail(coordEmail, subj, body);

        const prefix = quiet
          ? 'suppressed (quiet hours): '
          : sent
          ? ''
          : 'dry-run: ';

        await this.eventRepo.save(
          this.eventRepo.create({
            inquiryId: inq.id,
            kind: 'REMINDER_EMAIL',
            actor: 'system',
            channel: 'email',
            detail: prefix + subj,
          }),
        );
      }
    }

    // Save updated reminder counts
    await this.inquiryRepo.save(openInqs);
  }
}


// The tick() method — runs every 60 seconds
// For each OPEN inquiry, it calculates ageMin (how old the inquiry is). Then:



// ageMin < 60 (amber)
//   → Skip, do nothing

// ageMin >= 60 AND reminders < 5 AND last reminder was > 60 min ago
//   → AMBER: Send WhatsApp nudge to assigned pricing person
//   → If quiet hours: don't send, log "suppressed"
//   → Increment reminderCount
//   → Create Event(REMINDER_WA)

// ageMin >= 120 (red) AND no call task exists yet
//   → RED: Create call task for coordinator (Jagruti)
//   → Send escalation email to coordinator
//   → Create Event(CALL_TASK)
//   → Create Event(REMINDER_EMAIL)
// Quiet hours logic
// typescript


// return start > end ? t >= start || t < end : start <= t && t < end;
// If quiet hours are 21:00 to 08:00, that spans midnight. So:

// 21:00 > 08:00 (start > end) → t >= 21:00 OR t < 08:00
// This correctly catches 22:00, 23:00, 01:00, 07:00 etc.
// During quiet hours, sent is set to false, and the event detail is prefixed with "suppressed (quiet hours): " — so the audit trail shows why nothing was sent.

// Why we check hasCallTask()
// We only create ONE call task per inquiry. Without this check, every 60 seconds a new call task would be created. The hasCallTask() method queries the events table to see if a CALL_TASK event already exists for this inquiry.

