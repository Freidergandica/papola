import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SSEService } from '../common/sse.service';

const EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class OrderExpirationService implements OnModuleDestroy {
  private readonly logger = new Logger(OrderExpirationService.name);
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sseService: SSEService,
  ) {}

  scheduleExpiration(orderId: string) {
    this.cancelExpiration(orderId);

    this.logger.log(`Scheduling expiration for order ${orderId} in 5 minutes`);

    const timer = setTimeout(() => {
      this.expireOrder(orderId);
    }, EXPIRATION_MS);

    this.timers.set(orderId, timer);
  }

  cancelExpiration(orderId: string) {
    const existing = this.timers.get(orderId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(orderId);
      this.logger.log(`Cancelled expiration timer for order ${orderId}`);
    }
  }

  private async expireOrder(orderId: string) {
    this.timers.delete(orderId);

    const supabase = this.supabaseService.getClient();

    // Only expire if still in pending_payment or pending
    const { data: order } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (!order || !['pending', 'pending_payment'].includes(order.status)) {
      this.logger.log(`Order ${orderId} no longer expirable (status: ${order?.status})`);
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'expired' })
      .eq('id', orderId);

    if (error) {
      this.logger.error(`Failed to expire order ${orderId}: ${error.message}`);
      return;
    }

    this.logger.log(`Order ${orderId} expired`);

    this.sseService.emitToOrder(orderId, {
      orderId,
      event: 'payment.expired',
      status: 'expired',
    });

    this.sseService.removeClient(orderId);
  }

  onModuleDestroy() {
    this.logger.log(`Clearing ${this.timers.size} expiration timers`);
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
