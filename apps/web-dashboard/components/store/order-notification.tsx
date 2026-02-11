'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, X } from 'lucide-react'

interface Notification {
  id: string
  orderId: string
  total: number
  customerName: string
  timestamp: Date
}

export default function OrderNotification({ storeId }: { storeId: string | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!storeId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`store-notifications-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        async (payload) => {
          const { data: order } = await supabase
            .from('orders')
            .select('id, total_amount, profiles!orders_customer_id_fkey(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (order) {
            const notification: Notification = {
              id: crypto.randomUUID(),
              orderId: order.id,
              total: order.total_amount,
              customerName: (order as any).profiles?.full_name || 'Cliente',
              timestamp: new Date(),
            }

            setNotifications(prev => [notification, ...prev].slice(0, 5))

            try {
              const audio = new Audio('/notification.mp3')
              audio.play().catch(() => {})
            } catch {}

            // Auto-dismiss after 10 seconds
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== notification.id))
            }, 10000)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId])

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="bg-white shadow-lg rounded-lg border border-papola-blue-20 p-4 animate-slide-in flex items-start gap-3"
        >
          <div className="flex-shrink-0 bg-papola-blue-20 rounded-full p-2">
            <ShoppingBag className="h-5 w-5 text-papola-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Nuevo Pedido</p>
            <p className="text-sm text-gray-600">{n.customerName}</p>
            <p className="text-sm font-bold text-papola-blue">${n.total.toFixed(2)}</p>
          </div>
          <button
            onClick={() => dismiss(n.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
