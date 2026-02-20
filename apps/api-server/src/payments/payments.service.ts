import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R4Client } from '@papola/r4-sdk';
import { SupabaseService } from '../supabase/supabase.service';
import { OrderExpirationService } from '../r4-webhooks/order-expiration.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly r4Client: R4Client;

  constructor(
    private supabase: SupabaseService,
    private configService: ConfigService,
    private orderExpirationService: OrderExpirationService,
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
}
