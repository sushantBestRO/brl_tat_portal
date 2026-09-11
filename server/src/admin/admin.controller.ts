import { Controller, Post, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../entities/message.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { Event } from '../entities/event.entity';
import { OtpChallenge } from '../entities/otp-challenge.entity';
import { NotifyService } from '../notify/notify.service';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

@Controller('admin')
export class AdminController {
  private readonly HARD_DELETE_OTP_EMAIL: string;
  private readonly HARD_DELETE_OTP_PURPOSE = 'hard_delete';
  private readonly TTL_MINUTES = 10;

  constructor(
    private envConfig: ConfigService,
    private notify: NotifyService,
    @InjectRepository(ChatMessage) private messageRepo: Repository<ChatMessage>,
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(OtpChallenge) private otpRepo: Repository<OtpChallenge>,
  ) {
    this.HARD_DELETE_OTP_EMAIL = this.envConfig.get<string>(
      'HARD_DELETE_OTP_EMAIL',
      'sushant.govinde@bestroadways.com',
    );
  }

  // ─── Soft Delete: Archive all messages and inquiries ───
  // Hides them from the dashboard, but they're still in the database.
  @Post('soft-delete')
  async softDelete() {
    const nMsg = await this.messageRepo.createQueryBuilder()
      .update()
      .set({ archived: true })
      .where('archived = false')
      .execute();

    const nInq = await this.inquiryRepo.createQueryBuilder()
      .update()
      .set({ archived: true })
      .where('archived = false')
      .execute();

    return {
      archived_messages: nMsg.affected,
      archived_inquiries: nInq.affected,
    };
  }

  // ─── Recover Archived: Bring soft-deleted data back ───
  @Post('recover-archived')
  async recoverArchived() {
    const nMsg = await this.messageRepo.createQueryBuilder()
      .update()
      .set({ archived: false })
      .where('archived = true')
      .execute();

    const nInq = await this.inquiryRepo.createQueryBuilder()
      .update()
      .set({ archived: false })
      .where('archived = true')
      .execute();

    return {
      recovered_messages: nMsg.affected,
      recovered_inquiries: nInq.affected,
    };
  }

  // ─── Hard Delete Step 1: Request OTP ───
  // Emails a 6-digit code to a fixed address. Never returns the code.
  @Post('hard-delete/request-otp')
  async requestOtp() {
    // Invalidate any earlier unused codes
    await this.otpRepo.createQueryBuilder()
      .update()
      .set({ used: true })
      .where('purpose = :p AND used = false', { p: this.HARD_DELETE_OTP_PURPOSE })
      .execute();

    // Generate 6-digit code
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + this.TTL_MINUTES * 60000);

    await this.otpRepo.save(
      this.otpRepo.create({
        code,
        purpose: this.HARD_DELETE_OTP_PURPOSE,
        expiresAt,
      }),
    );

    // Email the code
    const sent = await this.notify.sendEmail(
      this.HARD_DELETE_OTP_EMAIL,
      'BRL TAT Portal — hard delete confirmation code',
      `A hard delete of ALL portal data was requested.\n\n` +
      `Confirmation code: ${code}\n\n` +
      `This code expires in ${this.TTL_MINUTES} minutes.\n` +
      `If you did not request this, ignore this email — the code will simply expire and nothing will be deleted.`,
    );

    return {
      sent,
      note: sent
        ? 'Code emailed'
        : 'SMTP not configured — set up Email settings first',
    };
  }

  // ─── Hard Delete Step 2: Confirm with OTP ───
  // Only if the code matches, is unused, and hasn't expired,
  // permanently delete every message, inquiry, and event.
  @Post('hard-delete/confirm')
  async confirmHardDelete(@Body() body: { otp: string }) {
    const challenge = await this.otpRepo.findOne({
      where: {
        purpose: this.HARD_DELETE_OTP_PURPOSE,
        code: body.otp.trim(),
        used: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!challenge) {
      throw new BadRequestException('Incorrect code.');
    }

    if (new Date(challenge.expiresAt) < new Date()) {
      throw new BadRequestException('Code expired — request a new one.');
    }

    // Mark code as used
    challenge.used = true;
    await this.otpRepo.save(challenge);

    // Count before deleting
    const nEvents = await this.eventRepo.count();
    const nInq = await this.inquiryRepo.count();
    const nMsg = await this.messageRepo.count();

    // Delete all data (team roster, settings, and phrases are untouched)
    await this.eventRepo.delete({});
    await this.inquiryRepo.delete({});
    await this.messageRepo.delete({});

    return {
      deleted_events: nEvents,
      deleted_inquiries: nInq,
      deleted_messages: nMsg,
    };
  }
}


// Soft Delete vs Hard Delete
// Soft Delete sets archived = true on all messages and inquiries. They disappear from the dashboard, scorecard, and exports, but they're still physically in the database. A DB admin could flip the flags back. This is the safe, reversible option.

// Hard Delete permanently deletes every message, inquiry, and event. It's irreversible. Because it's so destructive, it requires a two-step OTP (one-time password) flow:

// Request OTP — generates a 6-digit code, saves it to the otp_challenges table with a 10-minute expiry, and emails it to a fixed address (sushant.govinde@bestroadways.com). The code is NEVER returned in the API response — someone has to be reading that specific inbox.
// Confirm OTP — checks that the code matches, is unused, and hasn't expired. Only then does it delete everything.
// What's preserved during hard delete?
// Team roster (pricing_team), settings (settings), classification phrases (classification_phrases), and OTP challenges are NOT deleted. Only captured data (messages, inquiries, events) is wiped.

