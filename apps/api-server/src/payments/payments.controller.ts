import { Controller, Get, Post, Body, Query, Sse, Param, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SSEService } from '../common/sse.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private sseService: SSEService,
  ) {}

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

  @Sse('sse/:orderId')
  paymentStream(@Param('orderId') orderId: string, @Req() req: any) {
    req.on('close', () => {
      this.sseService.removeClient(orderId);
    });

    return this.sseService.pipeStream(orderId);
  }
}
