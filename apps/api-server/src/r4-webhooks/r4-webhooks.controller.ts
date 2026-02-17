import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { R4WebhooksGuard } from './r4-webhooks.guard';
import { R4WebhooksService } from './r4-webhooks.service';
import type { ConsultaRequest, NotificaRequest } from '@papola/r4-sdk';

@Controller()
@UseGuards(R4WebhooksGuard)
export class R4WebhooksController {
  constructor(private readonly r4WebhooksService: R4WebhooksService) {}

  @Post('R4consulta')
  @HttpCode(200)
  handleConsulta(@Body() body: ConsultaRequest) {
    return this.r4WebhooksService.handleConsulta(body);
  }

  @Post('R4notifica')
  @HttpCode(200)
  handleNotifica(@Body() body: NotificaRequest) {
    return this.r4WebhooksService.handleNotifica(body);
  }
}
