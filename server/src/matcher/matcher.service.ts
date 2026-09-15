import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { ChatMessage } from '../entities/message.entity';
import { Event } from '../entities/event.entity';
import { AppConfigService } from '../config/app-config.service';
import { ParserService } from '../parser/parser.service';
import { NotifyService } from 'src/notify/notify.service';

// ─── Matching thresholds (same as original Python project) ───
const REPOST_SIM = 0.65; // If similarity > 0.65, it's a repost (→ chase)
const QUOTED_MATCH = 0.55; // If similarity > 0.55, rate reply matches inquiry
const MATCH_WINDOW_DAYS = 5; // How far back to look for open inquiries
const SEQUENCE_WINDOW_HOURS = 24; // FIFO fallback window
const CHASE_WINDOW_DAYS = 3; // How far back to look for chase target

@Injectable()
export class MatcherService {
  private readonly logger = new Logger(MatcherService.name);

  constructor(
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    @InjectRepository(ChatMessage) private messageRepo: Repository<ChatMessage>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    private config: AppConfigService,
    private parser: ParserService,
    private notify: NotifyService,
  ) {}

  // ─── MAIN ENTRY POINT ───
  // Called by the ingest service after storing a message.
  // Decides: is the sender a pricing team member or a requester?
  // ─── MAIN ENTRY POINT ───

  // async routeMessage(msg: ChatMessage): Promise<string> {
  //   // Check for rate first — anyone can reply with a rate
  //   const rateReply = this.parser.parseRateReply(msg.body || '');

  //   if (rateReply) {
  //     this.logger.log(
  //       `[Matcher] Rate detected from ${msg.senderKey} (${msg.senderName || 'unknown'}) → rates: ${rateReply.rates.join(', ')}. Body: "${(msg.body || '').slice(0, 80)}"`,
  //     );
  //     const result = await this.handlePricerMessage(msg, rateReply);
  //     this.logger.log(
  //       `[Matcher] Classification: ${result}. Body: "${(msg.body || '').slice(0, 80)}"`,
  //     );
  //     return result;
  //   }

  //   // No rate → treat as requester message
  //   this.logger.log(
  //     `[Matcher] Message from ${msg.senderKey} (${msg.senderName || 'unknown'}) → routed as REQUESTER. Body: "${(msg.body || '').slice(0, 80)}"`,
  //   );
  //   const result = await this.handleRequesterMessage(msg);
  //   this.logger.log(
  //     `[Matcher] Classification: ${result}. Body: "${(msg.body || '').slice(0, 80)}"`,
  //   );
  //   return result;
  // }

  //9\9\26 updated done
  // async routeMessage(msg: ChatMessage): Promise<string> {
  //   const body = msg.body || '';

  //   // ─── FIRST: Check whether this is an inquiry/request ───
  //   // A genuine inquiry must take priority even if the message
  //   // also contains words such as RATE / IMPORT RATE / MARKET RATE.
  //   const parsedInquiry = this.parser.parseInquiry(body);

  //   if (parsedInquiry) {
  //     this.logger.log(
  //       `[Matcher] Inquiry detected from ${msg.senderKey} (${msg.senderName || 'unknown'}) → ` +
  //         `lane="${parsedInquiry.lane}", spec="${parsedInquiry.spec}"`,
  //     );

  //     const result = await this.handleRequesterMessage(msg);

  //     this.logger.log(
  //       `[Matcher] Classification: ${result}. Body: "${body.slice(0, 120)}"`,
  //     );

  //     return result;
  //   }

  //   // ─── SECOND: If it is not an inquiry, check for a rate reply ───
  //   const rateReply = this.parser.parseRateReply(body);

  //   if (rateReply) {
  //     this.logger.log(
  //       `[Matcher] Rate detected from ${msg.senderKey} (${msg.senderName || 'unknown'}) → ` +
  //         `rates: ${rateReply.rates.join(', ')}. Body: "${body.slice(0, 120)}"`,
  //     );

  //     const result = await this.handlePricerMessage(msg, rateReply);

  //     this.logger.log(
  //       `[Matcher] Classification: ${result}. Body: "${body.slice(0, 120)}"`,
  //     );

  //     return result;
  //   }

  //   // ─── THIRD: Nothing matched ───
  //   this.logger.log(
  //     `[Matcher] Message from ${msg.senderKey} (${msg.senderName || 'unknown'}) → OTHER. ` +
  //       `Body: "${body.slice(0, 120)}"`,
  //   );

  //   const result = await this.handleRequesterMessage(msg);

  //   this.logger.log(
  //     `[Matcher] Classification: ${result}. Body: "${body.slice(0, 120)}"`,
  //   );

  //   return result;
  // }

  async routeMessage(msg: ChatMessage): Promise<string> {
    const body = msg.body || '';

    // ─── FIRST: Check whether this is an inquiry/request ───

    // ─── Image inquiry placeholder → create inquiry immediately ───
    if (body === '[IMAGE INQUIRY]') {
      const inq = this.inquiryRepo.create({
        groupKey: msg.groupKey,
        messageId: msg.id,
        requesterKey: msg.senderKey,
        requesterName: this.config.requesterName(msg.senderKey, msg.senderName),
        postedAt: msg.postedAt,
        lane: '[Image Inquiry - check WhatsApp]',
        spec: '',
        vehicleType: '',
        rawBody: '[IMAGE INQUIRY - OCR pending]',
        status: 'OPEN',
        assignedToKey: null,
        assignedToName: null,
      });
      await this.inquiryRepo.save(inq);
      msg.inquiryId = inq.id;
      this.logger.log(`[Matcher] Image inquiry created → #${inq.id}`);
      return 'INQUIRY';
    }

    // A genuine inquiry must take priority even if the message
    // also contains words such as RATE / IMPORT RATE / MARKET RATE.
    const parsedInquiry = this.parser.parseInquiry(body);

    if (parsedInquiry) {
      this.logger.log(
        `[Matcher] Inquiry detected from ${msg.senderKey} (${msg.senderName || 'unknown'}) → ` +
          `lane="${parsedInquiry.lane}", spec="${parsedInquiry.spec}"`,
      );

      const result = await this.handleRequesterMessage(msg);

      this.logger.log(
        `[Matcher] Classification: ${result}. Body: "${body.slice(0, 120)}"`,
      );

      return result;
    }

    // ─── SECOND: If it is not an inquiry, check for a rate reply ───
    const rateReply = this.parser.parseRateReply(body);

    if (rateReply) {
      this.logger.log(
        `[Matcher] Rate detected from ${msg.senderKey} (${msg.senderName || 'unknown'}) → ` +
          `rates: ${rateReply.rates.join(', ')}. Body: "${body.slice(0, 120)}"`,
      );

      const result = await this.handlePricerMessage(msg, rateReply);

      this.logger.log(
        `[Matcher] Classification: ${result}. Body: "${body.slice(0, 120)}"`,
      );

      return result;
    }

    // ─── THIRD: Nothing matched ───
    this.logger.log(
      `[Matcher] Message from ${msg.senderKey} (${msg.senderName || 'unknown'}) → OTHER. ` +
        `Body: "${body.slice(0, 120)}"`,
    );

    const result = await this.handleRequesterMessage(msg);

    this.logger.log(
      `[Matcher] Classification: ${result}. Body: "${body.slice(0, 120)}"`,
    );

    return result;
  }

  // ─── Get open inquiries in a group within a time window ───
  // 8/9/26
  // private async getOpenInquiries(
  //   groupKey: string,
  //   before: Date,
  //   windowDays: number,
  // ): Promise<Inquiry[]> {
  //   const since = new Date(before.getTime() - windowDays * 86400000);
  //   return this.inquiryRepo.find({
  //     // where: { groupKey, status: 'OPEN', archived: false },
  //     // order: { postedAt: 'ASC' },
  //     // changes done 8/9/26
  //      .createQueryBuilder('i')
  //     .where('i.groupKey = :groupKey', { groupKey })
  //     .andWhere('i.status = :status', { status: 'OPEN' })
  //     .andWhere('i.archived = false')
  //     .andWhere('i.postedAt >= :since', { since })
  //     .orderBy('i.postedAt', 'ASC')
  //     .getMany()
  //   });
  // }
  private async getOpenInquiries(
    groupKey: string,
    before: Date,
    windowDays: number,
  ): Promise<Inquiry[]> {
    const since = new Date(before.getTime() - windowDays * 86400000);
    // changes done 8/9/26
    return this.inquiryRepo
      .createQueryBuilder('i')
      .where('i.groupKey = :groupKey', { groupKey })
      .andWhere('i.status = :status', { status: 'OPEN' })
      .andWhere('i.archived = false')
      .andWhere('i.postedAt >= :since', { since })
      .orderBy('i.postedAt', 'ASC')
      .getMany();
  }

  // ─── Auto-assign inquiry to the pricing person with the lightest load ───
  async autoAssign(): Promise<{ phone: string; name: string }> {
    const team = Object.entries(this.config.PRICING_TEAM).filter(
      ([, e]) => e.active,
    );
    const pool = team.length ? team : Object.entries(this.config.PRICING_TEAM);

    if (!pool.length) return { phone: '', name: 'unassigned' };

    // Count open inquiries per person
    const loads: Record<string, number> = {};
    for (const [phone] of pool) {
      loads[phone] = await this.inquiryRepo.count({
        where: { status: 'OPEN', assignedToKey: phone },
      });
    }

    // Find the person with the fewest open inquiries
    let pick = pool[0][0];
    for (const [phone] of pool) {
      if (loads[phone] < loads[pick]) {
        pick = phone;
      }
    }

    // Tiebreak: prefer isDefault, then lower assignOrder
    for (const [p] of pool) {
      const e = this.config.PRICING_TEAM[p];
      if (e.isDefault) {
        pick = p;
        break;
      }
      if (e.assignOrder < this.config.PRICING_TEAM[pick].assignOrder) pick = p;
    }

    return { phone: pick, name: this.config.PRICING_TEAM[pick].name };
  }

  // ─── Handle message from a requester (not pricing team) ───
  async handleRequesterMessage(msg: ChatMessage): Promise<string> {
    const body = msg.body || '';
    const parsed = this.parser.parseInquiry(body);

    if (parsed) {
      // ─── It's an inquiry! But is it a repost? ───
      // Check if this requester already has a similar open inquiry
      this.logger.log(
        `[Matcher] parseInquiry SUCCESS → lane="${parsed.lane}", spec="${parsed.spec}". Checking for repost...`,
      );

      const recent = await this.inquiryRepo.find({
        where: { groupKey: msg.groupKey, status: 'OPEN', archived: false },
        order: { postedAt: 'ASC' },
      });

      for (let i = recent.length - 1; i >= 0; i--) {
        const inq = recent[i];
        if (inq.requesterKey !== msg.senderKey) continue;
        const since = new Date(msg.postedAt.getTime() - 7 * 86400000);
        if (new Date(inq.postedAt) < since) continue;

        // If > 65% similar to an existing open inquiry → it's a chase, not new
        if (
          this.parser.jaccard(
            parsed.tokens,
            this.parser.tokensOf(inq.rawBody),
          ) > REPOST_SIM
        ) {
          this.logger.log(
            `[Matcher] Repost detected (similarity > ${REPOST_SIM}) → classified as CHASE`,
          );
          await this.recordChase(inq, msg, 're-posted the inquiry');
          return 'CHASE';
        }
      }

      this.logger.log(
        `[Matcher] New inquiry created → assigned to pricing team`,
      );

      // ─── Not a repost → create a new inquiry ───
      // const { phone, name } = await this.autoAssign();
      const inq = this.inquiryRepo.create({
        groupKey: msg.groupKey,
        messageId: msg.id,
        requesterKey: msg.senderKey,
        // requesterName:
        //   msg.senderName || this.config.requesterName(msg.senderKey),
        requesterName: this.config.requesterName(msg.senderKey, msg.senderName),
        postedAt: msg.postedAt,
        lane: parsed.lane,
        spec: parsed.spec,
        weights: [...parsed.weights].sort().join(','),
        vehicleType: parsed.vehicleType || '',
        rawBody: body,
        status: 'OPEN',
        // assignedToKey: phone,
        // assignedToName: name,
        assignedToKey: null, // ← Do not auto-assign
        assignedToName: null, // ← Do not auto-assign
      });
      await this.inquiryRepo.save(inq);

      // Log the assignment event
      // await this.eventRepo.save(
      //   this.eventRepo.create({
      //     inquiryId: inq.id,
      //     at: msg.postedAt,
      //     kind: 'ASSIGNED',
      //     actor: 'system',
      //     channel: 'system',
      //     detail: `auto-assigned to ${name}`,
      //   }),
      // );

      msg.inquiryId = inq.id;
      return 'INQUIRY';
    }

    // ─── Not an inquiry. Is it a chase? ───
    if (this.parser.isChase(body)) {
      this.logger.log(
        `[Matcher] parseInquiry FAILED but isChase detected → checking for chase target...`,
      );
      const since = new Date(
        msg.postedAt.getTime() - CHASE_WINDOW_DAYS * 86400000,
      );
      const newest = await this.inquiryRepo.findOne({
        where: {
          groupKey: msg.groupKey,
          requesterKey: msg.senderKey,
          status: 'OPEN',
          archived: false,
        },
        order: { postedAt: 'DESC' },
      });

      if (newest && new Date(newest.postedAt) >= since) {
        await this.recordChase(newest, msg, 'chase message in group');
        return 'CHASE';
      }
    }
    this.logger.warn(
      `[Matcher] parseInquiry FAILED and isChase FAILED → classified as OTHER. Body: "${body.slice(0, 120)}"`,
    );
    return 'OTHER';
  }

  // ─── Handle message from a pricing team member ───

  // ─── Handle message from a pricing team member ───
  async handlePricerMessage(
    msg: ChatMessage,
    preParsedReply?: any,
  ): Promise<string> {
    const reply = preParsedReply || this.parser.parseRateReply(msg.body || '');

    if (!reply) {
      this.logger.warn(
        `[Matcher] Pricer message has no rate values → classified as OTHER. Body: "${(msg.body || '').slice(0, 120)}"`,
      );
      return 'OTHER';
    }
    this.logger.log(
      `[Matcher] Pricer message parsed → rates: ${reply.rates.join(', ')}. Looking for matching inquiry...`,
    );

    // Get all open inquiries in this group within the match window
    const cands = await this.getOpenInquiries(
      msg.groupKey,
      msg.postedAt,
      MATCH_WINDOW_DAYS,
    );
    if (!cands.length) return 'RATE_REPLY';

    let best: Inquiry | null = null;
    let basis: string | null = null;

    // ─── Pass 0: WhatsApp "Reply" feature (ground truth) ───
    if (msg.quotedWaId) {
      const quoted = await this.messageRepo.findOne({
        where: { waMessageId: msg.quotedWaId },
      });
      if (quoted?.inquiryId) {
        const inq = await this.inquiryRepo.findOne({
          where: { id: quoted.inquiryId },
        });
        if (inq && inq.status === 'OPEN' && inq.groupKey === msg.groupKey) {
          best = inq;
          basis = 'whatsapp_reply';
        }
      }
    }

    // ─── Pass 0b: Quoted text match ───
    if (!best && msg.quotedText) {
      const qtoks = this.parser.tokensOf(msg.quotedText);
      let b: Inquiry | null = null;
      let bScore = 0;
      for (const inq of cands) {
        const score = this.parser.jaccard(
          qtoks,
          this.parser.tokensOf(inq.rawBody),
        );
        if (score > bScore) {
          b = inq;
          bScore = score;
        }
      }
      if (b && bScore >= 0.35) {
        best = b;
        basis = 'whatsapp_reply_text';
      }
    }

    // ─── Pass 1: Content similarity (token overlap + weight match) ───
    if (!best) {
      let b: Inquiry | null = null;
      let bScore = 0;
      for (const inq of cands) {
        let score = this.parser.jaccard(
          reply.tokens,
          this.parser.tokensOf(inq.rawBody),
        );
        const inqWeights = new Set(
          (inq.weights || '').split(',').filter(Boolean),
        );
        if (inqWeights.size && reply.weights.size) {
          for (const w of reply.weights) {
            if (inqWeights.has(w)) {
              score += 0.5;
              break;
            }
          }
        }
        if (score > bScore) {
          b = inq;
          bScore = score;
        }
      }
      if (b && bScore >= QUOTED_MATCH) {
        best = b;
        basis = 'quoted';
      }
    }

    // ─── Pass 2: DISABLED — No more guessing ───
    if (!best) {
      this.logger.log(
        `[Matcher] No confident match found for rate ${reply.rates.join(', ')} — leaving unmatched (no sequence match)`,
      );
      return 'RATE_REPLY';
    }

    if (!best || !basis) return 'RATE_REPLY';

    if (best.status === 'QUOTED' && best.quotedAt) {
      await this.markRateChanged(
        best,
        msg,
        reply.rates,
        reply.sizeRates,
        basis,
      );
    } else {
      await this.markQuoted(best, msg, reply.rates, reply.sizeRates, basis);
    }

    return 'RATE_REPLY';
  }

  // async handlePricerMessage(
  //   msg: ChatMessage,
  //   preParsedReply?: any,
  // ): Promise<string> {
  //   const reply = preParsedReply || this.parser.parseRateReply(msg.body || '');

  //   if (!reply) {
  //     this.logger.warn(
  //       `[Matcher] Pricer message has no rate values → classified as OTHER. Body: "${(msg.body || '').slice(0, 120)}"`,
  //     );
  //     return 'OTHER';
  //   }
  //   this.logger.log(
  //     `[Matcher] Pricer message parsed → rates: ${reply.rates.join(', ')}. Looking for matching inquiry...`,
  //   );

  //   // Get all open inquiries in this group within the match window
  //   const cands = await this.getOpenInquiries(
  //     msg.groupKey,
  //     msg.postedAt,
  //     MATCH_WINDOW_DAYS,
  //   );
  //   if (!cands.length) return 'RATE_REPLY'; // rate but nothing to match → keep for audit

  //   let best: Inquiry | null = null;
  //   let basis: string | null = null;

  //   // ─── Pass 0: WhatsApp "Reply" feature (ground truth) ───
  //   // If the pricer used WhatsApp's reply button, we know exactly which
  //   // message they replied to. This is the most reliable match.
  //   if (msg.quotedWaId) {
  //     const quoted = await this.messageRepo.findOne({
  //       where: { waMessageId: msg.quotedWaId },
  //     });
  //     if (quoted?.inquiryId) {
  //       const inq = await this.inquiryRepo.findOne({
  //         where: { id: quoted.inquiryId },
  //       });
  //       if (inq && inq.status === 'OPEN' && inq.groupKey === msg.groupKey) {
  //         best = inq;
  //         basis = 'whatsapp_reply';
  //       }
  //     }
  //   }

  //   // ─── Pass 0b: Quoted text match ───
  //   // If we have the text of the message being replied to (but not the ID),
  //   // match it against candidate inquiries by token similarity
  //   if (!best && msg.quotedText) {
  //     const qtoks = this.parser.tokensOf(msg.quotedText);
  //     let b: Inquiry | null = null;
  //     let bScore = 0;
  //     for (const inq of cands) {
  //       const score = this.parser.jaccard(
  //         qtoks,
  //         this.parser.tokensOf(inq.rawBody),
  //       );
  //       if (score > bScore) {
  //         b = inq;
  //         bScore = score;
  //       }
  //     }
  //     if (b && bScore >= 0.35) {
  //       best = b;
  //       basis = 'whatsapp_reply_text';
  //     }
  //   }

  //   // ─── Pass 1: Content similarity (token overlap + weight match) ───
  //   if (!best) {
  //     let b: Inquiry | null = null;
  //     let bScore = 0;
  //     for (const inq of cands) {
  //       let score = this.parser.jaccard(
  //         reply.tokens,
  //         this.parser.tokensOf(inq.rawBody),
  //       );
  //       // If both have matching weights, add 0.5 to the score
  //       const inqWeights = new Set(
  //         (inq.weights || '').split(',').filter(Boolean),
  //       );
  //       if (inqWeights.size && reply.weights.size) {
  //         for (const w of reply.weights) {
  //           if (inqWeights.has(w)) {
  //             score += 0.5;
  //             break;
  //           }
  //         }
  //       }
  //       if (score > bScore) {
  //         b = inq;
  //         bScore = score;
  //       }
  //     }
  //     if (b && bScore >= QUOTED_MATCH) {
  //       best = b;
  //       basis = 'quoted';
  //     }
  //   }

  //   // ─── Pass 2: FIFO fallback (oldest open inquiry within 24h) ───
  //   // if (!best) {
  //   //   const cutoff = new Date(
  //   //     msg.postedAt.getTime() - SEQUENCE_WINDOW_HOURS * 3600000,
  //   //   );
  //   //   const near = cands.filter((i) => new Date(i.postedAt) >= cutoff);
  //   //   if (near.length) {
  //   //     best = near[0]; // oldest one
  //   //     basis = 'sequence';
  //   //   }
  //   // }

  //   // ─── Pass 2: DISABLED — No more guessing ───
  //   // If Pass 0 (WhatsApp reply), Pass 0b (quoted text), and Pass 1 (content similarity)
  //   // all failed to find a match, we do NOT guess.
  //   // The rate is left unmatched so the coordinator can assign it manually.
  //   if (!best) {
  //     this.logger.log(
  //       `[Matcher] No confident match found for rate ${reply.rates.join(', ')} — leaving unmatched (no sequence match)`,
  //     );
  //     return 'RATE_REPLY';
  //   }

  //   // Changed 8/9/26
  //   // ─── Pass 2: FIFO fallback (oldest open inquiry within 24h) ───
  //   // Only auto-attach if there's exactly ONE candidate — no ambiguity.
  //   // If multiple open inquiries exist and content didn't match any of them,
  //   // don't guess: log it so the coordinator can manually assign the rate.
  //   // ─── Pass 2: FIFO fallback (smarter matching) ───
  //   if (!best) {
  //     const cutoff = new Date(
  //       msg.postedAt.getTime() - SEQUENCE_WINDOW_HOURS * 3600000,
  //     );
  //     const near = cands.filter((i) => new Date(i.postedAt) >= cutoff);

  //     if (near.length === 1) {
  //       // Only one open inquiry → match it
  //       best = near[0];
  //       basis = 'sequence';
  //     } else if (near.length > 1) {
  //       // Multiple open inquiries → try size-based matching first
  //       // If the rate reply mentions a container size, match to inquiry with same size
  //       const replyText = msg.body || '';
  //       const replySizes =
  //         replyText.match(/\d+\s*(?:x\s*\d+'?|'|ft|feet)/gi) || [];

  //       if (replySizes.length) {
  //         for (const inq of near) {
  //           const inqType = (inq.vehicleType || '').toLowerCase();
  //           for (const rs of replySizes) {
  //             const rsClean = rs.replace(/\s+/g, '').toLowerCase();
  //             if (
  //               inqType.includes(rsClean) ||
  //               (inq.vehicleType || '').toLowerCase().includes(rsClean)
  //             ) {
  //               best = inq;
  //               basis = 'size_match';
  //               break;
  //             }
  //           }
  //           if (best) break;
  //         }
  //       }

  //       // If size matching failed, fall back to closest in time
  //       if (!best) {
  //         // let closest: Inquiry | null = null;
  //         // let minGap = Infinity;
  //         // for (const inq of near) {
  //         //   const gap =
  //         //     msg.postedAt.getTime() - new Date(inq.postedAt).getTime();
  //         //   if (gap > 0 && gap < minGap) {
  //         //     minGap = gap;
  //         //     closest = inq;
  //         //   }
  //         // }
  //         // if (closest) {
  //         //   best = closest;
  //         //   basis = 'sequence';
  //         // }
  //         // ─── DISABLED: Sequence match causes wrong matches when pricers
  //         // reply to image/photo inquiries that the system can't parse.
  //         // Instead of guessing, leave the rate unmatched. ───
  //         this.logger.log(
  //           `[Matcher] No confident match found for rate ${reply.rates.join(', ')} — likely replying to an image inquiry. Leaving unmatched.`,
  //         );
  //         return 'RATE_REPLY'; // Rate exists but no inquiry matched
  //       }
  //     }
  //   }

  //   if (!best || !basis) return 'RATE_REPLY';

  //  // if (best.status === 'QUOTED' && best.quotedAt) {
  //   // // // ─── We have a match! Is it already quoted? ───
  //      // Already quoted → this is a RATE CHANGE
  //   //   await this.markRateChanged(best, msg, reply.rates, basis);
  //   // } else {
  //   //   // Not quoted yet → this is the first quote
  //   //   await this.markQuoted(best, msg, reply.rates, basis);
  //   // }

  //   if (best.status === 'QUOTED' && best.quotedAt) {
  //     await this.markRateChanged(
  //       best,
  //       msg,
  //       reply.rates,
  //       reply.sizeRates,
  //       basis,
  //     );
  //   } else {
  //     await this.markQuoted(best, msg, reply.rates, reply.sizeRates, basis);
  //   }

  //   return 'RATE_REPLY';
  // }

  // ─── Mark an inquiry as quoted (rate given) ───
  // private async markQuoted(
  //   inq: Inquiry,
  //   msg: ChatMessage,
  //   rates: string[],
  //   basis: string,
  // ) {
  //   inq.status = 'QUOTED';
  //   inq.quotedAt = msg.postedAt;
  //   const phone =
  //     this.config.pricerPhoneFor(msg.senderKey, msg.senderName) ||
  //     msg.senderKey;
  //   inq.quotedByKey = phone;
  //   inq.quotedByName = this.config.pricerName(phone);
  //   inq.quotedRates = rates.join(' / ');
  //   inq.quoteMessageId = msg.id;
  //   inq.matchBasis = basis;
  //   inq.tatSeconds =
  //     (msg.postedAt.getTime() - new Date(inq.postedAt).getTime()) / 1000;
  //   if (!inq.firstResponseAt) inq.firstResponseAt = msg.postedAt;

  //   await this.inquiryRepo.save(inq);

  //   await this.eventRepo.save(
  //     this.eventRepo.create({
  //       inquiryId: inq.id,
  //       at: msg.postedAt,
  //       kind: 'QUOTED',
  //       actor: inq.quotedByName,
  //       channel: 'whatsapp',
  //       detail: `rate ${inq.quotedRates} (${basis} match)`,
  //       messageId: msg.id,
  //     }),
  //   );
  // }

  // ─── Mark an inquiry as quoted (rate given) ───
  private async markQuoted(
    inq: Inquiry,
    msg: ChatMessage,
    rates: string[],
    sizeRates: { size: string; rate: string }[], // ← ADD
    basis: string,
  ) {
    inq.status = 'QUOTED';
    inq.quotedAt = msg.postedAt;
    const phone =
      this.config.pricerPhoneFor(msg.senderKey, msg.senderName) ||
      msg.senderKey;
    // ─── FIX: Always prefer the configured team name over WhatsApp name ───
    const configName = this.config.pricerName(phone);
    const displayName =
      configName && configName !== phone ? configName : msg.senderName || phone;

    inq.quotedByKey = phone;
    inq.quotedByName = displayName;

    // inq.quotedRates = rates.join(' / ');
    // ─── Use structured size:rate pairs when available, else flat list ───
    inq.quotedRates = sizeRates.length
      ? sizeRates.map((r) => `${r.size}: ₹${r.rate}`).join(' / ')
      : rates.join(' / ');
    inq.quotedRatesDetail = sizeRates.length ? JSON.stringify(sizeRates) : null;

    // ─── AUTO-ASSIGN: Whoever gives the rate becomes the assigned pricer ───
    inq.assignedToKey = phone;
    inq.assignedToName = displayName;
    inq.quoteMessageId = msg.id;

    inq.quoteMessageId = msg.id;
    inq.matchBasis = basis;
    inq.tatSeconds =
      (msg.postedAt.getTime() - new Date(inq.postedAt).getTime()) / 1000;
    if (!inq.firstResponseAt) inq.firstResponseAt = msg.postedAt;

    await this.inquiryRepo.save(inq);

    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: inq.id,
        at: msg.postedAt,
        kind: 'QUOTED',
        actor: displayName,
        channel: 'whatsapp',
        detail: `rate ${inq.quotedRates} (${basis} match)`,
        messageId: msg.id,
      }),
    );

    // ─── SEND WHATSAPP TO REQUESTER: "Your rate has been quoted" ───
    const requesterPhone = inq.requesterKey || '';
    if (requesterPhone) {
      const rateMsg =
        `✅ Rate Update\n\n` +
        `Inquiry #${inq.id}\n` +
        `Lane: ${inq.lane}\n` +
        `Vehicle Type: ${inq.vehicleType || '-'}\n\n` +
        `Rate: ₹${inq.quotedRates}\n` +
        `Quoted by: ${inq.quotedByName}/${inq.quotedByKey}\n` +
        `TAT: ${Math.round(inq.tatSeconds / 60)} min\n\n` +
        `Thank you for your inquiry.`;

      // const sent = await this.notify.sendWhatsapp(requesterPhone, rateMsg);
      // ─── FIX: Only send if auto WhatsApp is enabled ───
      const sent = this.config.autoWhatsAppEnabled
        ? await this.notify.sendWhatsapp(requesterPhone, rateMsg)
        : false;

      // ─── Log whether rate confirmation was sent to requester ───
      await this.eventRepo.save(
        this.eventRepo.create({
          inquiryId: inq.id,
          at: new Date(),
          kind: 'RATE_SENT',
          actor: 'system',
          channel: sent ? 'whatsapp' : 'console',
          // detail: sent
          //   ? `Rate confirmation sent to ${inq.requesterName} (${requesterPhone})`
          //   : `Rate confirmation not sent (WA not configured)`,
          detail: sent
            ? `Rate confirmation sent to ${inq.requesterName} (${requesterPhone})`
            : this.config.autoWhatsAppEnabled
              ? `Rate confirmation not sent (WA not configured)`
              : `Auto WhatsApp disabled — coordinator can send manually`,
        }),
      );
    }
  }

  // private async markRateChanged(
  //   inq: Inquiry,
  //   msg: ChatMessage,
  //   newRates: string[],

  //   basis: string,
  // ) {
  //   // const oldRates = inq.quotedRates || '';
  //   // const newRatesStr = newRates.join(' / ');
  //       const oldRates = inq.quotedRates || '';
  //   // Note: newRates is still string[] here since markRateChanged's signature
  //   // doesn't currently receive sizeRates — see call-site note below.
  //   const newRatesStr = newRates.join(' / ');
  //   const phone =
  //     this.config.pricerPhoneFor(msg.senderKey, msg.senderName) ||
  //     msg.senderKey;

  //   // ─── Save old rate before overwriting with new ───
  //   inq.previousRates = oldRates;
  //   inq.quotedRates = newRatesStr;
  //   inq.quoteMessageId = msg.id;
  //   inq.quotedByKey = phone;
  //   inq.quotedByName = this.config.pricerName(phone) || inq.quotedByName;
  //   if (!inq.firstResponseAt) inq.firstResponseAt = msg.postedAt;

  //   await this.inquiryRepo.save(inq);

  //   await this.eventRepo.save(
  //     this.eventRepo.create({
  //       inquiryId: inq.id,
  //       at: msg.postedAt,
  //       kind: 'RATE_CHANGED',
  //       actor: inq.quotedByName,
  //       channel: 'whatsapp',
  //       detail: `rate changed: ${oldRates || '—'} → ${newRatesStr} (${basis} match)`,
  //       messageId: msg.id,
  //     }),
  //   );

  //   this.logger.log(
  //     `[Matcher] Rate CHANGED on inquiry #${inq.id}: ${oldRates || '—'} → ${newRatesStr}`,
  //   );
  // }

  private async markRateChanged(
    inq: Inquiry,
    msg: ChatMessage,
    newRates: string[],
    newSizeRates: { size: string; rate: string }[], // ← ADD
    basis: string,
  ) {
    const oldRates = inq.quotedRates || '';
    const newRatesStr = newSizeRates.length
      ? newSizeRates.map((r) => `${r.size}: ₹${r.rate}`).join(' / ')
      : newRates.join(' / ');

    const phone =
      this.config.pricerPhoneFor(msg.senderKey, msg.senderName) ||
      msg.senderKey;

    inq.previousRates = oldRates;
    inq.quotedRates = newRatesStr;
    inq.quotedRatesDetail = newSizeRates.length
      ? JSON.stringify(newSizeRates)
      : null; // ← ADD
    inq.quoteMessageId = msg.id;
    inq.quotedByKey = phone;
    inq.quotedByName = this.config.pricerName(phone) || inq.quotedByName;
    if (!inq.firstResponseAt) inq.firstResponseAt = msg.postedAt;

    await this.inquiryRepo.save(inq);

    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: inq.id,
        at: msg.postedAt,
        kind: 'RATE_CHANGED',
        actor: inq.quotedByName,
        channel: 'whatsapp',
        detail: `rate changed: ${oldRates || '—'} → ${newRatesStr} (${basis} match)`,
        messageId: msg.id,
      }),
    );

    this.logger.log(
      `[Matcher] Rate CHANGED on inquiry #${inq.id}: ${oldRates || '—'} → ${newRatesStr}`,
    );
  }

  // ─── Record a chase (requester followed up) ───
  private async recordChase(inq: Inquiry, msg: ChatMessage, note: string) {
    inq.followupCount = (inq.followupCount || 0) + 1;
    await this.inquiryRepo.save(inq);

    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: inq.id,
        at: msg.postedAt,
        kind: 'CHASE',
        actor: msg.senderName || msg.senderKey,
        channel: 'whatsapp',
        detail: note,
        messageId: msg.id,
      }),
    );
  }

  // ─── Force classify a message as inquiry (manual override from dashboard) ───
  async forceClassifyAsInquiry(msg: ChatMessage): Promise<Inquiry> {
    const body = msg.body || '';
    const parsed = this.parser.parseInquiry(body);
    const lane = parsed ? parsed.lane : this.parser.laneOf(body);
    const spec = parsed && parsed.spec ? parsed.spec : body.slice(0, 160);
    const weights = parsed ? parsed.weights : this.parser.weightsOf(body);

    const { phone, name } = await this.autoAssign();
    const inq = this.inquiryRepo.create({
      groupKey: msg.groupKey,
      messageId: msg.id,
      requesterKey: msg.senderKey,
      requesterName: msg.senderName || this.config.requesterName(msg.senderKey),
      postedAt: msg.postedAt,
      lane,
      spec,
      weights: [...weights].sort().join(','),
      vehicleType: parsed
        ? (parsed as any).vehicleType || ''
        : this.parser.vehicleTypeOf(body),
      rawBody: body,
      status: 'OPEN',
      assignedToKey: phone,
      assignedToName: name,
    });
    await this.inquiryRepo.save(inq);

    await this.eventRepo.save(
      this.eventRepo.create({
        inquiryId: inq.id,
        at: msg.postedAt,
        kind: 'ASSIGNED',
        actor: 'system',
        channel: 'system',
        detail: `auto-assigned to ${name} (manually classified by coordinator)`,
      }),
    );

    msg.classification = 'INQUIRY';
    msg.inquiryId = inq.id;
    return inq;
  }
}

// This is the core routing engine. Every message goes through here after being stored.

// routeMessage(msg) — the entry point
// When a message arrives:

// Check if sender is a pricing team member (via config.pricerPhoneFor())
// If yes → their message might be a rate reply → call handlePricerMessage()
// If no → their message might be an inquiry or chase → call handleRequesterMessage()
// handleRequesterMessage(msg) — for regular senders

// Message arrives from "Shashikant"
//   │
//   ├── parseInquiry(body) → does it look like a rate inquiry?
//   │     │
//   │     ├── YES → Check for repost (Jaccard > 0.65 vs existing open inquiries?)
//   │     │         ├── YES → record as CHASE (same person re-posting)
//   │     │         └── NO  → create new Inquiry, auto-assign to pricer, log ASSIGNED event
//   │     │
//   │     └── NO → isChase(body)? ("rate?", "plz", "jaldi")
//   │               ├── YES → find their newest open inquiry → record CHASE
//   │               └── NO  → OTHER
// handlePricerMessage(msg) — for pricing team members
// This is where the 3-pass matching happens:

// Message arrives from "Kamlesh Yogi" (pricing team member)
//   │
//   ├── parseRateReply(body) → does it contain rate values?
//   │     │
//   │     └── YES → Get all open inquiries in this group (last 5 days)
//   │
//   ├── Pass 0: WhatsApp Reply feature (best match)
//   │     Did Kamlesh use WhatsApp's reply button?
//   │     → Evolution API gives us quotedWaId (the original message ID)
//   │     → Find that message → find its inquiry → match!
//   │     → basis = "whatsapp_reply"
//   │
//   ├── Pass 0b: Quoted text match
//   │     No message ID, but we have the quoted text?
//   │     → Tokenize the quoted text, compare to each inquiry's rawBody
//   │     → Best Jaccard score >= 0.35 → match!
//   │     → basis = "whatsapp_reply_text"
//   │
//   ├── Pass 1: Content similarity
//   │     Tokenize the rate reply, compare to each inquiry's rawBody
//   │     If weight values overlap → +0.5 to score
//   │     Best score >= 0.55 → match!
//   │     → basis = "quoted"
//   │
//   └── Pass 2: FIFO fallback (last resort)
//         Oldest open inquiry within 24 hours → match!
//         → basis = "sequence"
// autoAssign() — round-robin assignment
// When a new inquiry is created, we assign it to the pricing person who currently has the fewest open inquiries. If two people are tied, the one with isDefault = true wins, otherwise the lower assignOrder wins.

// This ensures fair distribution of work across the team.

// forceClassifyAsInquiry(msg) — manual override
// If the parser misses a real inquiry (classified it as OTHER), the coordinator can manually mark it as an inquiry from the dashboard. This method creates the inquiry and assigns it, using the parser for extraction if possible, but falling back to raw text if the parser found nothing.
