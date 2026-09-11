import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }
}


// A single route: GET /api/dashboard/stats. Returns the JSON object with all the dashboard data.