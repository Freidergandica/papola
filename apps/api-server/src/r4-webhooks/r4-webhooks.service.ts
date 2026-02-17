import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SSEService } from '../common/sse.service';
import { OrderExpirationService } from './order-expiration.service';
import type {
  ConsultaRequest,
  ConsultaResponse,
  NotificaRequest,
  NotificaResponse,
} from '@papola/r4-sdk';

const FEE_PERCENTAGE = 6.8;

@Injectable()
export class R4WebhooksService {
  private readonly logger = new Logger(R4WebhooksService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly sseService: SSEService,
    private readonly orderExpirationService: OrderExpirationService,
  ) {}

  async handleConsulta(data: ConsultaRequest): Promise<ConsultaResponse> {
    this.logger.log(
      `R4consulta — IdCliente: ${data.IdCliente}, Monto: ${data.Monto}`,
    );

    // 1. Validate required fields
    if (data.IdCliente == null || data.Monto == null) {
      this.logger.warn('R4consulta — Missing IdCliente or Monto');
      return { status: false };
    }

    const supabase = this.supabase.getClient();

    // 2. Find orders by payment_id_card + status + payment_method
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, amount_in_ves, store_id')
      .eq('payment_id_card', data.IdCliente)
      .eq('status', 'pending_payment')
      .eq('payment_method', 'pago_movil');

    if (orderError || !orders || orders.length === 0) {
      this.logger.warn(
        `R4consulta — No pending_payment orders for IdCliente: ${data.IdCliente}`,
      );
      return { status: false };
    }

    // 3. Parse and compare amount (exact match to 2 decimals)
    const parsedAmount = parseFloat(data.Monto);
    if (isNaN(parsedAmount)) {
      this.logger.warn(`R4consulta — Invalid Monto: ${data.Monto}`);
      return { status: false };
    }
    const amountStr = parsedAmount.toFixed(2);

    this.logger.log(
      `R4consulta — Parsed amount: ${amountStr}, checking ${orders.length} order(s)`,
    );

    const order = orders.find(
      (o) => parseFloat(o.amount_in_ves).toFixed(2) === amountStr,
    );

    if (!order) {
      this.logger.warn(
        `R4consulta — No order matches amount ${amountStr}. Available: ${orders.map((o) => o.amount_in_ves).join(', ')}`,
      );
      return { status: false };
    }

    // 4. Cancel expiration timer, update to authorized, emit SSE
    this.orderExpirationService.cancelExpiration(order.id);

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'authorized' })
      .eq('id', order.id);

    if (updateError) {
      this.logger.error(
        `R4consulta — Failed to authorize order ${order.id}: ${updateError.message}`,
      );
      return { status: false };
    }

    this.logger.log(`R4consulta — Order ${order.id} authorized`);

    this.sseService.emitToOrder(order.id, {
      orderId: order.id,
      event: 'payment.authorized',
      status: 'authorized',
      amount: parsedAmount,
      clientId: data.IdCliente,
    });

    return { status: true };
  }

  async handleNotifica(data: NotificaRequest): Promise<NotificaResponse> {
    this.logger.log(
      `R4notifica — IdComercio: ${data.IdComercio}, Referencia: ${data.Referencia}, CodigoRed: ${data.CodigoRed}`,
    );

    const supabase = this.supabase.getClient();

    // 1. Find authorized orders by payment_id_card (IdComercio) + status
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, amount_in_ves, store_id')
      .eq('payment_id_card', data.IdComercio)
      .eq('status', 'authorized')
      .eq('payment_method', 'pago_movil');

    if (orderError || !orders || orders.length === 0) {
      this.logger.warn(
        `R4notifica — No authorized orders for IdComercio: ${data.IdComercio}`,
      );
      return { abono: false };
    }

    // 2. Parse and match amount
    const parsedAmount = parseFloat(data.Monto);
    if (isNaN(parsedAmount)) {
      this.logger.warn(`R4notifica — Invalid Monto: ${data.Monto}`);
      return { abono: false };
    }
    const amountStr = parsedAmount.toFixed(2);

    const order = orders.find(
      (o) => parseFloat(o.amount_in_ves).toFixed(2) === amountStr,
    );

    if (!order) {
      this.logger.warn(
        `R4notifica — No order matches amount ${amountStr}. Available: ${orders.map((o) => o.amount_in_ves).join(', ')}`,
      );
      return { abono: false };
    }

    this.logger.log(
      `R4notifica — Processing payment for order ${order.id}`,
    );

    // 3. Update order → accepted + save payment details
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'accepted',
        payment_phone: data.TelefonoEmisor,
        payment_bank: data.BancoEmisor,
        payment_reference: data.Referencia,
        payment_network_code: data.CodigoRed,
        payment_concept: data.Concepto,
        payment_datetime: data.FechaHora,
      })
      .eq('id', order.id);

    if (updateError) {
      this.logger.error(
        `R4notifica — Failed to update order ${order.id}: ${updateError.message}`,
      );
      return { abono: false };
    }

    // 4. Calculate fee and profit
    const amount = Number(amountStr);
    const feeAmount = Number(((FEE_PERCENTAGE / 100) * amount).toFixed(2));
    const netAmount = Number((amount - feeAmount).toFixed(2));

    this.logger.log(
      `R4notifica — Fee: ${feeAmount}, Net: ${netAmount} (${FEE_PERCENTAGE}%)`,
    );

    // 5. Update store balance
    const { data: store } = await supabase
      .from('stores')
      .select('balance')
      .eq('id', order.store_id)
      .single();

    const newBalance = Number(((Number(store?.balance) || 0) + netAmount).toFixed(2));

    await supabase
      .from('stores')
      .update({ balance: newBalance })
      .eq('id', order.store_id);

    // 6. Update platform balances
    const { data: platformBalances } = await supabase
      .from('platform_balances')
      .select('key, value')
      .in('key', ['available_balance', 'accounting_balance']);

    if (platformBalances) {
      for (const row of platformBalances) {
        const currentValue = Number(row.value) || 0;
        const increment = row.key === 'available_balance' ? feeAmount : netAmount;
        await supabase
          .from('platform_balances')
          .update({ value: Number((currentValue + increment).toFixed(2)), updated_at: new Date().toISOString() })
          .eq('key', row.key);
      }
    }

    // 7. Insert payment_transactions (audit trail)
    await supabase.from('payment_transactions').insert({
      order_id: order.id,
      store_id: order.store_id,
      gross_amount: amount,
      fee_percentage: FEE_PERCENTAGE,
      fee_amount: feeAmount,
      net_amount: netAmount,
    });

    this.logger.log(`R4notifica — Order ${order.id} accepted, store balance: ${newBalance}`);

    // 8. Emit SSE and remove client
    this.sseService.emitToOrder(order.id, {
      orderId: order.id,
      event: 'payment.accepted',
      status: 'accepted',
      amount,
      clientId: data.IdComercio,
      phone: data.TelefonoEmisor,
    });
    this.sseService.removeClient(order.id);

    return { abono: true };
  }
}
