import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RemindersService } from '../reminders/reminders.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private reminders: RemindersService) {}

  // Run every 1 minute
  // Cron expression: * * * * * (minute hour day month weekday)
  // @Cron('* * * * *')
  // async tick() {
  //   try {
  //     await this.reminders.tick();
  //   } catch (err: any) {
  //     this.logger.error(`reminder tick failed: ${err.message}`);
  //   }
  // }
}


// Explanation:

// This is the smallest module in the project, but it's what makes the whole system "live."

// @Cron('* * * * *') — this decorator from @nestjs/schedule tells NestJS to run the tick() method automatically every minute, forever, as long as the server is running.
// A cron expression has 5 fields: minute, hour, day-of-month, month, day-of-week. * means "every." So * * * * * = every minute of every hour of every day.
// The try/catch ensures that if one tick fails (e.g., database is temporarily unavailable), the scheduler doesn't crash and will try again next minute.