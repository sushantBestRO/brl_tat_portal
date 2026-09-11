import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { ChatMessage } from '../entities/message.entity';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    @InjectRepository(ChatMessage) private messageRepo: Repository<ChatMessage>,
    private config: AppConfigService,
  ) {}

  // ─── Get all stats for the dashboard ───
  async getStats() {
    const tat = this.config.CONFIG.tat || {};

    // Open inquiries (oldest first so the most urgent are at the top)
    const openInqs = await this.inquiryRepo.find({
      where: { status: 'OPEN', archived: false },
      order: { id: 'DESC' },
    });

    // Recently quoted (newest first)
    const recentQuoted = await this.inquiryRepo.find({
      where: { status: 'QUOTED', archived: false },
      order: { id: 'DESC' },
      take: 25,
    });

    const total = await this.inquiryRepo.count({ where: { archived: false } });
    
    // For quoted count, we check if quotedAt is not null
    const allInquiries = await this.inquiryRepo.find({ where: { archived: false } });
    const quotedCount = allInquiries.filter(i => i.quotedAt != null).length;

    // Calculate median TAT in minutes
    const lags = allInquiries
      .map(i => i.tatSeconds)
      .filter(v => v != null)
      .sort((a, b) => a - b);
    const medianMin = lags.length
      ? Math.round(lags[Math.floor(lags.length / 2)] / 60 * 10) / 10
      : 0;


     

        // Format minutes into "1 hr 10 min" or "45 min"
    const fmtDur = (mins: number): string => {
      if (mins <= 0) return '0 min';
      const h = Math.floor(mins / 60);
      const m = Math.round(mins % 60);
      if (h > 0 && m > 0) return `${h} hr ${m} min`;
      if (h > 0) return `${h} hr`;
      return `${m} min`;
    };

    const serialize = (inq: Inquiry) => {
      const ageMin = Math.round(
        (new Date().getTime() - new Date(inq.postedAt).getTime()) / 60000 * 10,
      ) / 10;
      return {
        id: inq.id,
        requester: inq.requesterName,
        lane: inq.lane,
        vehicle_type: inq.vehicleType || '',
        posted_at: inq.postedAt?.toISOString(),
        age_minutes: ageMin,
        age_display: fmtDur(ageMin),
        assigned_to: inq.assignedToName,
        assigned_to_key: inq.assignedToKey,
        status: inq.status,
        quoted_rates: inq.quotedRates || null,
        tat: inq.tatSeconds ? fmtDur(inq.tatSeconds / 60) : '-',
      };
    };



    return {
      open_inquiries: openInqs.map(serialize),
      recent_quoted: recentQuoted.map(serialize),
      total,
      quoted_count: quotedCount,
      open_count: openInqs.length,
      median_tat_min: medianMin,
      amber_minutes: tat.amber_minutes || 60,
      red_minutes: tat.red_minutes || 120,
    };
  }
}


// The getStats() method gathers everything the dashboard needs in one API call:

// open_inquiries — All inquiries with status: 'OPEN', ordered oldest first. The frontend uses this to show live timers. The serialize helper calculates age_minutes on the fly.
// recent_quoted — The last 25 inquiries that got a rate, ordered newest first.
// total — Total inquiry count (not archived).
// quoted_count — How many have been quoted.
// median_tat_min — The median turnaround time in minutes. We calculate this in Node.js rather than SQL because median calculations vary between databases.
// amber_minutes / red_minutes — Passed from config.yaml so the frontend knows the threshold cutoffs for color-coding.