import { Injectable, Global, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingTeamMember } from '../entities/pricing-team-member.entity';
import { Setting } from '../entities/setting.entity';

export interface PricingTeamEntry {
  name: string;
  email: string;
  aliases: string[];
  assignOrder: number;
  active: boolean;
  isDefault: boolean;
}

@Global()
@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);

  // The parsed config.yaml file
  CONFIG: any;

  // Which WhatsApp groups to accept messages from
  GROUP_KEYS = new Set<string>();
  GROUP_NAMES: Record<string, string> = {};

  // Pricing team roster: phone -> member info
  PRICING_TEAM: Record<string, PricingTeamEntry> = {};

  // Alias lookup: lowercase name/alias -> phone
  ALIAS_TO_PHONE: Record<string, string> = {};

  // Settings store: key -> value
  SETTINGS: Record<string, string> = {};

  // Keys whose values should never be shown in API responses
  SECRET_SETTING_KEYS = new Set([
    'smtp_pass',
    'automsg_pass',
    'maytapi_api_key',
  ]);

  constructor(
    private envConfig: ConfigService,
    @InjectRepository(PricingTeamMember)
    private teamRepo: Repository<PricingTeamMember>,
    @InjectRepository(Setting) private settingRepo: Repository<Setting>,
  ) {}

  // ─── Called automatically when the app starts ───
  async onModuleInit() {
    this.loadConfigFile();
    await this.reloadPricingTeam();
    await this.reloadSettings();
    this.logger.log(
      `Loaded ${Object.keys(this.PRICING_TEAM).length} pricing team members and ${Object.keys(this.SETTINGS).length} settings.`,
    );
  }

  // ─── Read config.yaml from the project root ───
  private loadConfigFile() {
    try {
      const configPath =
        this.envConfig.get<string>('CONFIG_PATH') ||
        join(process.cwd(), '..', 'config.yaml');
      const text = readFileSync(configPath, 'utf-8');
      this.CONFIG = parseYaml(text) || {};

      for (const g of this.CONFIG.groups || []) {
        this.GROUP_KEYS.add(g.group_key);
        this.GROUP_NAMES[g.group_key] = g.name;
      }
    } catch (err) {
      this.logger.warn(
        `Could not load config.yaml: ${err.message}. Using env defaults.`,
      );
      this.CONFIG = {
        groups: [],
        requesters: {},
        coordinator: {},
        tat: {
          amber_minutes: 60,
          red_minutes: 120,
          repeat_minutes: 60,
          max_reminders: 5,
          scheduler_tick_seconds: 60,
        },
        quiet_hours: { start: '21:00', end: '08:00' },
        templates: {},
      };
    }
  }

  // ─── Load pricing team from database (seed from config.yaml on first run) ───
  async reloadPricingTeam() {
    let rows = await this.teamRepo.find();

    // FIRST RUN: table is empty → seed from config.yaml
    if (rows.length === 0) {
      for (const [phone, entry] of Object.entries(
        this.CONFIG.pricing_team || {},
      )) {
        await this.teamRepo.save(
          this.teamRepo.create({
            phone,
            name: (entry as any).name || phone,
            email: (entry as any).email || '',
            aliases: ((entry as any).aliases || []).join(','),
            assignOrder: (entry as any).assign_order || 99,
            active: true,
          }),
        );
      }
      rows = await this.teamRepo.find();
    }

    // Rebuild the in-memory dictionaries
    this.PRICING_TEAM = {};
    this.ALIAS_TO_PHONE = {};
    for (const r of rows) {
      const aliases = (r.aliases || '')
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      this.PRICING_TEAM[r.phone] = {
        name: r.name,
        email: r.email || '',
        aliases,
        assignOrder: r.assignOrder || 99,
        active: r.active,
        isDefault: r.isDefault,
      };
      // Map every name + alias to this person's phone
      for (const al of [r.name, ...aliases]) {
        if (al) this.ALIAS_TO_PHONE[al.trim().toLowerCase()] = r.phone;
      }
    }
  }

  // ─── Load settings from database (fall back to .env values) ───
  async reloadSettings() {
    this.SETTINGS = {};
    const coord = this.CONFIG.coordinator || {};
    this.SETTINGS['coordinator_name'] = coord.name || '';
    this.SETTINGS['coordinator_phone'] = coord.phone || '';
    this.SETTINGS['coordinator_email'] = coord.email || '';
    this.SETTINGS['wa_provider'] = 'maytapi';

    // Fall back to env vars for SMTP/AutoMSG/Maytapi
    const envFallback: Record<string, string> = {
      smtp_host: 'SMTP_HOST',
      smtp_port: 'SMTP_PORT',
      smtp_user: 'SMTP_USER',
      smtp_pass: 'SMTP_PASS',
      smtp_from: 'SMTP_FROM',
      automsg_user: 'AUTOMSG_USER',
      automsg_pass: 'AUTOMSG_PASS',
      automsg_send_url: 'AUTOMSG_SEND_URL',
      maytapi_api_key: 'MAYTAPI_API_KEY',
      maytapi_product_id: 'MAYTAPI_PRODUCT_ID',
      maytapi_phone_id: 'MAYTAPI_PHONE_ID',
    };
    for (const [key, envName] of Object.entries(envFallback)) {
      this.SETTINGS[key] = this.envConfig.get<string>(envName) || '';
    }

    // TEMPORARY: Hardcode Maytapi credentials to test
    // this.SETTINGS['maytapi_api_key'] = '5379b494-917d-495e-9b23-ec618f25f4e5';
    // this.SETTINGS['maytapi_product_id'] = 'a9bf09cb-acd0-41c0-9748-3b79edb43542';
    // this.SETTINGS['maytapi_phone_id'] = '136151';

    // Override with anything saved in the database (from Settings page)
    const rows = await this.settingRepo.find();
    for (const r of rows) this.SETTINGS[r.key] = r.value || '';
    this.logger.log(
      `Maytapi settings loaded: KEY=${this.SETTINGS['maytapi_api_key'] ? 'YES' : 'NO'}, PRODUCT=${this.SETTINGS['maytapi_product_id'] ? 'YES' : 'NO'}, PHONE=${this.SETTINGS['maytapi_phone_id'] ? 'YES' : 'NO'}`,
    );
  }

  // ─── Save a setting to the database ───
  async setSetting(key: string, value: string) {
    let row = await this.settingRepo.findOne({ where: { key } });
    if (row) {
      row.value = value;
    } else {
      row = this.settingRepo.create({ key, value });
    }
    await this.settingRepo.save(row);
    this.SETTINGS[key] = value;
  }

  // ─── Helper: get pricing team member's name ───
  pricerName(phone: string, fallbackName?: string | null): string {
    // Check direct match
    if (this.PRICING_TEAM[phone]?.name) return this.PRICING_TEAM[phone].name;

    // Normalize and compare using normalizePhone
    const norm = this.normalizePhone(phone || '');
    for (const [p, member] of Object.entries(this.PRICING_TEAM)) {
      if (this.normalizePhone(p) === norm) {
        return member.name;
      }
    }

    // If not found in PRICING_TEAM, use the fallback name (e.g., "~amit")
    if (fallbackName && fallbackName.trim()) {
      const cleaned = fallbackName.replace(/^[~_\-]+/, '').trim();
      if (cleaned) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      return fallbackName;
    }

    // Last resort: return the phone number
    return phone;
  }

  // ─── Helper: is this sender a pricing team member? ───
  // Returns their phone if yes, null if no.
  // Checks direct phone match first (with normalization), then alias match.
  // ─── Helper: is this sender a pricing team member? ───
  // Returns their phone if yes, null if no.
  // Checks direct phone match first, then alias match (case-insensitive).
  pricerPhoneFor(senderKey: string, senderName?: string | null): string | null {
    const normKey = this.normalizePhone(senderKey || '');

    // 1. Direct match on senderKey
    if (this.PRICING_TEAM[senderKey]) return senderKey;

    // 2. Normalize and compare using normalizePhone
    for (const phone of Object.keys(this.PRICING_TEAM)) {
      if (this.normalizePhone(phone) === normKey) {
        return phone;
      }
    }

    // 3. Check aliases (case-insensitive)
    for (const cand of [senderKey, senderName || '']) {
      const phone = this.ALIAS_TO_PHONE[cand.trim().toLowerCase()];
      if (phone) return phone;
    }

    // 4. If senderKey looks like a phone number, return it (normalized)
    if (normKey.length >= 10) return normKey;

    return null;
  }

  // ─── Helper: normalize phone number (strip 91 prefix if present) ───
  normalizePhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    // If it starts with 91 and is 12 digits, strip the 91
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.slice(2);
    }
    return digits;
  }

  // ─── Helper: get requester's display name ───
  // requesterName(key: string): string {
  //   return this.CONFIG.requesters?.[key] || key;
  // }
  // change done 8/9/26
  requesterName(key: string, fallbackName?: string | null): string {
    // ─── FIX 1: Check if this sender is a team member first ───
    const normKey = this.normalizePhone(key || '');
    for (const [phone, member] of Object.entries(this.PRICING_TEAM)) {
      if (this.normalizePhone(phone) === normKey) {
        return member.name;
      }
    }

    // ─── FIX 2: Check explicitly configured requesters ───
    const configured = this.CONFIG.requesters?.[key];
    if (configured) return configured;

    // ─── FIX 3: Use the WhatsApp sender name if available ───
    if (fallbackName && fallbackName.trim()) {
      return fallbackName.trim();
    }

    // ─── FIX 4: Never return a group key, return Unknown instead ───
    if (key && key.includes('g.us')) return 'Unknown';

    return key || 'Unknown';
  }

  // ─── Helper: should we accept messages from this group? ───
  //   isKnownGroup(groupKey: string): boolean {
  //     return this.GROUP_KEYS.size === 0 || this.GROUP_KEYS.has(groupKey);
  //   }
  // }
  // ─── Helper: should we accept messages from this group? ───
  isKnownGroup(groupKey: string): boolean {
    // Always accept the group saved in settings (from Settings page)
    const dbGroupKey = this.SETTINGS?.['group_key'];
    if (dbGroupKey && dbGroupKey === groupKey) return true;

    // Also check config.yaml groups
    return this.GROUP_KEYS.size === 0 || this.GROUP_KEYS.has(groupKey);
  }

  // ─── WhatsApp Auto Message toggle (default: OFF) ───
  autoWhatsAppEnabled = false;
}

// @Global() and @Injectable()
// @Injectable() means other modules can inject this service
// @Global() means every module in the app can use it without importing the config module explicitly. This is important because the parser, matcher, reminders, inquiries, and settings modules ALL need access to the pricing team roster.
// PRICING_TEAM dictionary
// This is the core data structure. After reloadPricingTeam() runs, it looks like:

// typescript

// {
//   "919594963449": {
//     name: "Kamlesh Yogi",
//     email: "",
//     aliases: ["Kamlesh Yogi"],
//     assignOrder: 1,
//     active: true,
//     isDefault: false
//   },
//   "919900000002": {
//     name: "Giriraj Rathod",
//     ...
//   },
//   ...
// }
// ALIAS_TO_PHONE dictionary
// This maps every possible display name to a phone number:

// typescript

// {
//   "kamlesh yogi": "919594963449",
//   "giriraj rathod": "919900000002",
//   "traffic giriraj rathod": "919900000002",
//   ...
// }
// pricerPhoneFor() — the most used method
// When a WhatsApp message arrives, the matcher calls this to check: "Is the sender a pricing team member?" It checks:

// Does the phone number match directly?
// Does the display name match any alias?
// If yes → returns their phone (they're a pricing person, so their message might be a rate reply). If no → returns null (they're a requester, so their message might be an inquiry).
