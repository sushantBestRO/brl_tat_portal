import { Module } from '@nestjs/common';
import { NotifyService } from './notify.service';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [AppConfigModule],
  providers: [NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}


// AppConfigModule — needs access to SETTINGS for credentials
// exports: [NotifyService] — the reminders module will use this to actually send nudges
