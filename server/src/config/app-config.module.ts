import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingTeamMember } from '../entities/pricing-team-member.entity';
import { Setting } from '../entities/setting.entity';
import { AppConfigService } from './app-config.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PricingTeamMember, Setting])],
  providers: [AppConfigService],
  exports: [AppConfigService, TypeOrmModule],
})
export class AppConfigModule {}
