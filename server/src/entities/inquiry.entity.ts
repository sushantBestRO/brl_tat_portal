import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  groupKey!: string;

  @Column({ nullable: true })
  messageId!: number;

  @Index()
  @Column()
  requesterKey!: string;

  @Column()
  requesterName!: string;

  @Index()
  @Column({ type: 'timestamptz' })
  postedAt!: Date;

  @Column()
  lane!: string;

  @Column()
  spec!: string;

  @Column({ default: '' })
  weights!: string;

  @Column({ default: '' })
  vehicleType!: string;

  @Column({ type: 'text' })
  rawBody!: string;

  @Index()
  @Column({ default: 'OPEN' })
  status!: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  assignedToKey!: string | null;

  @Column({ type: 'varchar', nullable: true })
  assignedToName!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  firstResponseAt!: Date;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  quotedAt!: Date;

  @Column({ nullable: true })
  quotedByKey!: string;

  @Index()
  @Column({ nullable: true })
  quotedByName!: string;

  @Column({ nullable: true })
  quotedRates!: string;

  // ─── ADD THIS: stores the old rate when a rate change happens ───
  @Column({ type: 'varchar', nullable: true })
  previousRates!: string | null;

  @Column({ type: 'text', nullable: true })
  quotedRatesDetail!: string | null;

  @Column({ nullable: true })
  quoteMessageId!: number;

  @Column({ nullable: true })
  matchBasis!: string;

  @Column({ type: 'float', nullable: true })
  tatSeconds!: number;

  @Column({ default: 0 })
  followupCount!: number;

  @Column({ default: 0 })
  reminderCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt!: Date;

  @Column({ nullable: true })
  closeReason!: string;

  @Index()
  @Column({ default: false })
  archived!: boolean;

  @OneToMany(() => Event, (e) => e.inquiry)
  events!: Event[];

  get ageMinutes(): number {
    const end = this.quotedAt || new Date();
    return (
      Math.round(
        ((end.getTime() - new Date(this.postedAt).getTime()) / 60000) * 10,
      ) / 10
    );
  }

  get tatDisplay(): string {
    if (this.tatSeconds == null) return '-';
    const m = Math.floor(this.tatSeconds / 60);
    return m >= 60
      ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
      : `${m}m`;
  }
}

// The lifecycle of an inquiry:

// OPEN → QUOTED → CLOSED_WON
//                 ↘ CLOSED_LOST
//                 ↘ WITHDRAWN
// Key fields:

// lane — e.g. "JNPT to Bhopal (M.P.)" (first line of the message)
// spec — e.g. "1x20' | weight 20300 kg" (container size, weight)
// weights — extracted weight values (used for matching rate replies)
// status — where it is in the lifecycle
// assignedToKey/Name — which pricing person is responsible
// quotedAt — when the rate was given
// quotedRates — the actual rate values (e.g. "95000 / 95500")
// matchBasis — HOW the rate reply was matched: whatsapp_reply, quoted, sequence, or manual
// tatSeconds — time from posting to quoting (the key metric)
// followupCount — how many times the requester chased ("rate?", "plz", etc.)
// reminderCount — how many system nudges were sent
// The ageMinutes getter is computed on the fly (not stored) — it changes every second. The dashboard uses it for live timers.
