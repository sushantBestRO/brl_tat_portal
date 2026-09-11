import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('classification_phrases')
export class ClassificationPhrase {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  phrase!: string;

  @Index()
  @Column({ default: 'ask' })
  kind!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  createdBy!: string;
}


// Explanation: If a coordinator notices the parser missed a phrase like "plz place", they can add it via the Settings page. kind is either ask (counts as a rate request) or chase (counts as a follow-up nudge).