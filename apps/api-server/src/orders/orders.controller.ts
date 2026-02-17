import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(
    @Body()
    body: {
      customer_id: string;
      store_id: string;
      delivery_address: string;
      delivery_latitude?: number;
      delivery_longitude?: number;
      payment_method: 'c2p' | 'pago_movil' | 'cash';
      payment_currency?: 'USD' | 'VES';
      exchange_rate?: number;
      deal_id?: string;
      coupon_code?: string;
      payment_id_card?: string;
      items: Array<{ product_id: string; quantity: number; unit_price: number }>;
    },
  ) {
    return this.ordersService.create(body);
  }

  @Get()
  findAll(
    @Query('customer_id') customerId?: string,
    @Query('store_id') storeId?: string,
  ) {
    if (customerId) return this.ordersService.findByCustomer(customerId);
    if (storeId) return this.ordersService.findByStore(storeId);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.ordersService.updateStatus(id, body.status);
  }
}
