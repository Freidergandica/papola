import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R4Client } from '@papola/r4-sdk';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DispersalsService {
  private readonly logger = new Logger(DispersalsService.name);
  private readonly r4Client: R4Client;

  constructor(
    private supabase: SupabaseService,
    private configService: ConfigService,
  ) {
    this.r4Client = new R4Client({
      commerce: this.configService.get<string>('R4_COMMERCE_TOKEN', ''),
    });
  }

  /**
   * Preview — Muestra las tiendas listas para dispersión.
   * Requisitos: balance > 0 y cuenta bancaria aprobada (20 dígitos).
   */
  async preview() {
    const supabase = this.supabase.getClient();

    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, balance, bank_name, bank_account_number, bank_account_holder_id')
      .gt('balance', 0)
      .not('bank_account_number', 'is', null);

    if (error) throw error;

    // Filtrar solo las que tienen cuenta de 20 dígitos
    const eligible = (stores || []).filter(
      (s) => s.bank_account_number && s.bank_account_number.length === 20,
    );

    const totalAmount = eligible.reduce((sum, s) => sum + Number(s.balance), 0);

    return {
      stores: eligible.map((s) => ({
        id: s.id,
        name: s.name,
        balance: Number(s.balance),
        bank_name: s.bank_name,
        bank_account_number: s.bank_account_number,
        bank_account_holder_id: s.bank_account_holder_id,
      })),
      total_amount: Math.round(totalAmount * 100) / 100,
      store_count: eligible.length,
    };
  }

  /**
   * Execute — Ejecuta la dispersión via R4pagos.
   * Requiere una referencia de un pago previamente recibido.
   */
  async execute(reference: string, executedBy?: string) {
    const supabase = this.supabase.getClient();

    // Obtener tiendas elegibles
    const previewData = await this.preview();

    if (previewData.store_count === 0) {
      throw new BadRequestException('No hay tiendas con balance para dispersar');
    }

    if (!reference || reference.length < 1) {
      throw new BadRequestException('Se requiere una referencia de pago previo');
    }

    const totalAmount = previewData.total_amount;
    const fecha = this.formatDate(new Date()); // MM/DD/YYYY

    this.logger.log(`[Dispersal] Starting dispersal: ${previewData.store_count} stores, total=${totalAmount}, ref=${reference}`);

    // Crear registro de dispersión (status: pending)
    const { data: dispersal, error: createError } = await supabase
      .from('dispersals')
      .insert({
        reference,
        total_amount: totalAmount,
        store_count: previewData.store_count,
        status: 'pending',
        executed_by: executedBy || null,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Crear items de la dispersión
    const items = previewData.stores.map((store) => ({
      dispersal_id: dispersal.id,
      store_id: store.id,
      store_name: store.name,
      bank_account_number: store.bank_account_number,
      bank_account_holder_id: store.bank_account_holder_id,
      amount: store.balance,
      previous_balance: store.balance,
    }));

    await supabase.from('dispersal_items').insert(items);

    // Armar payload R4pagos
    const personas = previewData.stores.map((store) => ({
      nombres: store.name,
      documento: (store.bank_account_holder_id || '').replace(/-/g, ''),
      destino: store.bank_account_number,
      montoPart: store.balance.toFixed(2),
    }));

    // Verificar que la suma de montoPart == monto total (evita rechazo por redondeo)
    const sumParts = personas.reduce((s, p) => s + parseFloat(p.montoPart), 0);
    const montoStr = sumParts.toFixed(2);

    try {
      const r4Response = await this.r4Client.dispersarPagos({
        monto: montoStr,
        fecha,
        Referencia: reference.slice(0, 8).padStart(8, '0'),
        personas,
      });

      this.logger.log(`[Dispersal] R4 response: ${JSON.stringify(r4Response)}`);

      if (r4Response.success) {
        // Actualizar dispersal → success
        await supabase
          .from('dispersals')
          .update({ status: 'success', r4_response: r4Response })
          .eq('id', dispersal.id);

        // Restar monto dispersado del balance de cada tienda
        // Usamos decrement_store_balance RPC para no perder pagos que lleguen durante la dispersión
        for (const store of previewData.stores) {
          const { error: balErr } = await supabase.rpc('decrement_store_balance', {
            p_store_id: store.id,
            p_amount: store.balance,
          });
          if (balErr) this.logger.error(`[Dispersal] Failed to decrement balance for store ${store.id}: ${balErr.message}`);
        }

        // Decrementar accounting_balance de forma atómica
        const { error: platErr } = await supabase.rpc('decrement_platform_balance', {
          p_key: 'accounting_balance',
          p_amount: totalAmount,
        });
        if (platErr) this.logger.error(`[Dispersal] Failed to decrement accounting_balance: ${platErr.message}`);

        this.logger.log(`[Dispersal] Success: ${previewData.store_count} stores, total=${totalAmount}`);

        return {
          success: true,
          dispersal_id: dispersal.id,
          total_amount: totalAmount,
          store_count: previewData.store_count,
        };
      } else {
        // R4 rechazó la dispersión
        await supabase
          .from('dispersals')
          .update({
            status: 'failed',
            r4_response: r4Response,
            error_message: r4Response.error || r4Response.message,
          })
          .eq('id', dispersal.id);

        this.logger.error(`[Dispersal] R4 rejected: ${r4Response.error || r4Response.message}`);

        return {
          success: false,
          dispersal_id: dispersal.id,
          error: r4Response.error || r4Response.message || 'Error en la dispersión',
        };
      }
    } catch (error: any) {
      // Error de red o inesperado
      await supabase
        .from('dispersals')
        .update({
          status: 'failed',
          error_message: error?.message || 'Error inesperado',
        })
        .eq('id', dispersal.id);

      this.logger.error(`[Dispersal] Error: ${error?.message}`);
      throw error;
    }
  }

  /**
   * Historial de dispersiones.
   */
  async history(limit = 20) {
    const { data, error } = await this.supabase
      .getClient()
      .from('dispersals')
      .select('*, dispersal_items(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /** Formato MM/DD/YYYY requerido por R4pagos (hora Venezuela UTC-4) */
  private formatDate(date: Date): string {
    const ve = new Date(date.getTime() - 4 * 60 * 60 * 1000);
    const mm = String(ve.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(ve.getUTCDate()).padStart(2, '0');
    const yyyy = ve.getUTCFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }
}
