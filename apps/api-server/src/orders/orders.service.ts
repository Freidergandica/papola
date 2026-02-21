import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DealsService } from '../deals/deals.service';
import { OrderExpirationService } from '../r4-webhooks/order-expiration.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private supabase: SupabaseService,
    private dealsService: DealsService,
    private orderExpirationService: OrderExpirationService,
  ) {}

  async create(orderData: {
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
    // Siempre calcular amount_in_ves cuando hay exchange_rate
    // (el checkout envía payment_currency='USD' pero R4 necesita el monto en Bs para hacer match)
    const amountInVes = order.exchange_rate
      ? Math.round(totalAmount * order.exchange_rate * 100) / 100
      : undefined;

    // Determine initial status: pago_movil and c2p orders start as pending_payment
    const needsPayment = order.payment_method === 'pago_movil' || order.payment_method === 'c2p';
    const initialStatus = needsPayment ? 'pending_payment' : 'pending';

    // Create order
    const { data: createdOrder, error: orderError } = await this.supabase
      .getClient()
      .from('orders')
      .insert({
        customer_id: order.customer_id,
        store_id: order.store_id,
        delivery_address: order.delivery_address,
        delivery_latitude: order.delivery_latitude ?? null,
        delivery_longitude: order.delivery_longitude ?? null,
        payment_method: order.payment_method,
        payment_currency: order.payment_currency || 'USD',
        exchange_rate: order.exchange_rate,
        amount_in_ves: amountInVes,
        deal_id: dealId,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        status: initialStatus,
        ...(needsPayment && order.payment_id_card
          ? { payment_id_card: order.payment_id_card }
          : {}),
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

    // Decrement stock for products that have stock tracking
    for (const item of items) {
      const { data: product } = await this.supabase
        .getClient()
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      if (product && product.stock !== null && product.stock !== undefined && product.stock > 0) {
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${item.product_id}`,
          );
        }
        await this.supabase
          .getClient()
          .from('products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.product_id);
      }
    }

    // Schedule expiration for payment orders (5 min timeout)
    if (needsPayment) {
      await this.orderExpirationService.scheduleExpiration(createdOrder.id);
      this.logger.log(`Order ${createdOrder.id} created as pending_payment (${order.payment_method}) with 5min expiration`);
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

  async cancelOrder(orderId: string, customerId: string) {
    const { data: order, error } = await this.supabase
      .getClient()
      .from('orders')
      .select('id, status, customer_id')
      .eq('id', orderId)
      .single();

    if (error || !order) throw new NotFoundException('Order not found');

    if (order.customer_id !== customerId) {
      throw new BadRequestException('Solo puedes cancelar tus propias órdenes');
    }

    if (order.status !== 'pending_payment') {
      throw new BadRequestException(
        'Solo se pueden cancelar órdenes pendientes de pago',
      );
    }

    // Cancel expiration timer
    await this.orderExpirationService.cancelExpiration(orderId);

    // Update status
    const { data: updated, error: updateError } = await this.supabase
      .getClient()
      .from('orders')
      .update({ status: 'cancelled', expires_at: null })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Restore stock
    await this.orderExpirationService.restoreStock(orderId);

    this.logger.log(`Order ${orderId} cancelled by customer ${customerId}`);

    return updated;
  }
}
