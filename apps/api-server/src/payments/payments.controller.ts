import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('exchange-rate')
  getExchangeRate(@Query('pair') pair?: string) {
    return this.paymentsService.getExchangeRate(pair);
  }

  @Post('initialize')
  initializePayment(
    @Body()
    body: {
      order_id: string;
      amount: number;
      currency: string;
      payment_method: 'c2p' | 'pago_movil' | 'cash';
    },
  ) {
    return this.paymentsService.initializePayment(body);
  }
}
