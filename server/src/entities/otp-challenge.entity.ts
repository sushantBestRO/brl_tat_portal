import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('otp_challenges')
export class OtpChallenge {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  code!: string;

  @Index()
  @Column()
  purpose!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ default: false })
  used!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}


// One-time codes for the hard-delete admin action.