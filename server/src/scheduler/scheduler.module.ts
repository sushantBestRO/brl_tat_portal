import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { Event } from '../entities/event.entity';
import { ChatMessage } from 'src/entities';
import { IngestModule } from 'src/ingest/ingest.module';
import { AppConfigModule } from '../config/app-config.module';
import { SchedulerStatusController } from './scheduler-status.controller';
import { OcrService } from 'src/services/ocr.service';
import { ParserModule } from 'src/parser/parser.module';
import { MatcherModule } from 'src/matcher/matcher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, Event, ChatMessage]),
    IngestModule,
    AppConfigModule,
    ParserModule,
    MatcherModule,
  ],
  controllers: [SchedulerStatusController],
  providers: [SchedulerService, OcrService],
})
export class SchedulerModule {}
