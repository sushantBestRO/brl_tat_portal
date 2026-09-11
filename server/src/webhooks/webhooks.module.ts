import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { IngestModule } from '../ingest/ingest.module';

@Module({
  imports: [IngestModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}


// IngestModule — needs the IngestService to parse payloads and store messages
// No providers — this module only has a controller, no services of its own