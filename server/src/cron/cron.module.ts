import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [RemindersModule],
  providers: [CronService],
})
export class CronModule {}


// Explanation:

// RemindersModule — needs the RemindersService to call tick()
// No controller — this module has no API routes, it runs in the background
// No exports — nothing else needs the CronService