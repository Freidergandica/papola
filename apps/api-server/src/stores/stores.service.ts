import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class StoresService {
  constructor(private supabase: SupabaseService) {}

  async findAll(activeOnly = false) {
    let query = this.supabase.getClient().from('stores').select('*');
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query.order('rating', { ascending: false });
    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
}
