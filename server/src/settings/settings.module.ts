import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassificationPhrase } from '../entities/classification-phrase.entity';
import { PricingTeamMember } from '../entities/pricing-team-member.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { ParserModule } from '../parser/parser.module';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassificationPhrase, PricingTeamMember, Inquiry]),
    ParserModule,
    AppConfigModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
