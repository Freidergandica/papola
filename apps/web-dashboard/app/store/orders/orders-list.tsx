'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, Clock, CheckCircle, Truck, AlertCircle, ShieldCheck, Banknote, Smartphone, MapPin } from 'lucide-react'
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

function formatWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.startsWith('0')) return `https://wa.me/58${digits.slice(1)}`
  if (digits.startsWith('58')) return `https://wa.me/${digits}`
  return `https://wa.me/${digits}`
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

                <div className="text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <span className="font-medium">{order.profiles?.full_name || 'Usuario'}</span>
                  {order.profiles?.phone_number && (
                    <a
                      href={formatWhatsAppUrl(order.profiles.phone_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-medium text-xs bg-green-50 px-2 py-0.5 rounded-full"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.121.553 4.119 1.527 5.855L.061 23.489l5.824-1.525A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.888 0-3.72-.514-5.32-1.487l-.381-.227-3.954 1.037 1.055-3.855-.249-.396A9.782 9.782 0 012.182 12C2.182 6.584 6.584 2.182 12 2.182S21.818 6.584 21.818 12 17.416 21.818 12 21.818z"/>
                      </svg>
                      {order.profiles.phone_number}
                    </a>
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

                {order.delivery_address && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-700 mb-3">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium">{order.delivery_address}</span>
                  </div>
                )}

                <div className="flex items-center justify-end pt-3 border-t border-gray-100">
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
