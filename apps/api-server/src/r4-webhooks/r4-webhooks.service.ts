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

  /**
   * R4consulta — R4 envía este webhook para verificar si existe un pago pendiente.
   * Busca por cédula (IdCliente) + monto exacto en órdenes con status pending_payment.
   * Si encuentra match → autoriza la orden.
   *
   * Copia fiel del legacy: PaymentService.mobilePayQueryHook()
   */
  async handleConsulta(data: ConsultaRequest): Promise<ConsultaResponse> {
    this.logger.log(`[R4 Query Hook] Received request: ${JSON.stringify(data)}`);

    if (data.Monto === null || data.Monto === undefined || data.IdCliente === null || data.IdCliente === undefined) {
      this.logger.warn('[R4 Query Hook] Missing required fields - Monto or IdCliente is null');
      return { status: false };
    }

    const supabase = this.supabase.getClient();

    this.logger.log(`[R4 Query Hook] Searching for orders with: idCard=${data.IdCliente}, status=pending_payment, payment_method=pago_movil`);

    // Buscar órdenes pendientes de pago con la cédula del cliente
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, amount_in_ves, store_id')
      .eq('payment_id_card', data.IdCliente)
      .eq('status', 'pending_payment')
      .eq('payment_method', 'pago_movil');

    this.logger.log(`[R4 Query Hook] Found ${orders?.length || 0} orders`);

    if (orderError || !orders || orders.length === 0) {
      this.logger.warn('[R4 Query Hook] No orders found with the given criteria');
      return { status: false };
    }

    // Parsear y comparar monto (match exacto a 2 decimales, igual que legacy)
    let amount: string | number = parseFloat(data.Monto);
    if (isNaN(amount)) {
      this.logger.warn(`[R4 Query Hook] Invalid amount - cannot parse: ${data.Monto}`);
      return { status: false };
    }
    amount = amount.toFixed(2);
    this.logger.log(`[R4 Query Hook] Parsed amount: ${amount}`);

    this.logger.log(`[R4 Query Hook] Comparing amounts: ${JSON.stringify(orders.map(o => ({
      orderId: o.id,
      amount_in_ves: o.amount_in_ves,
      matches: parseFloat(o.amount_in_ves).toFixed(2) === amount
    })))}`);

    const order = orders.find(o => parseFloat(o.amount_in_ves).toFixed(2) === amount);
    if (!order) {
      this.logger.warn(`[R4 Query Hook] No order found matching amount: ${amount}`);
      this.logger.warn(`[R4 Query Hook] Available orders: ${JSON.stringify(orders.map(o => ({
        id: o.id,
        amount_in_ves: o.amount_in_ves,
      })))}`);
      return { status: false };
    }

    this.logger.log(`[R4 Query Hook] Order found! Authorizing order: ${order.id}`);

    // Cancelar timer de expiración y autorizar
    this.orderExpirationService.cancelExpiration(order.id);

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'authorized' })
      .eq('id', order.id);

    if (updateError) {
      this.logger.error(`[R4 Query Hook] Failed to authorize order ${order.id}: ${updateError.message}`);
      return { status: false };
    }

    this.logger.log(`[R4 Query Hook] Order authorized successfully: orderId=${order.id}, amount=${order.amount_in_ves}, clientId=${data.IdCliente}`);

    // Emitir SSE al frontend del cliente
    this.sseService.emitToOrder(order.id, {
      orderId: order.id,
      event: 'payment.authorized',
      status: 'authorized',
      amount: parseFloat(order.amount_in_ves),
      clientId: data.IdCliente,
    });

    return { status: true };
  }

  /**
   * R4notifica — R4 envía este webhook cuando el pago fue procesado exitosamente.
   * Busca la orden autorizada, calcula la comisión (6.8%), actualiza balances.
   *
   * Copia fiel del legacy: PaymentService.mobilePayNotificationHook()
   */
  async handleNotifica(data: NotificaRequest): Promise<NotificaResponse> {
    this.logger.log(`[R4 Notification Hook] Received notification: ${JSON.stringify(data)}`);

    const supabase = this.supabase.getClient();

    this.logger.log(`[R4 Notification Hook] Searching for orders with: idCard=${data.IdComercio}, status=authorized, payment_method=pago_movil`);

    // Buscar órdenes autorizadas con la cédula del comercio
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, amount_in_ves, store_id')
      .eq('payment_id_card', data.IdComercio)
      .eq('status', 'authorized')
      .eq('payment_method', 'pago_movil');

    this.logger.log(`[R4 Notification Hook] Found ${orders?.length || 0} authorized orders`);

    if (orderError || !orders || orders.length === 0) {
      this.logger.warn('[R4 Notification Hook] No authorized orders found with the given criteria');
      return { abono: false };
    }

    // Parsear y comparar monto
    let amount: string | number = parseFloat(data.Monto);
    if (isNaN(amount)) {
      this.logger.warn(`[R4 Notification Hook] Invalid amount - cannot parse: ${data.Monto}`);
      return { abono: false };
    }
    amount = amount.toFixed(2);
    this.logger.log(`[R4 Notification Hook] Parsed amount: ${amount}`);

    this.logger.log(`[R4 Notification Hook] Comparing amounts: ${JSON.stringify(orders.map(o => ({
      orderId: o.id,
      amount_in_ves: o.amount_in_ves,
      matches: parseFloat(o.amount_in_ves).toFixed(2) === amount
    })))}`);

    const order = orders.find(o => parseFloat(o.amount_in_ves).toFixed(2) === amount);
    if (!order) {
      this.logger.warn(`[R4 Notification Hook] No order found matching amount: ${amount}`);
      this.logger.warn(`[R4 Notification Hook] Available orders: ${JSON.stringify(orders.map(o => ({
        id: o.id,
        amount_in_ves: o.amount_in_ves,
      })))}`);
      return { abono: false };
    }

    this.logger.log(`[R4 Notification Hook] Order found! Processing payment confirmation for order: ${order.id}`);

    try {
      // 1. Actualizar orden → accepted + guardar datos del pago
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
        this.logger.error(`[R4 Notification Hook] Failed to update order ${order.id}: ${updateError.message}`);
        return { abono: false };
      }

      // 2. Calcular comisión y ganancia (igual que legacy: CONF_APP.fee / 100 * amount)
      const numAmount = Number(amount);
      let fee = FEE_PERCENTAGE / 100 * numAmount;
      fee = Number(fee.toFixed(2));
      const profit = numAmount - fee;

      this.logger.log(`[R4 Notification Hook] Calculating balances: amount=${numAmount}, fee=${fee}, profit=${profit} (${FEE_PERCENTAGE}%)`);

      // 3. Actualizar balance de la tienda (igual que legacy: store.balance + profit)
      const { data: store } = await supabase
        .from('stores')
        .select('balance')
        .eq('id', order.store_id)
        .single();

      const currentBalance = Number(store?.balance) || 0;
      const finalBalance = currentBalance + profit;

      this.logger.log(`[R4 Notification Hook] Store balance: current=${currentBalance}, final=${finalBalance}`);

      await supabase
        .from('stores')
        .update({ balance: finalBalance })
        .eq('id', order.store_id);

      // 4. Actualizar platform balances (igual que legacy: available_balance += fee, accounting_balance += profit)
      // TODO: el availableBalance ira creciendo siempre y el accountingBalance disminuira cuando se haga la dispersion
      // la disminucion de saldos se hara solo en un cron job y despues de tener respuesta del servidor ftp
      const { data: platformBalances } = await supabase
        .from('platform_balances')
        .select('key, value')
        .in('key', ['available_balance', 'accounting_balance']);

      if (platformBalances) {
        for (const row of platformBalances) {
          const currentValue = Number(row.value) || 0;
          if (row.key === 'available_balance') {
            await supabase
              .from('platform_balances')
              .update({ value: (currentValue + fee).toString(), updated_at: new Date().toISOString() })
              .eq('key', row.key);
          } else if (row.key === 'accounting_balance') {
            await supabase
              .from('platform_balances')
              .update({ value: (currentValue + profit).toString(), updated_at: new Date().toISOString() })
              .eq('key', row.key);
          }
        }
      }

      // 5. Registrar transacción (audit trail — no existía en legacy pero lo mantenemos)
      await supabase.from('payment_transactions').insert({
        order_id: order.id,
        store_id: order.store_id,
        gross_amount: numAmount,
        fee_percentage: FEE_PERCENTAGE,
        fee_amount: fee,
        net_amount: profit,
      });

      this.logger.log(`[R4 Notification Hook] Payment updated successfully: mobilePaymentRef=${data.Referencia}, phone=${data.TelefonoEmisor}`);
    } catch (error) {
      this.logger.error(`[R4 Notification Hook] Error processing payment: ${error?.message ?? error}`);
      this.logger.error(`[R4 Notification Hook] Error stack: ${error?.stack}`);
    }

    // TODO: aqui se debe enviar notificacion de pago hecho (push notification a la tienda)
    // Legacy usaba Firebase: this.orderService.sendNewOrderNotification(order, order.store)
    // Pendiente: implementar Expo Push Notifications

    this.logger.log('[R4 Notification Hook] Emitting SSE event and completing process');

    // Emitir SSE y limpiar cliente
    this.sseService.emitToOrder(order.id, {
      orderId: order.id,
      event: 'payment.accepted',
      status: 'accepted',
      amount: Number(amount),
      clientId: data.IdComercio,
      phone: data.TelefonoEmisor,
    });
    this.sseService.removeClient(order.id);

    this.logger.log(`[R4 Notification Hook] Payment notification processed successfully for order: ${order.id}`);
    return { abono: true };
  }
}
