import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { ChatMessage } from '../entities/message.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry, ChatMessage]), AppConfigModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
