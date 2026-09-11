import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn()
  key!: string;

  @Column({ default: '' })
  value!: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}


// Key/value store for editable config (coordinator info, SMTP creds, WhatsApp provider).