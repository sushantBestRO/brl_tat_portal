import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry, Event } from '../entities';
import { RemindersService } from './reminders.service';
import { NotifyModule } from '../notify/notify.module';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry, Event]), NotifyModule, AppConfigModule],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}


// TypeOrmModule.forFeature([Inquiry, Event]) — reads inquiries, writes events
// NotifyModule — needs to send WhatsApp + email
// AppConfigModule — needs TAT thresholds, quiet hours, templates, coordinator info
// exports: [RemindersService] — the cron module will call tick()