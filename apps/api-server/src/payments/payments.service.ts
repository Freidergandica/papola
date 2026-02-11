import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PaymentsService {
  constructor(private supabase: SupabaseService) {}

  async getExchangeRate(pair = 'USD_VES'): Promise<{ rate: number; source: string; fetched_at: string }> {
    const { data, error } = await this.supabase
      .getClient()
      .from('exchange_rates')
      .select('*')
      .eq('currency_pair', pair)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // Fallback rate if no rate in DB
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
