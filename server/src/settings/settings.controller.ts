import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AppConfigService } from 'src/config/app-config.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private svc: SettingsService,
    private config: AppConfigService, // ← ADD THIS
  ) {}

  // ─── Phrases ───
  @Get('phrases')
  listPhrases() {
    return this.svc.listPhrases();
  }

  @Post('phrases')
  addPhrase(
    @Body() body: { phrase: string; kind?: string; created_by?: string },
  ) {
    return this.svc.addPhrase(body.phrase, body.kind || 'ask', body.created_by);
  }

  @Delete('phrases/:id')
  deletePhrase(@Param('id') id: string) {
    return this.svc.deletePhrase(+id);
  }

  // ─── Team ───
  @Get('team')
  listTeam() {
    return this.svc.listTeam();
  }

  @Post('team')
  addTeamMember(@Body() body: any) {
    return this.svc.addTeamMember(body);
  }

  @Post('cleanup-old')
  async cleanupOld(@Body() body: { days?: number }) {
    return this.svc.cleanupOldInquiries(body.days || 7);
  }

  //for whatsapp group id
  @Post('group')
  async changeGroup(@Body() body: { group_id: string }) {
    return this.svc.saveConfigSettings({ group_key: body.group_id });
  }

  @Post('switch-group')
  async switchGroup(@Body() body: { group_id: string }) {
    return this.svc.switchGroup(body.group_id);
  }

  @Put('team/:id')
  editTeamMember(@Param('id') id: string, @Body() body: any) {
    return this.svc.editTeamMember(+id, body);
  }

  @Delete('team/:id')
  deleteTeamMember(@Param('id') id: string) {
    return this.svc.deleteTeamMember(+id);
  }

  // ─── Config ───
  @Get('config')
  getConfigSettings() {
    return this.svc.getConfigSettings();
  }

  @Post('config')
  saveConfigSettings(@Body() body: any) {
    return this.svc.saveConfigSettings(body);
  }

  @Post('auto-whatsapp')
  async setAutoWhatsApp(@Body() body: { enabled: boolean }) {
    this.config.autoWhatsAppEnabled = body.enabled;
    return { ok: true, autoWhatsAppEnabled: this.config.autoWhatsAppEnabled };
  }

  @Get('auto-whatsapp')
  async getAutoWhatsApp() {
    return { autoWhatsAppEnabled: this.config.autoWhatsAppEnabled };
  }
}

// All routes are under /api/settings (because of the global prefix + @Controller('settings')):

// Method	Route	Description
// GET	/api/settings/phrases	List all custom classification phrases
// POST	/api/settings/phrases	Add a new phrase
// DELETE	/api/settings/phrases/:id	Delete a phrase
// GET	/api/settings/team	List all pricing team members
// POST	/api/settings/team	Add a team member
// PUT	/api/settings/team/:id	Edit a team member
// DELETE	/api/settings/team/:id	Delete a team member
// GET	/api/settings/config	Get integration config (secrets hidden)
// POST	/api/settings/config	Save integration config
