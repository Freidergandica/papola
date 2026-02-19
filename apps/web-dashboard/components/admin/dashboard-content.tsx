'use client'

import { useState, useMemo } from 'react'
import { DollarSign, ShoppingBag, Store, Users, Trophy, ChevronRight, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Order {
  id: string
  total_amount: number
  created_at: string
  store_id: string
  status: string
  stores?: { name: string }
}

interface Profile {
  id: string
  email: string
  full_name: string | null
  phone_number: string | null
  role: string
  created_at: string
  avatar_url: string | null
}

interface StoreInfo {
  id: string
  name: string
  is_active: boolean
}

interface DashboardContentProps {
  orders: Order[]
  profiles: Profile[]
  storesCount: number
  storesList: StoreInfo[]
}

const monthNames = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

export default function DashboardContent({ orders, profiles, storesCount }: DashboardContentProps) {
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [usersPeriod, setUsersPeriod] = useState<'dia' | 'mes' | 'año'>('mes')
  const [usersSearch, setUsersSearch] = useState('')

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const currentMonthName = monthNames[currentMonth]

  const stats = useMemo(() => {
    // Ventas
    const ventasDelDia = orders
      .filter(o => o.created_at.slice(0, 10) === todayStr)
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

    const ventasDelMes = orders
      .filter(o => {
        const d = new Date(o.created_at)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

    const ventasTotales = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)

    // Pedidos
    const pedidosDelDia = orders.filter(o => o.created_at.slice(0, 10) === todayStr).length

    const pedidosDelMes = orders.filter(o => {
      const d = new Date(o.created_at)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length

    const pedidosTotales = orders.length

    // Record de ventas del dia
    const salesByDay: Record<string, number> = {}
    orders.forEach(o => {
      const dayKey = o.created_at.slice(0, 10)
      salesByDay[dayKey] = (salesByDay[dayKey] || 0) + (Number(o.total_amount) || 0)
    })
    let recordDay = ''
    let recordAmount = 0
    Object.entries(salesByDay).forEach(([day, amount]) => {
      if (amount > recordAmount) {
        recordAmount = amount
        recordDay = day
      }
    })

    // Ventas por afiliado (mes actual)
    const salesByStore: Record<string, { storeName: string; total: number; count: number }> = {}
    orders
      .filter(o => {
        const d = new Date(o.created_at)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .forEach(o => {
        if (!salesByStore[o.store_id]) {
          salesByStore[o.store_id] = {
            storeName: o.stores?.name || 'Desconocido',
            total: 0,
            count: 0,
          }
        }
        salesByStore[o.store_id].total += Number(o.total_amount) || 0
        salesByStore[o.store_id].count += 1
      })
    const storeBreakdown = Object.values(salesByStore).sort((a, b) => b.total - a.total)

    return {
      ventasDelDia, ventasDelMes, ventasTotales,
      pedidosDelDia, pedidosDelMes, pedidosTotales,
      recordDay, recordAmount,
      storeBreakdown,
    }
  }, [orders, todayStr, currentMonth, currentYear])

  const filteredUsers = useMemo(() => {
    let filtered = profiles

    if (usersPeriod === 'dia') {
      filtered = filtered.filter(p => p.created_at.slice(0, 10) === todayStr)
    } else if (usersPeriod === 'mes') {
      filtered = filtered.filter(p => {
        const d = new Date(p.created_at)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
    } else {
      filtered = filtered.filter(p => {
        const d = new Date(p.created_at)
        return d.getFullYear() === currentYear
      })
    }

    if (usersSearch) {
      const q = usersSearch.toLowerCase()
      filtered = filtered.filter(p =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [profiles, usersPeriod, usersSearch, todayStr, currentMonth, currentYear])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Panel General</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ventas Totales */}
        <div className="bg-white overflow-hidden rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-papola-green-20">
                <DollarSign className="h-6 w-6 text-papola-green" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-bold text-gray-500 truncate">Ventas Totales</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  ${stats.ventasTotales.toFixed(2)}
                </dd>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ventas del dia</span>
                <span className="font-bold text-gray-900">${stats.ventasDelDia.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Acumulado {currentMonthName}</span>
                <span className="font-bold text-papola-green">${stats.ventasDelMes.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pedidos */}
        <div className="bg-white overflow-hidden rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-papola-blue-20">
                <ShoppingBag className="h-6 w-6 text-papola-blue" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-bold text-gray-500 truncate">Pedidos Totales</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {stats.pedidosTotales}
                </dd>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pedidos diarios</span>
                <span className="font-bold text-gray-900">{stats.pedidosDelDia}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pedidos de {currentMonthName}</span>
                <span className="font-bold text-papola-blue">{stats.pedidosDelMes}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Afiliados Activos */}
        <div className="bg-white overflow-hidden rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-papola-lilac/20">
                <Store className="h-6 w-6 text-papola-blue" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-bold text-gray-500 truncate">Afiliados Activos</dt>
                <dd className="text-2xl font-bold text-gray-900">{storesCount}</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Usuarios Registrados - Clickeable */}
        <button
          onClick={() => setShowUsersModal(true)}
          className="bg-white overflow-hidden rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md text-left w-full"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-orange-100">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-bold text-gray-500 truncate">Usuarios en la app</dt>
                <dd className="text-2xl font-bold text-gray-900">{profiles.length}</dd>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </div>
          </div>
        </button>
      </div>

      {/* Record de ventas del dia */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-yellow-100">
            <Trophy className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500">Record de ventas del dia</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.recordAmount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">
              {stats.recordDay
                ? new Date(stats.recordDay + 'T12:00:00').toLocaleDateString('es', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })
                : 'Sin datos aun'}
            </p>
          </div>
        </div>
      </div>

      {/* Ventas por Afiliado - Mes actual */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            Ventas por Afiliado — {currentMonthName} {currentYear}
          </h3>
        </div>
        {stats.storeBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Afiliado</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Pedidos</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ventas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.storeBreakdown.map((store, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{store.storeName}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 text-right">{store.count}</td>
                    <td className="px-6 py-3 text-sm font-bold text-papola-green text-right">
                      ${store.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400">Sin ventas este mes</div>
        )}
      </div>

      {/* Modal de Usuarios */}
      {showUsersModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setShowUsersModal(false)}
          />
          <div className="relative mx-auto mt-16 max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 max-h-[80vh] flex flex-col mx-4 sm:mx-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Usuarios Registrados en la app
                </h3>
                <button onClick={() => setShowUsersModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Period tabs */}
              <div className="flex gap-2 mt-4">
                {(['dia', 'mes', 'año'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setUsersPeriod(period)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      usersPeriod === period
                        ? 'bg-papola-blue text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {period === 'dia' ? 'Hoy' : period === 'mes' ? 'Este mes' : 'Este año'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue"
                />
              </div>
            </div>

            {/* Users list */}
            <div className="overflow-y-auto flex-1 p-6">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="h-9 w-9 rounded-full bg-papola-blue-20 flex items-center justify-center flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="text-papola-blue font-bold text-xs">
                          {(user.full_name || user.email)[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(user.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No se encontraron usuarios para este periodo.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 text-xs text-gray-400 flex-shrink-0">
              Mostrando {filteredUsers.length} de {profiles.length} usuarios
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
