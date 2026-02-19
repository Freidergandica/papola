'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, Clock, CheckCircle, Truck, AlertCircle, ShieldCheck, Banknote, Smartphone } from 'lucide-react'
import { useNewOrders } from '@/hooks/useNewOrders'

interface Order {
  id: string
  customer_id: string
  total_amount: number
  discount_amount?: number
  status: string
  payment_method?: string
  payment_currency?: string
  amount_in_ves?: number
  delivery_address: string
  created_at: string
  profiles?: { full_name: string; phone_number: string }
  order_items?: Array<{
    quantity: number
    unit_price: number
    products: { name: string }
  }>
}

const statusLabels: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  pending_payment: { label: 'Esperando Pago', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  authorized: { label: 'Pago Autorizado', color: 'bg-indigo-100 text-indigo-700', icon: ShieldCheck },
  paid: { label: 'Pagado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  accepted: { label: 'Aceptado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  preparing: { label: 'Preparando', color: 'bg-orange-100 text-orange-700', icon: Package },
  ready_for_pickup: { label: 'Listo', color: 'bg-green-100 text-green-700', icon: Package },
  ready_for_delivery: { label: 'Listo para envío', color: 'bg-green-100 text-green-700', icon: Truck },
  out_for_delivery: { label: 'En camino', color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { label: 'Entregado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: Package },
  expired: { label: 'Expirado', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

const paymentMethodLabels: Record<string, { label: string; icon: typeof Package }> = {
  pago_movil: { label: 'Pago Móvil', icon: Smartphone },
  cash: { label: 'Efectivo', icon: Banknote },
  c2p: { label: 'C2P', icon: Smartphone },
}

const nextStatus: Record<string, string> = {
  pending: 'accepted',
  accepted: 'preparing',
  preparing: 'ready_for_delivery',
  ready_for_delivery: 'out_for_delivery',
  out_for_delivery: 'delivered',
  delivered: 'completed',
}

export default function StoreOrdersList({
  initialOrders,
  storeId,
}: {
  initialOrders: Order[]
  storeId: string
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const supabase = createClient()

  // Realtime: listen for new orders and updates
  useNewOrders(
    storeId,
    (newOrder) => {
      setOrders(prev => [newOrder, ...prev])
    },
    (updatedOrder) => {
      setOrders(prev =>
        prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
      )
    },
  )

  const advanceStatus = async (orderId: string, currentStatus: string) => {
    const next = nextStatus[currentStatus]
    if (!next) return

    // RLS ensures only store owner can update their own store's orders
    const { error } = await supabase
      .from('orders')
      .update({ status: next })
      .eq('id', orderId)
      .eq('store_id', storeId) // Extra safety: only update if belongs to this store

    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: next } : o))
    }
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="mt-1 text-sm text-gray-500">Gestiona los pedidos de tu negocio en tiempo real.</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Sin pedidos</h3>
          <p className="mt-2 text-sm text-gray-500">Los pedidos aparecerán aquí en tiempo real.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = statusLabels[order.status] || statusLabels.pending
            const StatusIcon = statusInfo.icon
            return (
              <div key={order.id} className="bg-white shadow rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </span>
                    {order.payment_method && paymentMethodLabels[order.payment_method] && (() => {
                      const pm = paymentMethodLabels[order.payment_method!]
                      const PmIcon = pm.icon
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <PmIcon className="h-3 w-3 mr-1" />
                          {pm.label}
                        </span>
                      )
                    })()}
                    <span className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleString('es')}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-papola-blue">
                    ${order.total_amount.toFixed(2)}
                    {order.amount_in_ves && (
                      <span className="text-xs text-gray-400 ml-2">
                        Bs. {order.amount_in_ves.toFixed(2)}
                      </span>
                    )}
                  </span>
                </div>

                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">{order.profiles?.full_name || 'Usuario'}</span>
                  {order.profiles?.phone_number && (
                    <span className="text-gray-400 ml-2">{order.profiles.phone_number}</span>
                  )}
                </div>

                {order.order_items && (
                  <div className="text-sm text-gray-500 mb-3">
                    {order.order_items.map((item, i) => (
                      <span key={i}>
                        {item.quantity}x {item.products?.name}
                        {i < order.order_items!.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {order.discount_amount && order.discount_amount > 0 && (
                  <div className="text-xs text-green-600 mb-2">
                    Descuento aplicado: -${order.discount_amount.toFixed(2)}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {order.delivery_address}
                  </span>
                  {nextStatus[order.status] && (
                    <button
                      onClick={() => advanceStatus(order.id, order.status)}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-papola-blue rounded-lg hover:bg-papola-blue-80 transition-colors"
                    >
                      {order.status === 'pending' ? 'Aceptar' : 'Avanzar'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
