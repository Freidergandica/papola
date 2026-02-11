import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProductsService {
  constructor(private supabase: SupabaseService) {}

  async findByStore(storeId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_available', true);
    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
}
