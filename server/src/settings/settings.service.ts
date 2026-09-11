import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassificationPhrase } from '../entities/classification-phrase.entity';
import { PricingTeamMember } from '../entities/pricing-team-member.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { AppConfigService } from '../config/app-config.service';
import { ParserService } from '../parser/parser.service';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(ClassificationPhrase)
    private phraseRepo: Repository<ClassificationPhrase>,
    @InjectRepository(PricingTeamMember)
    private teamRepo: Repository<PricingTeamMember>,
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    private config: AppConfigService,
    private parser: ParserService,
  ) {}

  // ─── Classification Phrases ───

  async listPhrases() {
    const rows = await this.phraseRepo.find({
      order: { kind: 'ASC', createdAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id,
      phrase: r.phrase,
      kind: r.kind,
      created_at: r.createdAt?.toISOString(),
      created_by: r.createdBy,
    }));
  }

  async addPhrase(phrase: string, kind: string, createdBy?: string) {
    phrase = phrase.trim();
    if (!phrase) throw new BadRequestException('phrase cannot be empty');
    if (!['ask', 'chase'].includes(kind))
      throw new BadRequestException("kind must be 'ask' or 'chase'");

    const row = this.phraseRepo.create({
      phrase,
      kind,
      createdBy: createdBy || 'coordinator',
    });
    await this.phraseRepo.save(row);

    // Reload parser so new phrase takes effect immediately
    await this.parser.reloadCustomPhrases();
    return { id: row.id, phrase: row.phrase, kind: row.kind };
  }

  async deletePhrase(id: number) {
    const row = await this.phraseRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('not found');
    await this.phraseRepo.delete(id);
    await this.parser.reloadCustomPhrases();
    return { deleted: id };
  }

  // ─── Pricing Team ───

  async listTeam() {
    const rows = await this.teamRepo.find({
      order: { assignOrder: 'ASC', name: 'ASC' },
    });
    return rows.map((r) => ({
      id: r.id,
      phone: r.phone,
      name: r.name,
      email: r.email || '',
      role: r.role || '', // ← ADD THIS
      aliases: r.aliases,
      assign_order: r.assignOrder,
      active: r.active,
      is_default: r.isDefault,
    }));
  }

  // async addTeamMember(
  //   phone: string,
  //   name: string,
  //   email = '',
  //   aliases = '',
  //   assignOrder = 99,
  //   active = true,
  // ) {
  //   // Strip non-digits from phone
  //   phone = phone.replace(/\D/g, '');
  //   if (!phone) throw new BadRequestException('phone must contain digits');
  //   if (!name.trim()) throw new BadRequestException('name is required');

  //   const existing = await this.teamRepo.findOne({ where: { phone } });
  //   if (existing)
  //     throw new ConflictException(
  //       'a team member with this phone already exists',
  //     );

  //   const row = this.teamRepo.create({
  //     phone,
  //     name: name.trim(),
  //     email: email.trim(),
  //     aliases: aliases.trim(),
  //     assignOrder,
  //     active,
  //   });
  //   await this.teamRepo.save(row);

  //   // Reload config so new member is available for auto-assignment immediately
  //   await this.config.reloadPricingTeam();
  //   return { id: row.id, phone: row.phone, name: row.name };
  // }

  async addTeamMember(dto: any) {
    let phone = (dto.phone || '').replace(/\D/g, '');
    if (!phone) throw new BadRequestException('phone must contain digits');
    if (!dto.name?.trim()) throw new BadRequestException('name is required');

    const existing = await this.teamRepo.findOne({ where: { phone } });
    if (existing)
      throw new ConflictException(
        'a team member with this phone already exists',
      );

    const row = this.teamRepo.create({
      phone,
      name: dto.name.trim(),
      email: (dto.email || '').trim(),
      role: dto.role || '', // ← ADD THIS
      aliases: (dto.aliases || '').trim(),
      assignOrder: dto.assign_order ?? 99,
      active: dto.active !== false,
      isDefault: dto.is_default || false,
    });
    await this.teamRepo.save(row);

    await this.config.reloadPricingTeam();
    return { id: row.id, phone: row.phone, name: row.name };
  }

  async editTeamMember(id: number, dto: any) {
    const row = await this.teamRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('not found');

    // Handle phone change
    if (dto.phone != null) {
      const newPhone = dto.phone.replace(/\D/g, '');
      if (!newPhone) throw new BadRequestException('phone must contain digits');
      if (newPhone !== row.phone) {
        const clash = await this.teamRepo.findOne({
          where: { phone: newPhone },
        });
        if (clash)
          throw new ConflictException(
            `${clash.name} already uses phone ${newPhone}`,
          );

        // Update all inquiries assigned to this person's old phone
        await this.inquiryRepo
          .createQueryBuilder()
          .update()
          .set({ assignedToKey: newPhone })
          .where('assignedToKey = :old', { old: row.phone })
          .execute();

        row.phone = newPhone;
      }
    }

    // if (dto.name != null) row.name = dto.name.trim();
    // if (dto.email != null) row.email = dto.email.trim();
    // if (dto.aliases != null) row.aliases = dto.aliases.trim();
    // if (dto.assign_order != null) row.assignOrder = dto.assign_order;
    // if (dto.active != null) row.active = dto.active;

    if (dto.name != null) row.name = dto.name.trim();
    if (dto.email != null) row.email = dto.email.trim();
    if (dto.role != null) row.role = dto.role.trim(); // ← ADD THIS
    if (dto.aliases != null) row.aliases = dto.aliases.trim();
    if (dto.assign_order != null) row.assignOrder = dto.assign_order;
    if (dto.active != null) row.active = dto.active;

    // Handle is_default (only one default at a time)
    if (dto.is_default != null) {
      if (dto.is_default) {
        // Clear is_default on all other members
        await this.teamRepo
          .createQueryBuilder()
          .update()
          .set({ isDefault: false })
          .where('id != :id', { id })
          .execute();
      }
      row.isDefault = dto.is_default;
    }

    await this.teamRepo.save(row);
    await this.config.reloadPricingTeam();
    return {
      id: row.id,
      phone: row.phone,
      name: row.name,
      active: row.active,
      is_default: row.isDefault,
    };
  }

  async deleteTeamMember(id: number) {
    const row = await this.teamRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('not found');

    // Check if they have open inquiries
    const stillAssigned = await this.inquiryRepo.count({
      where: { status: 'OPEN', assignedToKey: row.phone },
    });
    if (stillAssigned) {
      throw new ConflictException(
        `${row.name} still has ${stillAssigned} open inquiry(s) assigned — reassign those first, or mark them inactive instead of deleting`,
      );
    }

    await this.teamRepo.delete(id);
    await this.config.reloadPricingTeam();
    return { deleted: id };
  }

  // ─── Integration Config (SMTP, WhatsApp provider, Coordinator) ───

  getConfigSettings() {
    const out: any = {};
    for (const [key, val] of Object.entries(this.config.SETTINGS)) {
      if (this.config.SECRET_SETTING_KEYS.has(key)) {
        // Never echo back secrets — just say if it's set or not
        out[key] = '';
        out[key + '_is_set'] = !!val;
      } else {
        out[key] = val;
      }
    }
    return out;
  }

  async saveConfigSettings(dto: any) {
    for (const [key, value] of Object.entries(dto)) {
      if (value == null) continue;
      // Blank secret field means "leave the existing value alone"
      if (this.config.SECRET_SETTING_KEYS.has(key) && value === '') continue;
      await this.config.setSetting(key, String(value));
    }
    return this.getConfigSettings();
  }

  // ─── Archive and close all inquiries older than X days ───
  async cleanupOldInquiries(days: number) {
    const cutoff = new Date(Date.now() - days * 86400000);
    const result = await this.inquiryRepo
      .createQueryBuilder()
      .update()
      .set({
        archived: true,
        status: 'WITHDRAWN',
        closedAt: new Date(),
        closeReason: 'auto-cleanup: older than ' + days + ' days',
      })
      .where('postedAt < :cutoff', { cutoff })
      .andWhere('archived = false')
      .execute();

    return {
      success: true,
      archived_count: result.affected || 0,
      message: `${result.affected || 0} old inquiries archived and closed.`,
    };
  }

  // ─── Archive all open inquiries and switch to a new WhatsApp group ───
  // async switchGroup(newGroupId: string) {
  //   // Get the current group key
  //   const oldGroupKey = this.config.SETTINGS?.['group_key'] || this.config.CONFIG?.groups?.[0]?.group_key || '';

  //   // Archive and close all OPEN inquiries from the old group
  //   const result = await this.inquiryRepo.createQueryBuilder()
  //     .update()
  //     .set({
  //       archived: true,
  //       status: 'WITHDRAWN',
  //       closedAt: new Date(),
  //       closeReason: 'group changed',
  //     })
  //     .where('status = :status', { status: 'OPEN' })
  //     .execute();

  //   const closedCount = result.affected || 0;

  //   // Save the new group ID
  //   await this.config.setSetting('group_key', newGroupId);

  //   return {
  //     success: true,
  //     old_group: oldGroupKey,
  //     new_group: newGroupId,
  //     inquiries_closed: closedCount,
  //     message: `Group changed! ${closedCount} open inquiries closed.`,
  //   };
  // }
  // ─── Archive all inquiries and switch to a new WhatsApp group ───
  async switchGroup(newGroupId: string) {
    const oldGroupKey =
      this.config.SETTINGS?.['group_key'] ||
      this.config.CONFIG?.groups?.[0]?.group_key ||
      '';

    // Archive ALL inquiries from the old group (OPEN, QUOTED, everything)
    const result = await this.inquiryRepo
      .createQueryBuilder()
      .update()
      .set({
        archived: true,
        status: 'WITHDRAWN',
        closedAt: new Date(),
        closeReason: 'group changed',
      })
      .where('archived = false')
      .execute();

    const closedCount = result.affected || 0;

    // Save the new group ID
    await this.config.setSetting('group_key', newGroupId);

    return {
      success: true,
      old_group: oldGroupKey,
      new_group: newGroupId,
      inquiries_archived: closedCount,
      message: `Group changed! ${closedCount} inquiries archived.`,
    };
  }
}

// Pricing Team CRUD
// addTeamMember — strips non-digits from phone (so +91-98765-43210 becomes 919876543210), checks for duplicates, saves, then reloads the config so the new person is immediately available for auto-assignment.
// editTeamMember — if phone changes, updates ALL inquiries assigned to the old phone so they point to the new phone. If is_default is set to true, clears it on all other members (only one default allowed).
// deleteTeamMember — refuses to delete if they have open inquiries (must reassign first or mark inactive).

// Config Settings (Secrets Handling)
// The getConfigSettings method is very important for security:

// typescript

// if (this.config.SECRET_SETTING_KEYS.has(key)) {
//   out[key] = '';              // Never echo back the actual password/key
//   out[key + '_is_set'] = !!val; // Just say if it's set or not
// }
// This means the API response will say "smtp_pass": "", "smtp_pass_is_set": true — the frontend knows a password is configured, but never sees what it is.

// When saving, a blank secret field means "leave it alone":

// typescript

// if (this.config.SECRET_SETTING_KEYS.has(key) && value === '') continue;
// This prevents a coordinator from accidentally wiping out the SMTP password by saving the settings form without filling in the password field.
