import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DealsService } from '../deals/deals.service';

@Injectable()
export class OrdersService {
  constructor(
    private supabase: SupabaseService,
    private dealsService: DealsService,
  ) {}

  async create(orderData: {
    customer_id: string;
    store_id: string;
    delivery_address: string;
    payment_method: 'c2p' | 'pago_movil' | 'cash';
    payment_currency?: 'USD' | 'VES';
    exchange_rate?: number;
    deal_id?: string;
    coupon_code?: string;
    items: Array<{ product_id: string; quantity: number; unit_price: number }>;
  }) {
    const { items, coupon_code, ...order } = orderData;

    if (!items?.length) {
      throw new BadRequestException('Order must have at least one item');
    }

    let subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    let discountAmount = 0;
    let dealId = order.deal_id;

    // Apply coupon if provided
    if (coupon_code && !dealId) {
      const deal = await this.dealsService.findByCode(coupon_code);
      dealId = deal.id;
    }

    // Calculate discount
    if (dealId) {
      const deal = await this.dealsService.findOne(dealId);

      if (deal.min_order_amount && subtotal < deal.min_order_amount) {
        throw new BadRequestException(
          `Minimum order amount is $${deal.min_order_amount}`,
        );
      }

      switch (deal.discount_type) {
        case 'percentage':
          discountAmount = subtotal * ((deal.discount_value || 0) / 100);
          break;
        case 'fixed_amount':
          discountAmount = deal.discount_value || 0;
          break;
        case 'buy_x_get_y':
          // Simplified: discount = price of cheapest items equal to get_quantity
          discountAmount = 0;
          break;
        case 'coupon':
          discountAmount = deal.discount_value || 0;
          break;
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);
    const amountInVes =
      order.payment_currency === 'VES' && order.exchange_rate
        ? totalAmount * order.exchange_rate
        : undefined;

    // Create order
    const { data: createdOrder, error: orderError } = await this.supabase
      .getClient()
      .from('orders')
      .insert({
        customer_id: order.customer_id,
        store_id: order.store_id,
        delivery_address: order.delivery_address,
        payment_method: order.payment_method,
        payment_currency: order.payment_currency || 'USD',
        exchange_rate: order.exchange_rate,
        amount_in_ves: amountInVes,
        deal_id: dealId,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map((item) => ({
      order_id: createdOrder.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { error: itemsError } = await this.supabase
      .getClient()
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Redeem deal if applied
    if (dealId) {
      await this.dealsService.redeem(dealId, order.customer_id, createdOrder.id);
    }

    return { ...createdOrder, items: orderItems };
  }

  async findByCustomer(customerId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('orders')
      .select('*, stores(id, name, logo_url), order_items(*, products(*))')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findByStore(storeId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('orders')
      .select('*, profiles!orders_customer_id_fkey(full_name, phone_number), order_items(*, products(*))')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('orders')
      .select('*, stores(id, name, logo_url), order_items(*, products(*)), deals(*)')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Order not found');
    return data;
  }

  async updateStatus(id: string, status: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException('Order not found');
    return data;
  }
}
