import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { DispersalsService } from './dispersals.service';
import { SupabaseAuthGuard, Roles } from '../common/supabase-auth.guard';

@Controller('dispersals')
@UseGuards(SupabaseAuthGuard)
@Roles('admin')
export class DispersalsController {
  constructor(private dispersalsService: DispersalsService) {}

  @Get('preview')
  preview() {
    return this.dispersalsService.preview();
  }

  @Post('execute')
  execute(@Body() body: { reference: string }, @Req() req: any) {
    return this.dispersalsService.execute(body.reference, req.user?.id);
  }

  @Get('history')
  history(@Query('limit') limit?: string) {
    return this.dispersalsService.history(limit ? parseInt(limit) : 20);
  }
}
