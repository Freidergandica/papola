import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Deal } from '../types';

export function useNewDeals(onNewDeal: (deal: Deal) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('new-deals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deals',
        },
        async (payload) => {
          // Only notify for active, approved deals
          if (payload.new.is_active && payload.new.is_approved) {
            const { data } = await supabase
              .from('deals')
              .select('*, stores(id, name, image_url)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              onNewDeal(data as Deal);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewDeal]);
}
