import { Controller, Get } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

@Controller('status')
export class SchedulerStatusController {
  constructor(private scheduler: SchedulerService) {}

  @Get('maytapi')
  async getStatus() {
    return this.scheduler.getConnectionStatus();
  }
}
