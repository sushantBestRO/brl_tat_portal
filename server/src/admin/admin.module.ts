import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from '../entities/message.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { Event } from '../entities/event.entity';
import { OtpChallenge } from '../entities/otp-challenge.entity';
import { AdminController } from './admin.controller';
import { NotifyModule } from '../notify/notify.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, Inquiry, Event, OtpChallenge]),
    NotifyModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
