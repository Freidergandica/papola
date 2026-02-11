import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DealsService {
  constructor(private supabase: SupabaseService) {}

  async findAll(filters: {
    store_id?: string;
    active?: boolean;
    featured?: boolean;
    flash?: boolean;
    approved?: boolean;
  }) {
    let query = this.supabase
      .getClient()
      .from('deals')
      .select('*, stores(id, name, logo_url)');

    if (filters.store_id) {
      query = query.eq('store_id', filters.store_id);
    }
    if (filters.active !== undefined) {
      query = query.eq('is_active', filters.active);
    }
    if (filters.featured !== undefined) {
      query = query.eq('is_featured', filters.featured);
    }
    if (filters.flash !== undefined) {
      query = query.eq('is_flash_deal', filters.flash);
    }
    if (filters.approved !== undefined) {
      query = query.eq('is_approved', filters.approved);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('deals')
      .select('*, stores(id, name, logo_url), deal_products(product_id, products(*))')
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Deal not found');
    return data;
  }

  async findByCode(code: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('deals')
      .select('*, stores(id, name, logo_url)')
      .eq('coupon_code', code.toUpperCase())
      .eq('is_active', true)
      .eq('is_approved', true)
      .single();

    if (error) throw new NotFoundException('Coupon not found or inactive');

    if (data.ends_at && new Date(data.ends_at) < new Date()) {
      throw new BadRequestException('This coupon has expired');
    }
    if (data.max_redemptions && data.current_redemptions >= data.max_redemptions) {
      throw new BadRequestException('This coupon has reached its redemption limit');
    }

    return data;
  }

  async create(dealData: {
    store_id: string;
    created_by: string;
    title: string;
    description?: string;
    image_url?: string;
    discount_type: string;
    discount_value?: number;
    buy_quantity?: number;
    get_quantity?: number;
    coupon_code?: string;
    applies_to?: string;
    category?: string;
    starts_at?: string;
    ends_at?: string;
    is_flash_deal?: boolean;
    max_redemptions?: number;
    min_order_amount?: number;
    currency?: string;
    product_ids?: string[];
  }) {
    const { product_ids, ...deal } = dealData;

    if (deal.coupon_code) {
      deal.coupon_code = deal.coupon_code.toUpperCase();
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('deals')
      .insert(deal)
      .select()
      .single();

    if (error) throw error;

    if (product_ids?.length && deal.applies_to === 'specific_products') {
      const dealProducts = product_ids.map((product_id) => ({
        deal_id: data.id,
        product_id,
      }));
      const { error: dpError } = await this.supabase
        .getClient()
        .from('deal_products')
        .insert(dealProducts);
      if (dpError) throw dpError;
    }

    return data;
  }

  async update(
    id: string,
    updateData: Partial<{
      title: string;
      description: string;
      image_url: string;
      discount_value: number;
      ends_at: string;
      is_active: boolean;
      is_featured: boolean;
      is_approved: boolean;
      max_redemptions: number;
      min_order_amount: number;
    }>,
  ) {
    const { data, error } = await this.supabase
      .getClient()
      .from('deals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException('Deal not found');
    return data;
  }

  async redeem(id: string, customerId: string, orderId?: string) {
    const deal = await this.findOne(id);

    if (!deal.is_active || !deal.is_approved) {
      throw new BadRequestException('This deal is not available');
    }
    if (deal.ends_at && new Date(deal.ends_at) < new Date()) {
      throw new BadRequestException('This deal has expired');
    }
    if (deal.max_redemptions && deal.current_redemptions >= deal.max_redemptions) {
      throw new BadRequestException('This deal has reached its redemption limit');
    }

    const discountApplied = deal.discount_value || 0;

    const { data, error } = await this.supabase
      .getClient()
      .from('deal_redemptions')
      .insert({
        deal_id: id,
        customer_id: customerId,
        order_id: orderId,
        discount_applied: discountApplied,
      })
      .select()
      .single();

    if (error) throw error;

    await this.supabase
      .getClient()
      .from('deals')
      .update({ current_redemptions: deal.current_redemptions + 1 })
      .eq('id', id);

    return data;
  }
}
