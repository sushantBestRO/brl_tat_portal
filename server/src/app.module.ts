// import { Module, OnModuleInit } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { ScheduleModule } from '@nestjs/schedule';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { AppConfigService } from './config/app-config.service';
// import { AppConfigModule } from './config/app-config.module';
// import { ParserModule } from './parser/parser.module';
// import { MatcherModule } from './matcher/matcher.module';
// import { IngestModule } from './ingest/ingest.module';
// import { NotifyModule } from './notify/notify.module';
// import { RemindersModule } from './reminders/reminders.module';
// import { InquiriesModule } from './inquiries/inquiries.module';
// import { WebhooksModule } from './webhooks/webhooks.module';
// import { SettingsModule } from './settings/settings.module';
// import { AdminModule } from './admin/admin.module';
// import { CronModule } from './cron/cron.module';
// import { AuthModule } from './auth/auth.module';
// import { DashboardModule } from './dashboard/dashboard.module';
// import { ParserService } from './parser/parser.service';
// import { SchedulerModule } from './scheduler/scheduler.module';
// import { ImportHistoryModule } from './import-history/import-history.module';
// import { join } from 'path';

// @Module({
//   imports: [
//     // 1. Load .env file (make it global so all modules can access env vars)
//     ConfigModule.forRoot({
//       isGlobal: true,
//       envFilePath: '../.env',
//     }),

//     // 2. Enable cron jobs (runs the TAT check every 60 seconds)
//     ScheduleModule.forRoot(),

//     // 3. Connect to PostgreSQL
//     TypeOrmModule.forRootAsync({
//       useFactory: (config: ConfigService) => ({
//         type: 'postgres',
//         url: config.get<string>('DATABASE_URL'),
//         autoLoadEntities: true,
//         // synchronize: true, // Auto-create tables on startup
//         synchronize: process.env.NODE_ENV === 'development',
//         logging: false,
//       }),
//       inject: [ConfigService],
//     }),

//     // 4. Import all feature modules
//     AppConfigModule,
//     ParserModule,
//     MatcherModule,
//     IngestModule,
//     NotifyModule,
//     RemindersModule,
//     InquiriesModule,
//     WebhooksModule,
//     SettingsModule,
//     AdminModule,
//     CronModule,
//     AuthModule,
//     DashboardModule,
//     SchedulerModule,
//     ImportHistoryModule,
//   ],
// })
// export class AppModule implements OnModuleInit {
//   constructor(
//     private appConfig: AppConfigService,
//     private parser: ParserService,
//   ) {}

//   // On startup: load pricing team + settings + custom phrases into memory
//   async onModuleInit() {
//     await this.appConfig.reloadPricingTeam();
//     await this.appConfig.reloadSettings();
//     await this.parser.reloadCustomPhrases();
//   }
// }

// // ConfigModule.forRoot()
// // isGlobal: true — makes ConfigService available everywhere without importing ConfigModule in each file
// // envFilePath: ['.env', '../.env'] — looks for .env in the server/ folder first, then the root folder. This lets you run the server from either location.
// // ScheduleModule.forRoot()
// // Enables the cron scheduler. Without this, the @Cron('* * * * *') decorator in cron.service.ts would do nothing.

// // TypeOrmModule.forRootAsync()
// // type: 'postgres' — tells TypeORM we're using PostgreSQL
// // url: config.get<string>('DATABASE_URL') — reads the connection string from .env
// // autoLoadEntities: true — automatically loads all entities registered in forFeature() calls across modules
// // synchronize: true — automatically creates the database tables when the server starts. This is great for development. In production, you would use migrations instead.
// // onModuleInit()
// // When the server starts, we need to populate the in-memory dictionaries:

// // reloadPricingTeam() — loads the 6 pricing team members from the database (seeds from config.yaml on first run)
// // reloadSettings() — loads SMTP creds, coordinator info, WhatsApp provider config
// // reloadCustomPhrases() — loads any custom classification phrases

import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from './config/app-config.service';
import { AppConfigModule } from './config/app-config.module';
import { ParserModule } from './parser/parser.module';
import { MatcherModule } from './matcher/matcher.module';
import { IngestModule } from './ingest/ingest.module';
import { NotifyModule } from './notify/notify.module';
import { RemindersModule } from './reminders/reminders.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { CronModule } from './cron/cron.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ParserService } from './parser/parser.service';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ImportHistoryModule } from './import-history/import-history.module';

@Module({
  imports: [
    // 1. Load .env file (make it global so all modules can access env vars)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
      //  envFilePath: ['.env', '../.env'],
      // envFilePath:
      //   process.env.NODE_ENV === 'development'
      //     ? ['../.env.development']
      //     : ['../.env'],
    }),

    // 2. Enable cron jobs (runs the TAT check every 60 seconds)
    ScheduleModule.forRoot(),

    // 3. Connect to PostgreSQL
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // synchronize: true, // Auto-create tables on startup
        synchronize: process.env.NODE_ENV === 'development',
        logging: false,
      }),
      inject: [ConfigService],
    }),

    // 4. Import all feature modules
    AppConfigModule,
    ParserModule,
    MatcherModule,
    IngestModule,
    NotifyModule,
    RemindersModule,
    InquiriesModule,
    WebhooksModule,
    SettingsModule,
    AdminModule,
    CronModule,
    AuthModule,
    DashboardModule,
    SchedulerModule,
    ImportHistoryModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private appConfig: AppConfigService,
    private parser: ParserService,
  ) {}

  // On startup: load pricing team + settings + custom phrases into memory
  async onModuleInit() {
    await this.appConfig.reloadPricingTeam();
    await this.appConfig.reloadSettings();
    await this.parser.reloadCustomPhrases();
  }
}

// ConfigModule.forRoot()
// isGlobal: true — makes ConfigService available everywhere without importing ConfigModule in each file
// envFilePath: ['.env', '../.env'] — looks for .env in the server/ folder first, then the root folder. This lets you run the server from either location.
// ScheduleModule.forRoot()
// Enables the cron scheduler. Without this, the @Cron('* * * * *') decorator in cron.service.ts would do nothing.

// TypeOrmModule.forRootAsync()
// type: 'postgres' — tells TypeORM we're using PostgreSQL
// url: config.get<string>('DATABASE_URL') — reads the connection string from .env
// autoLoadEntities: true — automatically loads all entities registered in forFeature() calls across modules
// synchronize: true — automatically creates the database tables when the server starts. This is great for development. In production, you would use migrations instead.
// onModuleInit()
// When the server starts, we need to populate the in-memory dictionaries:

// reloadPricingTeam() — loads the 6 pricing team members from the database (seeds from config.yaml on first run)
// reloadSettings() — loads SMTP creds, coordinator info, WhatsApp provider config
// reloadCustomPhrases() — loads any custom classification phrases
