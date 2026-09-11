import { Module } from '@nestjs/common';
import { ImportHistoryController } from './import-history.controller';
import { ImportHistoryService } from './import-history.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from '../entities/message.entity';
import { MatcherModule } from '../matcher/matcher.module';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    MatcherModule,
    AppConfigModule,
  ],
  controllers: [ImportHistoryController],
  providers: [ImportHistoryService],
})
export class ImportHistoryModule {}
