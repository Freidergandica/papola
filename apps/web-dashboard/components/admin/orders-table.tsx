'use client'

import { useState } from 'react'
import { Search, Package, Clock, CheckCircle, Truck, ShoppingBag, XCircle } from 'lucide-react'

interface Order {
  id: string
  customer_id: string
  store_id: string
  total_amount: number
  discount_amount?: number
  status: string
  payment_method?: string
  payment_currency?: string
  amount_in_ves?: number
  delivery_address: string
  created_at: string
  profiles?: { full_name: string; email: string; phone_number: string }
  stores?: { name: string }
  order_items?: Array<{
    quantity: number
    unit_price: number
    products: { name: string }
  }>
}

interface StoreOption {
  id: string
  name: string
}

const statusLabels: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  paid: { label: 'Pagado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  accepted: { label: 'Aceptado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  preparing: { label: 'Preparando', color: 'bg-orange-100 text-orange-700', icon: Package },
  ready_for_pickup: { label: 'Listo', color: 'bg-green-100 text-green-700', icon: Package },
  ready_for_delivery: { label: 'Listo para envío', color: 'bg-green-100 text-green-700', icon: Truck },
  out_for_delivery: { label: 'En camino', color: 'bg-purple-100 text-purple-700', icon: Truck },
  delivered: { label: 'Entregado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Completado', color: 'bg-green-200 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
}

const paymentLabels: Record<string, string> = {
  c2p: 'C2P',
  pago_movil: 'Pago Móvil',
  cash: 'Efectivo',
}

export default function AdminOrdersTable({
  orders,
  stores,
}: {
  orders: Order[]
  stores: StoreOption[]
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [storeFilter, setStoreFilter] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const filtered = orders.filter((order) => {
    const matchesSearch =
      !search ||
      order.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      order.profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
      order.stores?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const matchesStore = storeFilter === 'all' || order.store_id === storeFilter

    return matchesSearch && matchesStatus && matchesStore
  })

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por usuario, afiliado o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-papola-blue/20"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="accepted">Aceptado</option>
          <option value="preparing">Preparando</option>
          <option value="ready_for_delivery">Listo para envío</option>
          <option value="out_for_delivery">En camino</option>
          <option value="delivered">Entregado</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-papola-blue/20"
        >
          <option value="all">Todos los afiliados</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filtered.map((order) => {
          const statusInfo = statusLabels[order.status] || statusLabels.pending
          const StatusIcon = statusInfo.icon
          const isExpanded = expandedOrder === order.id

          return (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.profiles?.full_name || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.stores?.name || 'Afiliado'} &middot; {new Date(order.created_at).toLocaleString('es', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-papola-blue">
                      ${order.total_amount?.toFixed(2)}
                    </p>
                    {order.amount_in_ves && (
                      <p className="text-xs text-gray-400">
                        Bs. {order.amount_in_ves.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs font-medium mb-1">Usuario</p>
                      <p className="text-gray-900">{order.profiles?.full_name || '—'}</p>
                      <p className="text-gray-500 text-xs">{order.profiles?.email}</p>
                      {order.profiles?.phone_number && (
                        <p className="text-gray-500 text-xs">{order.profiles.phone_number}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs font-medium mb-1">Pago</p>
                      <p className="text-gray-900">
                        {order.payment_method ? paymentLabels[order.payment_method] || order.payment_method : 'No especificado'}
                      </p>
                      <p className="text-gray-500 text-xs">{order.payment_currency || 'USD'}</p>
                      {order.discount_amount && order.discount_amount > 0 && (
                        <p className="text-green-600 text-xs">Descuento: -${order.discount_amount.toFixed(2)}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs font-medium mb-1">Dirección</p>
                      <p className="text-gray-900 text-xs">{order.delivery_address || '—'}</p>
                    </div>
                  </div>

                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-gray-400 text-xs font-medium mb-2">Productos</p>
                      <div className="space-y-1">
                        {order.order_items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {item.quantity}x {item.products?.name}
                            </span>
                            <span className="text-gray-500">
                              ${(item.quantity * item.unit_price).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      ID: {order.id.slice(0, 8)}... &middot; Creado: {new Date(order.created_at).toLocaleString('es')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Sin pedidos</h3>
          <p className="mt-2 text-sm text-gray-500">
            {orders.length === 0
              ? 'Aún no hay pedidos en la plataforma.'
              : 'No se encontraron pedidos con esos criterios.'}
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Mostrando {filtered.length} de {orders.length} pedidos
      </p>
    </div>
  )
}
