import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ unique: true })
  waMessageId!: string;

  @Index()
  @Column()
  groupKey!: string;

  @Index()
  @Column()
  senderKey!: string;

  @Column({ type: 'varchar', nullable: true })
  senderName!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @Index()
  @Column({ type: 'timestamptz' })
  postedAt!: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  ingestedAt!: Date;

  @Column({ default: 'webhook' })
  source!: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  classification!: string | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  inquiryId!: number | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  quotedWaId!: string | null;

  @Column({ type: 'text', nullable: true })
  quotedText!: string | null;

  @Index()
  @Column({ default: false })
  archived!: boolean;
}




// import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

// @Entity('messages')
// export class ChatMessage {
//   @PrimaryGeneratedColumn()
//   id!: number;

//   @Index()
//   @Column({ unique: true })
//   waMessageId!: string;

//   @Index()
//   @Column()
//   groupKey!: string;

//   @Index()
//   @Column()
//   senderKey!: string;

//   @Column({ nullable: true })
//   senderName!: string | null;

//   @Column({ type: 'text' })
//   body!: string;

//   @Index()
//   @Column({ type: 'timestamptz' })
//   postedAt!: Date;

//   @Column({ type: 'timestamptz', default: () => 'NOW()' })
//   ingestedAt!: Date;

//   @Column({ default: 'webhook' })
//   source!: string;

//   @Index()
//   @Column({ nullable: true })
//   classification!: string | null;

//   @Index()
//   @Column({ nullable: true })
//   inquiryId!: number | null;

//   @Index()
//   @Column({ nullable: true })
//   quotedWaId!: string | null;

//   @Column({ type: 'text', nullable: true })
//   quotedText!: string | null;

//   @Index()
//   @Column({ default: false })
//   archived!: boolean;
// }


// @Entity('messages') — tells TypeORM: create a table called messages
// @PrimaryGeneratedColumn() — auto-incrementing primary key (1, 2, 3, ...)
// @Column() — a column in the table
// @Index() — creates a database index on that column for faster lookups
// waMessageId — WhatsApp's own message ID (or our SHA1 hash if none). Marked unique: true so we never store the same message twice (idempotent).
// groupKey — which WhatsApp group this came from
// senderKey — sender's phone number
// body — the actual message text
// postedAt — when the message was sent in WhatsApp (IST)
// classification — what the parser classified it as: INQUIRY, RATE_REPLY, CHASE, or OTHER
// inquiryId — links to the inquiry table if this message created or matched an inquiry
// quotedWaId / quotedText — if someone used WhatsApp's "Reply" feature, this holds the original message's ID and text. Used by the matcher for accurate rate-to-inquiry matching.