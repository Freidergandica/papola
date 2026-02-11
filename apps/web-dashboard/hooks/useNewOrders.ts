'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useNewOrders(
  storeId: string | null,
  onNewOrder: (order: any) => void,
) {
  useEffect(() => {
    if (!storeId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`store-orders-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        async (payload) => {
          // Fetch the full order with relations
          const { data } = await supabase
            .from('orders')
            .select('*, profiles!orders_customer_id_fkey(full_name, phone_number), order_items(*, products(name))')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            onNewOrder(data)

            // Play notification sound
            try {
              const audio = new Audio('/notification.mp3')
              audio.play().catch(() => {})
            } catch {}
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, onNewOrder])
}
