import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry, ChatMessage, Event } from '../entities';
import { MatcherService } from './matcher.service';
import { ParserModule } from '../parser/parser.module';
import { AppConfigModule } from '../config/app-config.module';
import { NotifyModule } from 'src/notify/notify.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, ChatMessage, Event]),
    ParserModule,
    AppConfigModule,
    NotifyModule,
  ],
  providers: [MatcherService],
  exports: [MatcherService],
})
export class MatcherModule {}

// TypeOrmModule.forFeature([Inquiry, Message, Event]) — this module reads and writes inquiries, messages, and events
// ParserModule — needs the parser to classify messages
// AppConfigModule — needs the config service for pricing team lookups
// exports: [MatcherService] — the ingest module will need to call routeMessage()
