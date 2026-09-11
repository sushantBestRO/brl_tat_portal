import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from '../entities/message.entity';
import { IngestService } from './ingest.service';
import { MatcherModule } from '../matcher/matcher.module';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage]), MatcherModule, AppConfigModule],
  providers: [IngestService],
  exports: [IngestService],
})
export class IngestModule {}
