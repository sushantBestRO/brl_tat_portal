// import { Controller, Post, Get, Body } from '@nestjs/common';
// import { ImportHistoryService } from './import-history.service';

// @Controller('import-history')
// export class ImportHistoryController {
//   constructor(private importService: ImportHistoryService) {}

//   @Post('start')
//   async startImport(@Body() body: { start?: string; end?: string }) {
//     return this.importService.runImport(body.start || '', body.end || '');
//   }

//   @Get('status')
//   async getStatus() {
//     return this.importService.getStatus();
//   }
// }

import { Controller, Post, Get, Body } from '@nestjs/common';
import { ImportHistoryService } from './import-history.service';

@Controller('import-history')
export class ImportHistoryController {
  constructor(private importService: ImportHistoryService) {}

  @Post('start')
  async startImport(@Body() body: { start?: string; end?: string }) {
    return this.importService.runImport(body.start || '', body.end || '');
  }

  @Get('status')
  async getStatus() {
    return this.importService.getStatus();
  }

  @Post('stop')
  async stopImport() {
    return this.importService.stop();
  }
}
