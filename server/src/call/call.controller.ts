import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CallsService } from './call.service';

@Controller('calls')
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  // ─── Config for the call popup (calling number, enabled?) ───
  @Get('config')
  config() {
    return this.calls.getConfig();
  }

  // ─── Start a call: agent's phone rings first, then the customer ───
  @Post('connect')
  connect(
    @Body()
    body: {
      inquiryId?: number;
      customerPhone: string;
      customerName?: string;
      agentPhone?: string;
      agentName?: string;
    },
  ) {
    return this.calls.connect(body);
  }

  // ─── Call history (Settings → Call Logs) ───
  @Get()
  list(@Query('limit') limit?: string) {
    return this.calls.list(Number(limit) || 200);
  }

  @Get('stats')
  stats() {
    return this.calls.stats();
  }

  // ─── Runo call-status webhook (configure this URL in Runo) ───
  @Post('webhook')
  webhook(@Body() body: any) {
    return this.calls.handleWebhook(body);
  }

  // ─── Manual outcome (until the webhook is wired up) ───
  @Post(':id/outcome')
  outcome(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      status?: string;
      durationSeconds?: number;
      note?: string;
    },
  ) {
    return this.calls.setOutcome(id, body);
  }
}
