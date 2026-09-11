import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('pricing_team')
export class PricingTeamMember {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ unique: true })
  phone!: string;

  @Column()
  name!: string;

  @Column({ default: '' })
  email!: string;

  // ─── ADD THIS COLUMN ───
  @Column({ default: '' })
  role!: string;

  @Column({ default: '' })
  aliases!: string;

  @Column({ default: 99 })
  assignOrder!: number;

  @Column({ default: true })
  active!: boolean;

  @Column({ default: false })
  isDefault!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}

// phone — their WhatsApp number (used to send nudges + identify them in messages)
// aliases — comma-separated alternate display names (WhatsApp names can change)
// assignOrder — when two people have the same workload, lower number gets priority
// active — set to false when someone is on leave (skip in auto-assignment)
// isDefault — preferred pick when loads are tied
