import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SSEService } from '../common/sse.service';

const EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 15 * 1000; // Check every 15 seconds

@Injectable()
export class OrderExpirationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderExpirationService.name);
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sseService: SSEService,
  ) {}

  async onModuleInit() {
    // On startup, immediately expire orders that should have expired while server was down
    await this.expireOverdueOrders();

    // Start polling
    this.pollInterval = setInterval(() => {
      this.expireOverdueOrders();
    }, POLL_INTERVAL_MS);

    this.logger.log(
      `Order expiration polling started (every ${POLL_INTERVAL_MS / 1000}s)`,
    );
  }

  /**
   * Schedule expiration: sets expires_at on the order in DB
   * Survives server restarts since it's DB-based
   */
  async scheduleExpiration(orderId: string) {
    const expiresAt = new Date(Date.now() + EXPIRATION_MS).toISOString();

    const { error } = await this.supabaseService
      .getClient()
      .from('orders')
      .update({ expires_at: expiresAt })
      .eq('id', orderId);

    if (error) {
      this.logger.error(
        `Failed to set expires_at for order ${orderId}: ${error.message}`,
      );
      return;
    }

    this.logger.log(
      `Scheduled expiration for order ${orderId} at ${expiresAt}`,
    );
  }

  /**
   * Cancel expiration: clears expires_at
   */
  async cancelExpiration(orderId: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('orders')
      .update({ expires_at: null })
      .eq('id', orderId);

    if (error) {
      this.logger.error(
        `Failed to cancel expiration for order ${orderId}: ${error.message}`,
      );
      return;
    }

    this.logger.log(`Cancelled expiration for order ${orderId}`);
  }

  /**
   * Poll: find and expire all overdue orders
   */
  private async expireOverdueOrders() {
    const supabase = this.supabaseService.getClient();
    const now = new Date().toISOString();

    const { data: expiredOrders, error } = await supabase
      .from('orders')
      .select('id, store_id')
      .eq('status', 'pending_payment')
      .not('expires_at', 'is', null)
      .lte('expires_at', now);

    if (error) {
      this.logger.error(`Failed to query expired orders: ${error.message}`);
      return;
    }

    if (!expiredOrders?.length) return;

    this.logger.log(
      `Found ${expiredOrders.length} expired orders to process`,
    );

    for (const order of expiredOrders) {
      await this.expireOrder(order.id);
    }
  }

  /**
   * Expire a single order + restore stock
   */
  private async expireOrder(orderId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('orders')
      .update({ status: 'expired', expires_at: null })
      .eq('id', orderId)
      .eq('status', 'pending_payment');

    if (error) {
      this.logger.error(
        `Failed to expire order ${orderId}: ${error.message}`,
      );
      return;
    }

    // Restore stock for expired order
    await this.restoreStock(orderId);

    this.logger.log(`Order ${orderId} expired and stock restored`);

    this.sseService.emitToOrder(orderId, {
      orderId,
      event: 'payment.expired',
      status: 'expired',
    });

    this.sseService.removeClient(orderId);
  }

  /**
   * Restore product stock from order items.
   * Public so it can be called from OrdersService on cancellation too.
   */
  async restoreStock(orderId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: items, error } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    if (error || !items?.length) {
      this.logger.warn(
        `No order items found for stock restoration (order ${orderId})`,
      );
      return;
    }

    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      // Only restore if product has stock tracking (stock is not null)
      if (!product || product.stock === null || product.stock === undefined)
        continue;

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: (product.stock || 0) + item.quantity })
        .eq('id', item.product_id);

      if (updateError) {
        this.logger.error(
          `Failed to restore stock for product ${item.product_id}: ${updateError.message}`,
        );
      }
    }

    this.logger.log(
      `Stock restored for ${items.length} items from order ${orderId}`,
    );
  }

  onModuleDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.logger.log('Order expiration polling stopped');
  }
}
