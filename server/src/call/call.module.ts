import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Inquiry } from '../entities/inquiry.entity';
import { Event } from '../entities/event.entity';

import { AppConfigService } from '../config/app-config.service';
import { CallsService } from './call.service';
import { CallLog } from 'src/entities/call-log.entity';
import { CallsController } from './call.controller';

// ─── Click-to-call (Runo) ───
// If your project provides AppConfigService from a shared module that
// EXPORTS it, import that module here instead of listing AppConfigService
// in providers (avoids a second instance):
//     imports: [TypeOrmModule.forFeature([...]), ConfigModule],
@Module({
  imports: [TypeOrmModule.forFeature([CallLog, Inquiry, Event])],
  providers: [CallsService, AppConfigService],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
