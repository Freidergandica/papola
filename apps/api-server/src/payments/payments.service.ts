import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R4Client } from '@papola/r4-sdk';
import { SupabaseService } from '../supabase/supabase.service';
import { OrderExpirationService } from '../r4-webhooks/order-expiration.service';
import { PushNotificationService } from '../notifications/push-notification.service';

const FEE_PERCENTAGE = 6.8;

/** Mapeo de códigos R4 a mensajes amigables en español */
const C2P_ERROR_MESSAGES: Record<string, string> = {
  '08': 'Token inválido. Intenta de nuevo.',
  '15': 'Error de autenticación.',
  '30': 'Datos incorrectos. Verifica tu información.',
  '41': 'Tu banco no está disponible. Intenta más tarde.',
  '51': 'Fondos insuficientes.',
  '55': 'El teléfono no está registrado.',
  '56': 'El teléfono no coincide con tu cuenta bancaria.',
  '80': 'Cédula incorrecta.',
  '87': 'Tiempo de espera agotado. Intenta de nuevo.',
  '91': 'Tu banco no está disponible. Intenta más tarde.',
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly r4Client: R4Client;

  constructor(
    private supabase: SupabaseService,
    private configService: ConfigService,
    private orderExpirationService: OrderExpirationService,
    private pushNotificationService: PushNotificationService,
  ) {
    this.r4Client = new R4Client({
      commerce: this.configService.get<string>('R4_COMMERCE_TOKEN', ''),
    });
  }

  async getExchangeRate(pair = 'USD_VES'): Promise<{ rate: number; source: string; fetched_at: string }> {
    // Try to fetch live rate from R4 BCV
    try {
      const today = new Date().toISOString().split('T')[0];
      const bcvResponse = await this.r4Client.consultarTasaBcv('USD', today);

      if (bcvResponse.tipocambio > 0) {
        const now = new Date().toISOString();

        // Save to exchange_rates table
        await this.supabase
          .getClient()
          .from('exchange_rates')
          .upsert(
            { currency_pair: pair, rate: bcvResponse.tipocambio, source: 'r4_bcv', fetched_at: now },
            { onConflict: 'currency_pair' },
          );

        this.logger.log(`BCV rate fetched: ${bcvResponse.tipocambio}`);
        return { rate: bcvResponse.tipocambio, source: 'r4_bcv', fetched_at: now };
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch BCV rate from R4: ${err}`);
    }

    // Fallback: use latest rate from DB
    const { data, error } = await this.supabase
      .getClient()
      .from('exchange_rates')
      .select('*')
      .eq('currency_pair', pair)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { rate: 36.5, source: 'fallback', fetched_at: new Date().toISOString() };
    }

    return { rate: data.rate, source: data.source, fetched_at: data.fetched_at };
  }

  calculateVES(amountUSD: number, rate: number): number {
    return Math.round(amountUSD * rate * 100) / 100;
  }

  /**
   * Inicializa un pago — adaptado del legacy:
   * - Para pago_movil: guarda payment_id_card en la orden, status → pending_payment,
   *   programa expiración (5 min). Luego R4 enviará R4consulta y R4notifica.
   * - Para cash/c2p: genera referencia simple.
   *
   * Legacy equivalente: OrderService.checkout() + createMobilePayment()
   */
  async initializePayment(data: {
    order_id: string;
    amount: number;
    currency: string;
    payment_method: 'c2p' | 'pago_movil' | 'cash';
    id_card?: string;      // Cédula del cliente (requerida para pago_movil)
    amount_in_ves?: number; // Monto en Bs (requerida para pago_movil)
  }) {
    const supabase = this.supabase.getClient();

    if (data.payment_method === 'pago_movil') {
      // Validar campos requeridos (igual que legacy: if (!dto.idCard) throw)
      if (!data.id_card) {
        throw new BadRequestException('id_card is required for pago_movil');
      }
      if (!data.amount_in_ves) {
        throw new BadRequestException('amount_in_ves is required for pago_movil');
      }

      this.logger.log(`[Initialize Payment] Creating mobile payment: orderId=${data.order_id}, idCard=${data.id_card}, amountVES=${data.amount_in_ves}`);

      // Actualizar orden con datos del pago móvil y cambiar status a pending_payment
      // En legacy: creaba MobilePayment separado + Order.status = PendingPayment
      // Aquí: todo en la tabla orders directamente
      const { error } = await supabase
        .from('orders')
        .update({
          payment_method: 'pago_movil',
          payment_id_card: data.id_card,
          amount_in_ves: data.amount_in_ves,
          status: 'pending_payment',
        })
        .eq('id', data.order_id);

      if (error) {
        this.logger.error(`[Initialize Payment] Failed to update order: ${error.message}`);
        throw error;
      }

      // Programar expiración (legacy: BullMQ 5 min, aquí: setTimeout 5 min)
      this.orderExpirationService.scheduleExpiration(data.order_id);

      this.logger.log(`[Initialize Payment] Mobile payment created, expiration scheduled for order: ${data.order_id}`);

      return {
        order_id: data.order_id,
        amount: data.amount,
        amount_in_ves: data.amount_in_ves,
        currency: data.currency,
        payment_method: data.payment_method,
        status: 'pending_payment',
        instructions: 'Realiza el Pago Móvil con los datos proporcionados. Tu pago será verificado automáticamente.',
      };
    }

    // Para cash y c2p: generar referencia simple
    const reference = `PAP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error } = await supabase
      .from('orders')
      .update({ payment_reference: reference })
      .eq('id', data.order_id);

    if (error) throw error;

    return {
      reference,
      order_id: data.order_id,
      amount: data.amount,
      currency: data.currency,
      payment_method: data.payment_method,
      status: 'pending',
      instructions: this.getPaymentInstructions(data.payment_method),
    };
  }

  private getPaymentInstructions(method: string): string {
    switch (method) {
      case 'c2p':
        return 'Realiza la transferencia C2P al número indicado y comparte el comprobante.';
      case 'pago_movil':
        return 'Realiza el Pago Móvil con los datos proporcionados y comparte la referencia.';
      case 'cash':
        return 'Paga en efectivo al momento de la entrega.';
      default:
        return '';
    }
  }

  // ── C2P ("Pago con Tarjeta") ────────────────────────────────────────

  /**
   * Paso 1: Generar OTP — R4 envía SMS al teléfono del cliente.
   */
  async generateC2pOtp(data: {
    order_id: string;
    phone: string;
    cedula: string;
    banco: string;
    monto: string;
  }) {
    this.logger.log(`[C2P OTP] Generating OTP for order ${data.order_id}: phone=${data.phone}, banco=${data.banco}`);

    try {
      const response = await this.r4Client.generarOtp({
        Banco: data.banco,
        Monto: data.monto,
        Telefono: data.phone,
        Cedula: data.cedula,
      });

      this.logger.log(`[C2P OTP] Response: ${JSON.stringify(response)}`);

      if (response.success || response.code === '202') {
        return { success: true, message: 'OTP enviado a tu teléfono' };
      }

      return {
        success: false,
        code: response.code,
        message: C2P_ERROR_MESSAGES[response.code] || response.message || 'Error al generar OTP',
      };
    } catch (error: any) {
      this.logger.error(`[C2P OTP] Error: ${error?.message}`);
      return {
        success: false,
        code: 'ERROR',
        message: 'No se pudo enviar el código. Intenta de nuevo.',
      };
    }
  }

  /**
   * Paso 2: Cobrar C2P — Cobra de la cuenta del cliente usando su OTP.
   * Respuesta inmediata (no hay webhooks).
   */
  async chargeC2p(data: {
    order_id: string;
    phone: string;
    cedula: string;
    banco: string;
    monto: string;
    otp: string;
  }) {
    this.logger.log(`[C2P Charge] Processing charge for order ${data.order_id}`);

    const supabase = this.supabase.getClient();

    // Verificar que la orden existe y está en pending_payment
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, store_id, total_amount, amount_in_ves, status')
      .eq('id', data.order_id)
      .single();

    if (orderError || !order) {
      throw new BadRequestException('Orden no encontrada');
    }

    if (order.status !== 'pending_payment') {
      throw new BadRequestException('Esta orden no está pendiente de pago');
    }

    // Verificar que el monto coincide con la orden
    const expectedAmount = Number(order.amount_in_ves);
    const clientAmount = parseFloat(data.monto);
    if (expectedAmount > 0 && Math.abs(expectedAmount - clientAmount) > 0.01) {
      this.logger.warn(`[C2P Charge] Amount mismatch: order=${expectedAmount}, client=${clientAmount}`);
      throw new BadRequestException('El monto no coincide con la orden');
    }

    // Paso 1: Llamar a R4 para cobrar (esto SÍ puede fallar y retornar error al usuario)
    let response: any;
    try {
      response = await this.r4Client.cobrarC2p({
        TelefonoDestino: data.phone,
        Cedula: data.cedula,
        Banco: data.banco,
        Monto: data.monto,
        Otp: data.otp,
        Concepto: 'Compra Papola',
      });

      this.logger.log(`[C2P Charge] R4 response: ${JSON.stringify(response)}`);
    } catch (error: any) {
      this.logger.error(`[C2P Charge] R4 call error: ${error?.message}`);
      return {
        success: false,
        code: 'ERROR',
        message: 'Error al procesar el pago. Intenta de nuevo.',
      };
    }

    if (response.code !== '00') {
      return {
        success: false,
        code: response.code,
        message: C2P_ERROR_MESSAGES[response.code] || response.message || 'Error al procesar el pago',
      };
    }

    // Paso 2: R4 cobró exitosamente — desde aquí NUNCA retornar error al usuario
    // (si algo falla en DB, el usuario ya fue cobrado y mostrar error causaría reintento = doble cobro)
    try {
      this.orderExpirationService.cancelExpiration(data.order_id);

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'accepted',
          payment_phone: data.phone,
          payment_bank: data.banco,
          payment_reference: response.reference,
          payment_id_card: data.cedula.replace(/^[VJEG]/i, ''),
          payment_datetime: new Date().toISOString(),
        })
        .eq('id', data.order_id);

      if (updateError) {
        this.logger.error(`[C2P Charge] CRITICAL: DB update failed after R4 charge. Order: ${data.order_id}, Ref: ${response.reference}, Error: ${updateError.message}`);
      }

      // Calcular fees y actualizar balances
      const numAmount = parseFloat(data.monto);
      const fee = Number((FEE_PERCENTAGE / 100 * numAmount).toFixed(2));
      const profit = Number((numAmount - fee).toFixed(2));

      this.logger.log(`[C2P Charge] Balances: amount=${numAmount}, fee=${fee}, profit=${profit}`);

      const { error: balErr1 } = await supabase.rpc('increment_store_balance', {
        p_store_id: order.store_id,
        p_amount: profit,
      });
      if (balErr1) this.logger.error(`[C2P Charge] Failed to increment store balance: ${balErr1.message}`);

      const { error: balErr2 } = await supabase.rpc('increment_platform_balance', {
        p_key: 'available_balance',
        p_amount: fee,
      });
      if (balErr2) this.logger.error(`[C2P Charge] Failed to increment available_balance: ${balErr2.message}`);

      const { error: balErr3 } = await supabase.rpc('increment_platform_balance', {
        p_key: 'accounting_balance',
        p_amount: profit,
      });
      if (balErr3) this.logger.error(`[C2P Charge] Failed to increment accounting_balance: ${balErr3.message}`);

      const { error: txErr } = await supabase.from('payment_transactions').insert({
        order_id: data.order_id,
        store_id: order.store_id,
        gross_amount: numAmount,
        fee_percentage: FEE_PERCENTAGE,
        fee_amount: fee,
        net_amount: profit,
      });
      if (txErr) this.logger.error(`[C2P Charge] Failed to insert payment_transaction: ${txErr.message}`);

      try {
        await this.pushNotificationService.sendToStoreOwner(
          order.store_id,
          'Nuevo pago recibido',
          `Se ha confirmado un pago de Bs. ${numAmount.toFixed(2)} en tu tienda`,
          { orderId: data.order_id, event: 'payment.accepted' },
        );
      } catch (pushError: any) {
        this.logger.warn(`[C2P Charge] Push notification failed: ${pushError?.message}`);
      }
    } catch (postChargeError: any) {
      // R4 ya cobró — loguear pero SIEMPRE retornar success al usuario
      this.logger.error(`[C2P Charge] CRITICAL: Post-charge error (R4 already charged). Order: ${data.order_id}, Ref: ${response.reference}, Error: ${postChargeError?.message}`);
    }

    this.logger.log(`[C2P Charge] Payment successful: order=${data.order_id}, reference=${response.reference}`);

    return {
      success: true,
      reference: response.reference,
      message: 'Pago procesado exitosamente',
    };
  }
}
