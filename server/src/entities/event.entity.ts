import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Inquiry } from './inquiry.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  inquiryId!: number;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  at!: Date;

  @Index()
  @Column()
  kind!: string;

  @Column({ nullable: true })
  actor!: string;

  @Column({ nullable: true })
  channel!: string;

  @Column({ type: 'text', nullable: true })
  detail!: string;

  @Column({ nullable: true })
  messageId!: number;

  @ManyToOne(() => Inquiry, (i) => i.events)
  @JoinColumn({ name: 'inquiryId' })
  inquiry!: Inquiry;
}


// The kind field can be:




// Kind	When it's created
// ASSIGNED	System auto-assigns inquiry to a pricing person
// CHASE	Requester follows up ("rate?", "plz")
// REMINDER_WA	System sends WhatsApp nudge (AMBER)
// REMINDER_EMAIL	System sends escalation email (RED)
// CALL_TASK	System creates call task for coordinator (RED)
// CALL_LOGGED	Coordinator logs a call outcome
// QUOTED	Rate reply matched to inquiry
// STATUS_CHANGE	Inquiry closed (won/lost/withdrawn)
// REASSIGNED	Manual reassignment
// Example: When you look at an inquiry's detail page, the "Event History" section is just a query: SELECT * FROM events WHERE inquiryId = 7 ORDER BY at ASC.