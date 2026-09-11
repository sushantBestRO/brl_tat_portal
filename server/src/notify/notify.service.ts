import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(private config: AppConfigService) {}

  // ─── Normalize phone numbers to digits with country code ───
  // Both providers expect bare digits, e.g. "919594963449"
  private normalisePhone(phone: string): string {
    let digits = (phone || '').replace(/\D/g, '');
    if (digits.length === 10) {
      // Bare 10-digit Indian mobile, no country code
      digits = '91' + digits;
    }
    return digits;
  }

  // ─── Send WhatsApp via AutoMessageSender ───
  private async sendViaAutomsg(phone: string, text: string): Promise<boolean> {
    const user = this.config.SETTINGS['automsg_user'] || '';
    const pwd = this.config.SETTINGS['automsg_pass'] || '';

    // No credentials → dry run (log it, return false)
    if (!user || !pwd) {
      this.logger.log(`[dry-run/automsg] WhatsApp -> ${phone}: ${text}`);
      return false;
    }

    const url =
      this.config.SETTINGS['automsg_send_url'] ||
      'https://app.messageautosender.com/api/v1/message/create';

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverMobileNo: phone,
          message: [text],
        }),
      });

      if (!resp.ok) {
        this.logger.warn(
          `AutoMessageSender send failed ${resp.status}: ${await resp.text()}`,
        );
        return false;
      }
      return true;
    } catch (err: any) {
      this.logger.error(`AutoMessageSender send error: ${err.message}`);
      return false;
    }
  }

  // ─── Send WhatsApp via Maytapi ───
  private async sendViaMaytapi(phone: string, text: string): Promise<boolean> {
    const apiKey = this.config.SETTINGS['maytapi_api_key'] || '';
    const productId = this.config.SETTINGS['maytapi_product_id'] || '';
    const phoneId = this.config.SETTINGS['maytapi_phone_id'] || '';

    if (!apiKey || !productId || !phoneId) {
      this.logger.log(`[dry-run/maytapi] WhatsApp -> ${phone}: ${text}`);
      return false;
    }

    const url = `https://api.maytapi.com/api/${productId}/${phoneId}/sendMessage`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'x-maytapi-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_number: phone,
          type: 'text',
          message: text,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      this.logger.log(
        `[Maytapi] Response: status=${resp.status}, data=${JSON.stringify(data)}`,
      );
      return resp.ok && data.success !== false;
    } catch (err: any) {
      this.logger.error(`Maytapi send error: ${err.message}`);
      return false;
    }
  }

  // ─── MAIN: Send WhatsApp message (routes to the configured provider) ───
  async sendWhatsapp(toPhone: string, text: string): Promise<boolean> {
    const phone = this.normalisePhone(toPhone);
    if (!phone) {
      this.logger.warn(`send_whatsapp: no usable phone number for ${toPhone}`);
      return false;
    }

    const provider = this.config.SETTINGS['wa_provider'] || 'automsg';
    if (provider === 'maytapi') {
      return this.sendViaMaytapi(phone, text);
    }
    return this.sendViaAutomsg(phone, text);
  }

  //   // ─── MAIN: Send Email via SMTP ───
  //   async sendEmail(toAddr: string, subject: string, body: string): Promise<boolean> {
  //     const host = this.config.SETTINGS['smtp_host'] || '';

  //     if (!host) {
  //       this.logger.log(`[dry-run] Email -> ${toAddr}: ${subject}`);
  //       return false;
  //     }

  //     try {
  //       const transporter = nodemailer.createTransport({
  //         host,
  //         port: parseInt(this.config.SETTINGS['smtp_port'] || '587'),
  //         secure: parseInt(this.config.SETTINGS['smtp_port'] || '587') === 465,
  //         auth: {
  //           user: this.config.SETTINGS['smtp_user'] || '',
  //           pass: this.config.SETTINGS['smtp_pass'] || '',
  //         },
  //       });

  //       await transporter.sendMail({
  //         from: this.config.SETTINGS['smtp_from'] || 'alerts@bestroadways.com',
  //         to: toAddr,
  //         subject,
  //         text: body,
  //       });

  //       return true;
  //     } catch (err: any) {
  //       this.logger.error(`SMTP send error: ${err.message}`);
  //       return false;
  //     }
  //   }
  // }

  // ─── Email quota tracking ───
  private emailQuotaExceeded = false;
  private emailQuotaRemaining: number | null = null;

  // ─── MAIN: Send Email via Google Apps Script ───
  async sendEmail(
    toAddr: string,
    subject: string,
    body: string,
  ): Promise<boolean> {
    // ─── If quota already exceeded, don't try ───
    if (this.emailQuotaExceeded) {
      this.logger.warn('[Email] Quota already exceeded — skipping send');
      return false;
    }

    const scriptUrl =
      this.config.SETTINGS['google_script_url'] ||
      'https://script.google.com/macros/s/AKfycbwnU_ZCsxEfSYZTsAgVn2pE1p8_apdyqoUHP3EOMSY5QaVFXcBOF_WsQ1Gukmy4ACmcUA/exec';

    try {
      const resp = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ToEmail: toAddr,
          ToCC: '',
          subject: subject,
          EmailHTML: body.replace(/\n/g, '<br>'), // ← CHANGE THIS LINE
        }),
      });

      const result = await resp.json().catch(() => ({}));

      if (!resp.ok || result.success === false) {
        // ─── Check if quota exceeded ───
        if (
          result.error === 'QUOTA_EXCEEDED' ||
          (result.message || '').includes('quota')
        ) {
          this.emailQuotaExceeded = true;
          this.emailQuotaRemaining = 0;
          this.logger.error(
            `[Email] QUOTA EXCEEDED — Google Script daily limit reached. Switch to SMTP.`,
          );
        } else {
          this.logger.warn(
            `[Email] Send failed: ${result.message || result.error || 'unknown'}`,
          );
        }
        return false;
      }

      // ─── Track remaining quota ───
      if (result.remainingQuota !== undefined) {
        this.emailQuotaRemaining = result.remainingQuota;
        if (result.remainingQuota <= 10) {
          this.logger.warn(
            `[Email] Quota low — ${result.remainingQuota} emails remaining today`,
          );
        }
      }

      this.logger.log(
        `[Email] Sent to ${toAddr}: ${subject} (${result.remainingQuota || '?'} quota left)`,
      );
      return true;
    } catch (err: any) {
      this.logger.error(`Google Script email error: ${err.message}`);
      return false;
    }
  }

  // ─── Send bulk email ───
  async sendEmailBulk(
    toAddrs: string[],
    subject: string,
    body: string,
  ): Promise<boolean> {
    if (this.emailQuotaExceeded) {
      this.logger.warn('[Email] Quota exceeded — bulk send skipped');
      return false;
    }

    const valid = toAddrs.filter((e) => e && e.trim());
    if (!valid.length) return false;

    const scriptUrl =
      this.config.SETTINGS['google_script_url'] ||
      // 'https://script.google.com/macros/s/AKfycbzF6qIQWQCqXyIIQ6FM6gOGmIVypDrY4erJgDU_1piSSlMuyqwOmOxPKiM24xZjOSMdCg/exec';
      'https://script.google.com/macros/s/AKfycbwnU_ZCsxEfSYZTsAgVn2pE1p8_apdyqoUHP3EOMSY5QaVFXcBOF_WsQ1Gukmy4ACmcUA/exec';

    try {
      const resp = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ToEmail: valid.join(','),
          ToCC: '',
          subject: subject,
          // EmailHTML: body,
          EmailHTML: body.replace(/\n/g, '<br>'), // ← CHANGE THIS LINE
        }),
      });

      const result = await resp.json().catch(() => ({}));

      if (!resp.ok || result.success === false) {
        if (
          result.error === 'QUOTA_EXCEEDED' ||
          (result.message || '').includes('quota')
        ) {
          this.emailQuotaExceeded = true;
          this.emailQuotaRemaining = 0;
          this.logger.error(`[Email] QUOTA EXCEEDED — Switch to SMTP`);
        }
        return false;
      }

      if (result.remainingQuota !== undefined) {
        this.emailQuotaRemaining = result.remainingQuota;
      }

      this.logger.log(
        `[Email] Bulk sent to ${valid.length} recipients (${result.remainingQuota || '?'} quota left)`,
      );
      return true;
    } catch (err: any) {
      this.logger.error(`Bulk email error: ${err.message}`);
      return false;
    }
  }

  // ─── Check email status (for frontend) ───
  getEmailStatus(): any {
    return {
      quota_exceeded: this.emailQuotaExceeded,
      remaining: this.emailQuotaRemaining,
      provider: 'google_script',
    };
  }
}

// Dry-run mode
// Notice how every send method checks if credentials exist first. If automsg_user or smtp_host is empty, it logs a [dry-run] message and returns false.

// This means the system works perfectly even without any API keys configured. It will just log the messages instead of sending them. This is great for development and testing — you can see exactly what would be sent without actually sending it.

// normalisePhone()
// Phone numbers can come in many formats: +91 98765 43210, 919876543210, 9876543210. This method strips all non-digits and prepends 91 if it's a bare 10-digit number. Both AutoMSG and Maytapi expect the format 919876543210.

// Provider routing
// The sendWhatsapp() method checks SETTINGS['wa_provider']. If it's 'maytapi', it uses Maytapi. Otherwise, it defaults to AutoMessageSender. This is configurable from the Settings page in the UI.
