import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useOrderUpdates(
  orderId: string | null,
  onStatusChange: (newStatus: string) => void,
) {
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new.status) {
            onStatusChange(payload.new.status);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, onStatusChange]);
}
