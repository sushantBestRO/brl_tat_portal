import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Exclude()
  @Column()
  passwordHash!: string;

  @Column({ default: 'coordinator' })
  role!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}


// Login users for the React frontend.

// @Exclude() ensures the password hash is never returned in API responses, even by accident. The id is a UUID (universally unique identifier) instead of auto-increment.