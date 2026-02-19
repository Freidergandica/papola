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

function formatWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  if (digits.startsWith('0')) return `https://wa.me/58${digits.slice(1)}`
  if (digits.startsWith('58')) return `https://wa.me/${digits}`
  return `https://wa.me/${digits}`
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
                        <a
                          href={formatWhatsAppUrl(order.profiles.phone_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-medium text-xs bg-green-50 px-2 py-0.5 rounded-full mt-1"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.121.553 4.119 1.527 5.855L.061 23.489l5.824-1.525A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.888 0-3.72-.514-5.32-1.487l-.381-.227-3.954 1.037 1.055-3.855-.249-.396A9.782 9.782 0 012.182 12C2.182 6.584 6.584 2.182 12 2.182S21.818 6.584 21.818 12 17.416 21.818 12 21.818z"/>
                          </svg>
                          {order.profiles.phone_number}
                        </a>
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
