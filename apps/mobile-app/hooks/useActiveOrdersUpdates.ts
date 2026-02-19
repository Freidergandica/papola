import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to real-time updates for ALL orders belonging to a customer.
 * Uses a single Supabase channel with a customer_id filter.
 */
export function useActiveOrdersUpdates(
  customerId: string | null,
  onOrderUpdate: (orderId: string, updatedFields: Record<string, unknown>) => void,
) {
  useEffect(() => {
    if (!customerId) return;

    const channel = supabase
      .channel(`customer-orders-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          if (payload.new?.id) {
            onOrderUpdate(payload.new.id as string, payload.new as Record<string, unknown>);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, onOrderUpdate]);
}
