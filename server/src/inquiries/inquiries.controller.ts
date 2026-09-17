import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { InquiriesService } from './inquiries.service';

@Controller()
export class InquiriesController {
  constructor(private readonly svc: InquiriesService) {}

  // @Get('inquiries')
  // findAll(@Query('status') status?: string, @Query('days') days?: number) {
  //   return this.svc.findAll(status, days ? +days : 30);
  // }

  @Get('inquiries')
  findAll(
    @Query('status') status?: string,
    @Query('days') days?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.svc.findAll(status, days ? +days : 30, startDate, endDate);
  }

  @Get('pricing-team')
  pricingTeam() {
    return this.svc.pricingTeam();
  }
  // ─── Specific routes MUST come before :id ───
  @Get('inquiries/scorecard')
  scorecard(@Query('days') days?: number) {
    return this.svc.scorecard(days ? +days : 90);
  }

  @Get('inquiries/scorecard/requesters')
  async requesterScorecard(@Query('days') days?: number) {
    return this.svc.requesterScorecard(days ? +days : 90);
  }

  // ─── Wildcard route comes LAST ───
  @Get('inquiries/:id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id);
  }

  @Post('inquiries/:id/quote')
  manualQuote(
    @Param('id') id: string,
    @Body() body: { rates: string; quoted_by?: string; note?: string },
  ) {
    return this.svc.manualQuote(+id, body.rates, body.quoted_by, body.note);
  }

  @Post('inquiries/:id/call')
  logCall(
    @Param('id') id: string,
    @Body() body: { outcome: string; by?: string },
  ) {
    return this.svc.logCall(+id, body.outcome, body.by);
  }

  @Post('inquiries/:id/reassign')
  reassign(
    @Param('id') id: string,
    @Body() body: { assignee_key: string; by?: string },
  ) {
    return this.svc.reassign(+id, body.assignee_key, body.by);
  }

  @Post('inquiries/:id/remind')
  adhocRemind(
    @Param('id') id: string,
    @Body() body: { channel?: string; note?: string },
  ) {
    return this.svc.adhocRemind(+id, body.channel || 'whatsapp', body.note);
  }

  // ─── Broadcast reminder to ALL active pricers ───
  @Post('inquiries/:id/broadcast')
  broadcast(
    @Param('id') id: string,
    @Body() body: { channel?: string; note?: string },
  ) {
    return this.svc.broadcastRemind(+id, body.channel || 'both', body.note);
  }

  @Post('inquiries/:id/close')
  close(
    @Param('id') id: string,
    @Body() body: { reason: string; note?: string },
  ) {
    return this.svc.close(+id, body.reason, body.note);
  }

  // @Get('export.csv')
  // async exportCsv(@Query('days') days: number, @Res() res: Response) {
  //   const csv = await this.svc.exportCsv(days ? +days : 400);
  //   res.setHeader('Content-Type', 'text/csv');
  //   res.setHeader('Content-Disposition', 'attachment; filename=inquiries.csv');
  //   res.send(csv);
  // }

  // @Get('export.csv')
  // async exportCsv(
  //   @Query('days') days: number,
  //   @Query('startDate') startDate: string,
  //   @Query('endDate') endDate: string,
  //   @Res() res: Response,
  // ) {
  //   const csv = await this.svc.exportCsv(
  //     days ? +days : 400,
  //     startDate,
  //     endDate,
  //   );
  //   res.setHeader('Content-Type', 'text/csv');
  //   res.setHeader('Content-Disposition', 'attachment; filename=inquiries.csv');
  //   res.send(csv);
  // }

  @Get('export.csv')
  async exportCsv(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    if (!startDate) {
      res.status(400).send('startDate query parameter is required');
      return;
    }

    const csv = await this.svc.exportCsvByDateRange(startDate, endDate);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=inquiries.csv');
    res.send(csv);
  }

  @Get('daily-details')
  dailyDetails(@Query('date') date?: string) {
    return this.svc.dailyDetails(date);
  }

  @Get('sync-status')
  syncStatus() {
    return this.svc.syncStatus();
  }

  @Get('messages/recent')
  recentMessages(@Query('limit') limit?: number) {
    return this.svc.recentMessages(limit ? +limit : 15);
  }

  @Get('messages/unseen-count')
  unseenCount(@Query('since_id') sinceId?: number) {
    return this.svc.unseenCount(sinceId ? +sinceId : 0);
  }

  @Post('messages/:id/classify')
  manualClassify(@Param('id') id: string, @Body() body: { target: string }) {
    return this.svc.manualClassify(+id, body.target);
  }

  @Post('inquiries/backfill-vehicle-type')
  backfillVehicleType() {
    return this.svc.backfillVehicleTypes();
  }

  @Get('email-status')
  emailStatus() {
    return this.svc.emailStatus();
  }
}

// Decorator	What it does	Example
// @Controller()	Marks this class as a controller with routes	Handles all incoming HTTP requests
// @Get('inquiries')	Maps GET requests to /api/inquiries	Listing inquiries
// @Post('inquiries/:id/quote')	Maps POST requests to /api/inquiries/123/quote	Recording a rate
// @Param('id')	Extracts URL parameter :id	123 from the URL
// @Query('status')	Extracts query string ?status=OPEN	OPEN
// @Body()	Extracts the JSON request body	{ rates: "95000" }
// @Res()	Gives direct access to Express response object	Used for CSV download (custom headers)
// Notice that the @Controller() has no path prefix — that's because we set a global prefix api in main.ts. So @Get('inquiries') becomes GET /api/inquiries.
