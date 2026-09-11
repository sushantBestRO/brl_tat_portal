import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry, Event, ChatMessage } from '../entities';
import { InquiriesService } from './inquiries.service';
import { InquiriesController } from './inquiries.controller';
import { NotifyModule } from '../notify/notify.module';
import { MatcherModule } from '../matcher/matcher.module';
import { AppConfigModule } from '../config/app-config.module';
import { ParserModule } from 'src/parser/parser.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, Event, ChatMessage]),
    NotifyModule,
    MatcherModule,
    AppConfigModule,
    ParserModule,
  ],
  controllers: [InquiriesController],
  providers: [InquiriesService],
  exports: [InquiriesService],
})
export class InquiriesModule {}
