'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, CheckCircle, X } from 'lucide-react'

interface Notification {
  id: string
  orderId: string
  total: number
  customerName: string
  timestamp: Date
  type: 'new_order' | 'payment_confirmed'
}

export default function OrderNotification({ storeId }: { storeId: string | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!storeId) return

    const supabase = createClient()

    const addNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 5))

      try {
        const audio = new Audio('/notification.mp3')
        audio.play().catch(() => {})
      } catch {}

      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
      }, 10000)
    }

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
          // Skip notification for pending_payment orders (pago_movil waiting for R4)
          if (payload.new.status === 'pending_payment') return

          const { data: order } = await supabase
            .from('orders')
            .select('id, total_amount, profiles!orders_customer_id_fkey(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (order) {
            addNotification({
              id: crypto.randomUUID(),
              orderId: order.id,
              total: order.total_amount,
              customerName: (order as any).profiles?.full_name || 'Usuario',
              timestamp: new Date(),
              type: 'new_order',
            })
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        async (payload) => {
          // Notify when payment is confirmed (status changed to accepted)
          if (payload.new.status !== 'accepted') return
          // Only notify if transitioning from a payment-pending state
          if (payload.old.status !== 'authorized' && payload.old.status !== 'pending_payment') return

          const { data: order } = await supabase
            .from('orders')
            .select('id, total_amount, profiles!orders_customer_id_fkey(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (order) {
            addNotification({
              id: crypto.randomUUID(),
              orderId: order.id,
              total: order.total_amount,
              customerName: (order as any).profiles?.full_name || 'Usuario',
              timestamp: new Date(),
              type: 'payment_confirmed',
            })
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
          <div className={`flex-shrink-0 rounded-full p-2 ${n.type === 'payment_confirmed' ? 'bg-green-100' : 'bg-papola-blue-20'}`}>
            {n.type === 'payment_confirmed'
              ? <CheckCircle className="h-5 w-5 text-green-600" />
              : <ShoppingBag className="h-5 w-5 text-papola-blue" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">
              {n.type === 'payment_confirmed' ? 'Pago Confirmado' : 'Nuevo Pedido'}
            </p>
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
