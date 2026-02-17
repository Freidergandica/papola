import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R4Client } from '@papola/r4-sdk';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly r4Client: R4Client;

  constructor(
    private supabase: SupabaseService,
    private configService: ConfigService,
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

  async initializePayment(data: {
    order_id: string;
    amount: number;
    currency: string;
    payment_method: 'c2p' | 'pago_movil' | 'cash';
  }) {
    // For now, return a payment reference for the store to verify manually
    // In production, this would integrate with C2P/Pago Movil APIs
    const reference = `PAP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error } = await this.supabase
      .getClient()
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
