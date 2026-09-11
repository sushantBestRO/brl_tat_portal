import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { Event } from '../entities/event.entity';
import { ChatMessage } from 'src/entities';
import { IngestModule } from 'src/ingest/ingest.module';
import { AppConfigModule } from '../config/app-config.module';
import { SchedulerStatusController } from './scheduler-status.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, Event, ChatMessage]),
    IngestModule,
    AppConfigModule,
  ],
  controllers:[SchedulerStatusController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
