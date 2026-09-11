import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { Event } from '../entities/event.entity';
import { AppConfigService } from '../config/app-config.service';
import { ChatMessage } from 'src/entities';
import { IngestService } from 'src/ingest/ingest.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  // Add this at the top of the class, after the logger line
  private lastPollStatus: {
    connected: boolean;
    lastChecked: Date | null;
    lastError: string | null;
  } = {
    connected: false,
    lastChecked: null,
    lastError: null,
  };

  getConnectionStatus() {
    return this.lastPollStatus;
  }

  constructor(
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(ChatMessage) private messageRepo: Repository<ChatMessage>,

    private config: AppConfigService,
    private ingest: IngestService,
  ) {}

  // ─── Run every 60 seconds ───
  @Cron(CronExpression.EVERY_MINUTE)
  //newly  added
  async tick() {
    // if (process.env.NODE_ENV !== 'production') {
    //   this.logger.log('Scheduler disabled in development mode.');
    //   return;
    // }
    const amberMin = this.config.CONFIG?.tat?.amber_minutes || 60;
    const redMin = this.config.CONFIG?.tat?.red_minutes || 120;
    const maxReminders = this.config.CONFIG?.tat?.max_reminders || 5;
    const repeatMin = this.config.CONFIG?.tat?.repeat_minutes || 60;
    // ─── Auto-archive inquiries older than 30 days ───
    const cutoff = new Date(Date.now() - 30 * 86400000);
    await this.inquiryRepo
      .createQueryBuilder()
      .update()
      .set({ archived: true })
      .where('postedAt < :cutoff', { cutoff })
      .andWhere('archived = false')
      .execute();

    // Don't send reminders during quiet hours (21:00 - 08:00 IST)
    if (this.isQuietHours()) return;

    const now = new Date();

    // ─── Find OPEN inquiries that are overdue ───
    const overdue = await this.inquiryRepo.find({
      where: {
        status: 'OPEN',
        archived: false,
      },
      order: { postedAt: 'ASC' },
    });

    if (!overdue.length) return;

    let remindersSent = 0;
    let escalations = 0;

    for (const inq of overdue) {
      const ageMin = Math.round(
        (now.getTime() - new Date(inq.postedAt).getTime()) / 60000,
      );

      // Skip if already at max reminders
      if (inq.reminderCount >= maxReminders) continue;

      // Check if enough time passed since last reminder
      const lastReminder = await this.eventRepo.findOne({
        where: { inquiryId: inq.id, kind: 'REMINDER' },
        order: { at: 'DESC' },
      });

      if (lastReminder) {
        const sinceLast = Math.round(
          (now.getTime() - new Date(lastReminder.at).getTime()) / 60000,
        );
        if (sinceLast < repeatMin) continue;
      }

      // ─── AMBER: 60+ minutes → WhatsApp reminder ───
      if (ageMin >= amberMin && ageMin < redMin) {
        await this.sendAmberReminder(inq, ageMin);
        remindersSent++;
      }

      // ─── RED: 120+ minutes → Email escalation to coordinator ───
      if (ageMin >= redMin) {
        await this.sendRedEscalation(inq, ageMin);
        escalations++;
      }
    }

    if (remindersSent > 0 || escalations > 0) {
      this.logger.log(
        `Scheduler tick: ${remindersSent} AMBER reminders sent, ${escalations} RED escalations sent.`,
      );
    }
  }

  // ─── Poll Maytapi for new messages from the WhatsApp group ───
  // (CronExpression.EVERY_MINUTE)
  // @Cron('*/15 * * * * *')
  // async pollMaytapiMessages() {
  //   const apiKey = this.config.SETTINGS?.['maytapi_api_key'] || '';
  //   const productId = this.config.SETTINGS?.['maytapi_product_id'] || '';
  //   const phoneId = this.config.SETTINGS?.['maytapi_phone_id'] || '';
  //   const groupKey = this.config.CONFIG?.groups?.[0]?.group_key || '';

  //   this.logger.log(`[Maytapi Poll] Checking... API=${apiKey ? 'YES' : 'NO'}, PRODUCT=${productId ? 'YES' : 'NO'}, PHONE=${phoneId ? 'YES' : 'NO'}, GROUP=${groupKey || 'NONE'}`);

  //   if (!apiKey || !productId || !phoneId || !groupKey) {
  //     this.logger.warn(`[Maytapi Poll] Skipped — missing config. Group key: ${groupKey || 'EMPTY'}`);
  //     return;
  //   }

  //   const lastMsg = await this.messageRepo.findOne({
  //     where: { groupKey },
  //     order: { postedAt: 'DESC' },
  //   });

  //   const lastTs = lastMsg ? lastMsg.postedAt.getTime() : 0;
  //   this.logger.log(`[Maytapi Poll] Last message timestamp: ${lastMsg ? lastMsg.postedAt.toISOString() : 'none'}`);

  //   try {
  //     const url = `https://api.maytapi.com/api/${productId}/${phoneId}/getMessages/${groupKey}`;
  //     this.logger.log(`[Maytapi Poll] Calling: ${url}`);

  //     const resp = await fetch(url, {
  //       method: 'GET',
  //       headers: { 'x-maytapi-key': apiKey },
  //     });

  //     const data = await resp.json();
  //     this.logger.log(`[Maytapi Poll] Response status: ${resp.status}`);
  //     this.logger.log(`[Maytapi Poll] Response keys: ${Object.keys(data || {}).join(', ')}`);
  //     this.logger.log(`[Maytapi Poll] Response preview: ${JSON.stringify(data).slice(0, 500)}`);

  //     const messages = data?.messages || data?.data?.messages || data?.data || [];
  //     this.logger.log(`[Maytapi Poll] Found ${Array.isArray(messages) ? messages.length : 'NOT-ARRAY'} messages`);

  //     let newCount = 0;
  //     for (const m of messages) {
  //       const msgTs = new Date(parseInt(m.timestamp) * 1000);
  //       if (msgTs.getTime() <= lastTs) continue;

  //       // Skip messages sent by us (fromMe = true)
  //       // if (m.fromMe) continue;

  //       // Maytapi format: message.text is the body, uid is the sender
  //       const body = m.message?.text || m.message?.caption || '';
  //       if (!body) continue;

  //       // Look up sender name from users object
  //       const senderUid = m.uid || '';
  //       const senderName = data?.data?.users?.[senderUid]?.name || senderUid.split('@')[0] || null;

  //       await this.ingest.ingestMessage({
  //         groupKey: groupKey,
  //         senderKey: senderUid.split('@')[0] || '',
  //         senderName: senderName,
  //         body: body,
  //         postedAt: msgTs,
  //         waMessageId: m.message?.id || undefined,
  //         source: 'maytapi',
  //       });
  //       newCount++;
  //     }

  //     if (newCount > 0) {
  //       this.logger.log(`[Maytapi Poll] Ingested ${newCount} new message(s) from group ${groupKey}`);
  //     } else {
  //       this.logger.log(`[Maytapi Poll] No new messages found.`);
  //     }
  //   } catch (err: any) {
  //     this.logger.error(`[Maytapi Poll] Error: ${err.message}`);
  //   }
  // }

  // ─── Poll Maytapi for new messages from the WhatsApp group ───
  @Cron('*/30 * * * * *')
  async pollMaytapiMessages() {
    // if (process.env.NODE_ENV !== 'production') {
    //   return;
    // }
    const apiKey = this.config.SETTINGS?.['maytapi_api_key'] || '';
    const productId = this.config.SETTINGS?.['maytapi_product_id'] || '';
    const phoneId = this.config.SETTINGS?.['maytapi_phone_id'] || '';
    // const groupKey = this.config.CONFIG?.groups?.[0]?.group_key || '';
    const groupKey =
      this.config.SETTINGS?.['group_key'] ||
      this.config.CONFIG?.groups?.[0]?.group_key ||
      '';
    this.logger.log(`[Maytapi Poll] Using group key: ${groupKey}`);

    if (!apiKey || !productId || !phoneId || !groupKey) {
      this.lastPollStatus = {
        connected: false,
        lastChecked: new Date(),
        lastError: 'Missing Maytapi configuration',
      };
      return;
    }

    try {
      // const url = `https://api.maytapi.com/api/${productId}/${phoneId}/getMessages/${groupKey}`;
      const url = `https://api.maytapi.com/api/${productId}/${phoneId}/getMessages/${groupKey}?page=1&limit=100`;

      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'x-maytapi-key': apiKey },
      });

      const data = await resp.json().catch(async () => {
        const text = await resp.text();
        this.logger.error(
          `[Maytapi Poll] Non-JSON response (status ${resp.status}): ${text.slice(0, 300)}`,
        );
        return null;
      });

      if (!data) return;
      //  this.logger.log(`[Maytapi Poll] Response: success=${data.success}, messages=${data?.data?.messages?.length || 0}, error=${data?.data?.message || 'none'}`);
      if (data.success === false) {
        this.logger.error(
          `[Maytapi Poll] Maytapi returned error: ${JSON.stringify(data)}`,
        );
        this.lastPollStatus = {
          connected: false,
          lastChecked: new Date(),
          lastError: data.message || 'Maytapi returned error',
        };
      } else {
        this.logger.log(
          `[Maytapi Poll] Response: success=${data.success}, messages=${data?.data?.messages?.length || 0}`,
        );
        this.lastPollStatus = {
          connected: true,
          lastChecked: new Date(),
          lastError: null,
        };
      }

      const messages = data?.data?.messages || [];
      const users = data?.data?.users || {};

      let newCount = 0;
      for (const m of messages) {
        this.logger.log(
          `[Maytapi Poll] Full message: ${JSON.stringify(m).slice(0, 500)}`,
        );

        // Skip messages sent by us (fromMe = true)
        if (m.fromMe) {
          this.logger.log(`[Maytapi Poll] Skipping: fromMe=true`);
          continue;
        }

        const body = m.message?.text || m.message?.caption || '';
        if (!body) {
          this.logger.log(`[Maytapi Poll] Skipping: empty body`);
          continue;
        }

        // const senderUid = m.uid || '';
        // const senderName =
        //   users[senderUid]?.name || senderUid.split('@')[0] || null;

        // new updation
        const senderUid = m.uid || '';

        // ─── FIX: Resolve sender name properly ───
        let senderName: string | null = null;
        let senderKey: string = '';

        if (senderUid && !senderUid.includes('g.us')) {
          // senderName = users[senderUid]?.name || null; 10/09/2026
          senderKey = senderUid.split('@')[0] || '';

          // 1. Prefer the WhatsApp push name (most accurate, full name)
          senderName = m.pushname || m.sender_name || m.name || null;

          // 2. Fall back to cached users list only if push name is missing
          if (!senderName) {
            senderName = users[senderUid]?.name || null;
          }
          // 3. Last resort: use the phone number
          if (!senderName && senderKey) {
            senderName = senderKey;
          }
        } else {
          // Group message sender
          senderName = m.pushname || m.sender_name || m.name || null;
          senderKey = (m.phone || m.sender_phone || '').replace(/\D/g, '');

          if (!senderName && senderKey) {
            senderName = senderKey;
          }
        }

        if (!senderKey) {
          this.logger.log(`[Maytapi Poll] Skipping: could not resolve sender`);
          continue; // <-- Fixed the 'c' typo here too
        }

        const oneHourAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const msgTime = new Date(parseInt(m.timestamp) * 1000);
        this.logger.log(
          `[Maytapi Poll] Message time: ${msgTime.toISOString()}, oneHourAgo: ${new Date(oneHourAgo).toISOString()}`,
        );

        if (msgTime.getTime() < oneHourAgo) {
          this.logger.log(`[Maytapi Poll] Skipping: older than 1 hour`);
          continue;
        }

        // const waId = m.message?.id || undefined;

        // const result = await this.ingest.ingestMessage({
        //   groupKey: groupKey,
        //   senderKey: senderUid.split('@')[0] || '',
        //   senderName: senderName,
        //   body: body,
        //   postedAt: msgTime,
        //   waMessageId: waId,
        //   source: 'maytapi',
        // });

        const waId = m.message?.id || undefined;

        // Extract quoted message (WhatsApp reply feature)
        // const quotedMsg = m.quotedMsg || null;
        // Extract quoted message (WhatsApp reply feature)
        // Maytapi puts the quoted message inside m.message.quoted
        const quotedMsg = m.message?.quoted || m.quotedMsg || null;
        // const quotedText = quotedMsg?.text || quotedMsg?.caption || null;
        const quotedText =
          quotedMsg?.text ||
          quotedMsg?.caption ||
          quotedMsg?.message?.text ||
          null;

        const quotedWaId = quotedMsg?.id || null;

        const result = await this.ingest.ingestMessage({
          groupKey: groupKey,
          senderKey: senderKey, // <--- Changed from senderUid.split('@')[0]
          senderName: senderName || undefined, // <--- Changed from senderName
          body: body,
          postedAt: msgTime,
          waMessageId: waId,
          source: 'maytapi',
          quotedText: quotedText,
          quotedWaId: quotedWaId,
        });

        // this.logger.log(
        //   `[Maytapi Poll] Ingest result: ${result ? 'INGESTED' : 'SKIPPED (duplicate)'}`,
        // );
        this.logger.log(
          `[Maytapi Poll] Quoted message → id=${quotedWaId || 'NONE'}, text="${quotedText || ''}"`,
        );

        if (result) newCount++;
      }

      if (newCount > 0) {
        this.logger.log(
          `[Maytapi Poll] Ingested ${newCount} new message(s) from group ${groupKey}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`[Maytapi Poll] Error: ${err.message}`);
      this.lastPollStatus = {
        connected: false,
        lastChecked: new Date(),
        lastError: err.message,
      };
    }
  }

  // // ─── Send AMBER WhatsApp reminder to the pricer ───
  // private async sendAmberReminder(inq: Inquiry, ageMin: number) {
  //   const pricerName = inq.assignedToName || 'Unassigned';
  //   const pricerPhone = inq.assignedToKey || '';

  //   const message =
  //     `⏰ RATE REMINDER (${ageMin} min)\n\n` +
  //     `Lane: ${inq.lane}\n` +
  //     `Requester: ${inq.requesterName}\n` +
  //     `Posted: ${new Date(inq.postedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
  //     `Please quote the rate ASAP.`;

  //   // Try to send via WhatsApp provider
  //   const waSent = await this.sendWhatsApp(pricerPhone, message);

  //   // Log the reminder event
  //   await this.eventRepo.save(
  //     this.eventRepo.create({
  //       inquiryId: inq.id,
  //       at: new Date(),
  //       kind: 'REMINDER',
  //       actor: 'system',
  //       channel: waSent ? 'whatsapp' : 'console',
  //       detail: `AMBER reminder (${ageMin}m)${waSent ? ' → WhatsApp sent to ' + pricerName : ' → logged (WA not configured)'}`,
  //     }),
  //   );

  //   inq.reminderCount = (inq.reminderCount || 0) + 1;
  //   await this.inquiryRepo.save(inq);

  //   this.logger.warn(
  //     `AMBER: Inquiry #${inq.id} is ${ageMin} min old. Reminder #${inq.reminderCount} sent to ${pricerName}.`,
  //   );
  // }

  // ─── Send AMBER WhatsApp reminder to the pricer ───
  private async sendAmberReminder(inq: Inquiry, ageMin: number) {
    const pricerName = inq.assignedToName || 'Unassigned';
    const pricerPhone = inq.assignedToKey || '';

    // ─── FIX: Skip sending if no one is assigned ───
    if (!pricerPhone || pricerPhone === 'Unassigned') {
      this.logger.warn(
        `AMBER: Inquiry #${inq.id} is ${ageMin} min old, but no pricer is assigned. Skipping WhatsApp send.`,
      );

      // Log that we skipped it
      await this.eventRepo.save(
        this.eventRepo.create({
          inquiryId: inq.id,
          at: new Date(),
          kind: 'REMINDER',
          actor: 'system',
          channel: 'skipped',
          detail: `AMBER reminder skipped — inquiry is Unassigned (${ageMin}m)`,
        }),
      );

      inq.reminderCount = (inq.reminderCount || 0) + 1;
      await this.inquiryRepo.save(inq);
      return; // Stop here, don't try to send to an empty number
    }

    const message =
      `⏰ RATE REMINDER (${ageMin} min)\n\n` +
      `Lane: ${inq.lane}\n` +
      `Requester: ${inq.requesterName}\n` +
      `Posted: ${new Date(inq.postedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
      `Please quote the rate ASAP.`;

    // Try to send via WhatsApp provider
    const waSent = await this.sendWhatsApp(pricerPhone, message);

    // Log the reminder event
    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: inq.id,
        at: new Date(),
        kind: 'REMINDER',
        actor: 'system',
        channel: waSent ? 'whatsapp' : 'console',
        detail: `AMBER reminder (${ageMin}m)${waSent ? ' → WhatsApp sent to ' + pricerName : ' → logged (WA not configured)'}`,
      }),
    );

    inq.reminderCount = (inq.reminderCount || 0) + 1;
    await this.inquiryRepo.save(inq);

    this.logger.warn(
      `AMBER: Inquiry #${inq.id} is ${ageMin} min old. Reminder #${inq.reminderCount} sent to ${pricerName}.`,
    );
  }

  // ─── Send RED email escalation to coordinator ───
  private async sendRedEscalation(inq: Inquiry, ageMin: number) {
    const coordEmail = this.config.SETTINGS?.['coordinator_email'] || '';
    const coordName =
      this.config.SETTINGS?.['coordinator_name'] || 'Coordinator';

    const subject = `🔴 OVERDUE: Inquiry #${inq.id} — ${ageMin} min old (RED)`;
    const body =
      `RED ESCALATION\n\n` +
      `Inquiry #${inq.id}\n` +
      `Lane: ${inq.lane}\n` +
      `Requester: ${inq.requesterName}\n` +
      `Assigned To: ${inq.assignedToName || 'Unassigned'}\n` +
      `Posted At: ${new Date(inq.postedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` +
      `Age: ${ageMin} minutes\n` +
      `Reminders Sent: ${inq.reminderCount}\n\n` +
      `This inquiry has crossed the RED threshold. The pricer has not responded.`;

    // Try to send email
    const emailSent = await this.sendEmail(coordEmail, subject, body);

    // Log the escalation event
    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: inq.id,
        at: new Date(),
        kind: 'ESCALATION',
        actor: 'system',
        channel: emailSent ? 'email' : 'console',
        detail: `RED escalation (${ageMin}m)${emailSent ? ' → email sent to ' + coordEmail : ' → logged (SMTP not configured)'}`,
      }),
    );

    inq.reminderCount = (inq.reminderCount || 0) + 1;
    await this.inquiryRepo.save(inq);

    this.logger.error(
      `RED: Inquiry #${inq.id} is ${ageMin} min old. Escalation sent to ${coordName}.`,
    );
  }

  //   // ─── Send WhatsApp message (via configured provider) ───
  //   private async sendWhatsApp(phone: string, message: string): Promise<boolean> {
  //     const provider = this.config.SETTINGS?.['wa_provider'] || 'automsg';

  //     if (provider === 'automsg') {
  //       const user = this.config.SETTINGS?.['automsg_user'] || '';
  //       const pass = this.config.SETTINGS?.['automsg_pass'] || '';
  //       const url = this.config.SETTINGS?.['automsg_send_url'] || '';

  //       if (!user || !pass || !url) {
  //         this.logger.debug('AutoMSG not configured — skipping WhatsApp send.');
  //         return false;
  //       }

  //       // In production, this would make an HTTP call to AutoMSG API
  //       // For now, we log it
  //       this.logger.log(`[WhatsApp → ${phone}] ${message.slice(0, 50)}...`);
  //       return true;
  //     }

  //     // Maytapi provider
  //     const apiKey = this.config.SETTINGS?.['maytapi_api_key'] || '';
  //     const productId = this.config.SETTINGS?.['maytapi_product_id'] || '';
  //     const phoneId = this.config.SETTINGS?.['maytapi_phone_id'] || '';

  //     if (!apiKey || !productId || !phoneId) {
  //       this.logger.debug('Maytapi not configured — skipping WhatsApp send.');
  //       return false;
  //     }

  //     this.logger.log(`[WhatsApp → ${phone}] ${message.slice(0, 50)}...`);
  //     return true;
  //   }

  // ─── Send WhatsApp message (via Maytapi API) ───
  private async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    const apiKey = this.config.SETTINGS?.['maytapi_api_key'] || '';
    const productId = this.config.SETTINGS?.['maytapi_product_id'] || '';
    const phoneId = this.config.SETTINGS?.['maytapi_phone_id'] || '';

    this.logger.log(
      `[WhatsApp Debug] apiKey=${apiKey ? 'YES' : 'NO'}, productId=${productId ? 'YES' : 'NO'}, phoneId=${phoneId ? 'YES' : 'NO'}, phone=${phone}`,
    );

    if (!apiKey || !productId || !phoneId) {
      this.logger.debug('Maytapi not configured — skipping WhatsApp send.');
      return false;
    }

    try {
      const url = `https://api.maytapi.com/api/${productId}/${phoneId}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-maytapi-key': apiKey,
        },
        body: JSON.stringify({
          message: message,
          // to: parseInt(phone.replace(/\D/g, '')),
          to_number: phone.replace(/\D/g, ''),
          type: 'text',
        }),
      });

      const data = await response.json();

      if (data.success || response.status === 200) {
        this.logger.log(`[WhatsApp] Message sent to ${phone} via Maytapi`);
        return true;
      } else {
        this.logger.error(`[WhatsApp] Maytapi error: ${JSON.stringify(data)}`);
        return false;
      }
    } catch (err) {
      this.logger.error(`[WhatsApp] Maytapi error: ${err.message}`);
      return false;
    }
  }

  // ─── Send email (via SMTP) ───
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<boolean> {
    const host = this.config.SETTINGS?.['smtp_host'] || '';
    const port = this.config.SETTINGS?.['smtp_port'] || '';
    const user = this.config.SETTINGS?.['smtp_user'] || '';
    const pass = this.config.SETTINGS?.['smtp_pass'] || '';

    if (!host || !user || !pass) {
      this.logger.debug('SMTP not configured — skipping email send.');
      return false;
    }

    // In production, this would use nodemailer to send the email
    this.logger.log(`[Email → ${to}] ${subject}`);
    return true;
  }

  // ─── Check if current time is in quiet hours (21:00 - 08:00 IST) ───
  private isQuietHours(): boolean {
    const quiet = this.config.CONFIG?.quiet_hours || {};
    const start = quiet.start || '21:00';
    const end = quiet.end || '08:00';

    const now = new Date();
    const istHour = parseInt(
      now.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        hour12: false,
      }),
    );

    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);

    // Handles overnight window (e.g., 21:00 to 08:00)
    if (startHour > endHour) {
      return istHour >= startHour || istHour < endHour;
    }
    return istHour >= startHour && istHour < endHour;
  }
}
