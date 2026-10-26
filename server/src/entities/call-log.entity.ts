import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// ─── Call log: every click-to-call attempt via Runo ───
// status: INITIATED → CONNECTED → COMPLETED
//              └────► NO_ANSWER | BUSY | FAILED
@Entity('call_log')
export class CallLog {
  @PrimaryGeneratedColumn()
  id!: number;

  // which inquiry this call was made from (null = ad-hoc call)
  @Index()
  @Column({ type: 'int', nullable: true })
  inquiryId!: number | null;

  @Column({ default: '' })
  customerName!: string;

  @Index()
  @Column({ default: '' })
  customerPhone!: string;

  @Column({ default: '' })
  agentName!: string;

  // the number that rings FIRST (then bridges to the customer)
  @Column({ default: '' })
  agentPhone!: string;

  @Column({ default: 'INITIATED' })
  status!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  connectedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  durationSeconds!: number | null;

  @Column({ default: 'coordinator' })
  initiatedBy!: string;

  // raw Runo API response / webhook payload — kept for debugging
  @Column({ type: 'text', default: '' })
  runoResponse!: string;

  @Column({ type: 'text', default: '' })
  note!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
