import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { DealsService } from './deals.service';

@Controller('deals')
export class DealsController {
  constructor(private dealsService: DealsService) {}

  @Get()
  findAll(
    @Query('store_id') storeId?: string,
    @Query('active') active?: string,
    @Query('featured') featured?: string,
    @Query('flash') flash?: string,
    @Query('approved') approved?: string,
  ) {
    return this.dealsService.findAll({
      store_id: storeId,
      active: active !== undefined ? active === 'true' : undefined,
      featured: featured !== undefined ? featured === 'true' : undefined,
      flash: flash !== undefined ? flash === 'true' : undefined,
      approved: approved !== undefined ? approved === 'true' : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.dealsService.findByCode(code);
  }

  @Post()
  create(
    @Body()
    body: {
      store_id: string;
      created_by: string;
      title: string;
      description?: string;
      image_url?: string;
      discount_type: string;
      discount_value?: number;
      buy_quantity?: number;
      get_quantity?: number;
      coupon_code?: string;
      applies_to?: string;
      category?: string;
      starts_at?: string;
      ends_at?: string;
      is_flash_deal?: boolean;
      max_redemptions?: number;
      min_order_amount?: number;
      currency?: string;
      product_ids?: string[];
    },
  ) {
    return this.dealsService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      description: string;
      image_url: string;
      discount_value: number;
      ends_at: string;
      is_active: boolean;
      is_featured: boolean;
      is_approved: boolean;
      max_redemptions: number;
      min_order_amount: number;
    }>,
  ) {
    return this.dealsService.update(id, body);
  }

  @Post(':id/redeem')
  redeem(
    @Param('id') id: string,
    @Body() body: { customer_id: string; order_id?: string },
  ) {
    return this.dealsService.redeem(id, body.customer_id, body.order_id);
  }
}
