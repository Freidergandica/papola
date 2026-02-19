'use client'

import { useState, useMemo, useCallback } from 'react'
import { DollarSign, ShoppingBag, Store, Users, Trophy, ChevronDown, X, Search, Calendar, Download, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Order {
  id: string
  total_amount: number
  created_at: string
  store_id: string
  customer_id?: string
  status: string
  amount_in_ves?: number | null
  exchange_rate?: number | null
  payment_currency?: string | null
  stores?: { name: string }
  customer?: { full_name: string | null; email: string }
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
  category?: string | null
  created_at?: string
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_holder_id?: string | null
  bank_account_type?: string | null
}

interface DashboardContentProps {
  orders: Order[]
  profiles: Profile[]
  storesCount: number
  storesList: StoreInfo[]
}

const PRESETS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'año', label: 'Este año' },
  { key: 'todo', label: 'Todo' },
] as const

function getPresetRange(preset: string) {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  switch (preset) {
    case 'hoy':
      return { from: todayStr, to: todayStr }
    case 'semana': {
      const day = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      return { from: monday.toISOString().slice(0, 10), to: todayStr }
    }
    case 'mes':
      return {
        from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        to: todayStr,
      }
    case 'año':
      return { from: `${now.getFullYear()}-01-01`, to: todayStr }
    case 'todo':
    default:
      return { from: '', to: '' }
  }
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const BOM = '\uFEFF'
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }
  const csv = BOM + [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
  preparing: { label: 'Preparando', color: 'bg-purple-100 text-purple-700' },
  ready: { label: 'Listo', color: 'bg-green-100 text-green-700' },
  delivered: { label: 'Entregado', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
}

type ExpandedCard = 'ventas' | 'pedidos' | 'afiliados' | 'usuarios' | null

export default function DashboardContent({ orders, profiles, storesCount, storesList }: DashboardContentProps) {
  const [activePreset, setActivePreset] = useState('mes')
  const [dateFrom, setDateFrom] = useState(() => getPresetRange('mes').from)
  const [dateTo, setDateTo] = useState(() => getPresetRange('mes').to)
  const [expandedCard, setExpandedCard] = useState<ExpandedCard>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [usersSearch, setUsersSearch] = useState('')

  const applyPreset = (preset: string) => {
    setActivePreset(preset)
    const range = getPresetRange(preset)
    setDateFrom(range.from)
    setDateTo(range.to)
  }

  // Filtered data based on global date range
  const filteredOrders = useMemo(() => {
    if (!dateFrom && !dateTo) return orders
    return orders.filter(o => {
      const d = o.created_at.slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
      return true
    })
  }, [orders, dateFrom, dateTo])

  const filteredProfiles = useMemo(() => {
    if (!dateFrom && !dateTo) return profiles
    return profiles.filter(p => {
      const d = p.created_at.slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
      return true
    })
  }, [profiles, dateFrom, dateTo])

  // Stats computed from filtered data
  const stats = useMemo(() => {
    const totalSales = filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
    const totalOrders = filteredOrders.length
    const totalUsers = filteredProfiles.length

    // Sales by store
    const salesByStore: Record<string, { storeName: string; total: number; count: number }> = {}
    filteredOrders.forEach(o => {
      if (!salesByStore[o.store_id]) {
        salesByStore[o.store_id] = { storeName: o.stores?.name || 'Desconocido', total: 0, count: 0 }
      }
      salesByStore[o.store_id].total += Number(o.total_amount) || 0
      salesByStore[o.store_id].count += 1
    })
    const storeBreakdown = Object.values(salesByStore).sort((a, b) => b.total - a.total)

    // Orders by day
    const ordersByDay: Record<string, { count: number; total: number }> = {}
    filteredOrders.forEach(o => {
      const dayKey = o.created_at.slice(0, 10)
      if (!ordersByDay[dayKey]) ordersByDay[dayKey] = { count: 0, total: 0 }
      ordersByDay[dayKey].count += 1
      ordersByDay[dayKey].total += Number(o.total_amount) || 0
    })
    const dailyBreakdown = Object.entries(ordersByDay)
      .map(([day, data]) => ({ day, ...data }))
      .sort((a, b) => b.day.localeCompare(a.day))

    // Record de ventas (siempre sobre TODOS los orders)
    const allSalesByDay: Record<string, number> = {}
    orders.forEach(o => {
      const dayKey = o.created_at.slice(0, 10)
      allSalesByDay[dayKey] = (allSalesByDay[dayKey] || 0) + (Number(o.total_amount) || 0)
    })
    let recordDay = ''
    let recordAmount = 0
    Object.entries(allSalesByDay).forEach(([day, amount]) => {
      if (amount > recordAmount) {
        recordAmount = amount
        recordDay = day
      }
    })

    return {
      totalSales, totalOrders, totalUsers,
      storeBreakdown, dailyBreakdown,
      recordDay, recordAmount,
    }
  }, [filteredOrders, filteredProfiles, orders])

  // Orders for expanded day
  const dayOrders = useMemo(() => {
    if (!expandedDay) return []
    return filteredOrders
      .filter(o => o.created_at.slice(0, 10) === expandedDay)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [filteredOrders, expandedDay])

  // Users search
  const searchedUsers = useMemo(() => {
    if (!usersSearch) return filteredProfiles
    const q = usersSearch.toLowerCase()
    return filteredProfiles.filter(p =>
      p.full_name?.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    )
  }, [filteredProfiles, usersSearch])

  const toggleCard = (card: ExpandedCard) => {
    setExpandedCard(prev => prev === card ? null : card)
    if (card === 'usuarios') setUsersSearch('')
    setExpandedDay(null)
  }

  // Range label
  const rangeLabel = useMemo(() => {
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    const now = new Date()
    if (activePreset === 'todo') return 'Todo el historial'
    if (activePreset === 'hoy') return 'Hoy'
    if (activePreset === 'semana') return 'Esta semana'
    if (activePreset === 'mes') return monthNames[now.getMonth()].charAt(0).toUpperCase() + monthNames[now.getMonth()].slice(1) + ' ' + now.getFullYear()
    if (activePreset === 'año') return 'Año ' + now.getFullYear()
    if (dateFrom && dateTo) return `${dateFrom} — ${dateTo}`
    return ''
  }, [activePreset, dateFrom, dateTo])

  // Excel downloads
  const downloadVentas = useCallback(() => {
    const headers = ['Afiliado', 'Pedidos', 'Ventas ($)']
    const rows = stats.storeBreakdown.map(s => [s.storeName, String(s.count), s.total.toFixed(2)])
    rows.push(['TOTAL', String(stats.totalOrders), stats.totalSales.toFixed(2)])
    downloadCSV(`ventas_${rangeLabel.replace(/\s/g, '_')}.csv`, headers, rows)
  }, [stats, rangeLabel])

  const downloadPedidos = useCallback(() => {
    const headers = ['Fecha', 'Pedidos', 'Monto ($)']
    const rows = stats.dailyBreakdown.map(d => [
      new Date(d.day + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      String(d.count),
      d.total.toFixed(2),
    ])
    rows.push(['TOTAL', String(stats.totalOrders), stats.totalSales.toFixed(2)])
    downloadCSV(`pedidos_${rangeLabel.replace(/\s/g, '_')}.csv`, headers, rows)
  }, [stats, rangeLabel])

  const downloadAfiliados = useCallback(() => {
    const headers = ['Nombre', 'Categoría', 'Estado', 'Fecha de registro']
    const rows = storesList.map(s => [
      s.name,
      s.category || 'Sin categoría',
      s.is_active ? 'Activo' : 'Inactivo',
      s.created_at ? new Date(s.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    ])
    downloadCSV('afiliados.csv', headers, rows)
  }, [storesList])

  const downloadUsuarios = useCallback(() => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Rol', 'Fecha de registro']
    const rows = searchedUsers.map(u => [
      u.full_name || 'Sin nombre',
      u.email,
      u.phone_number || '',
      u.role,
      new Date(u.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }),
    ])
    downloadCSV(`usuarios_${rangeLabel.replace(/\s/g, '_')}.csv`, headers, rows)
  }, [searchedUsers, rangeLabel])

  // Dispersable R4 — cohort 16:30 to 16:30 with date picker
  const getDefaultDispersableDate = () => {
    const now = new Date()
    const today1630 = new Date(now)
    today1630.setHours(16, 30, 0, 0)
    // If past 16:30, the last completed cohort ends today; otherwise yesterday
    const endDate = now >= today1630 ? now : new Date(now.getTime() - 86400000)
    return endDate.toISOString().slice(0, 10)
  }

  const [dispersableDate, setDispersableDate] = useState(getDefaultDispersableDate)

  // Cohort for selected date: (date-1) 16:30 → (date) 16:30
  const dispersableCohort = useMemo(() => {
    const [y, m, d] = dispersableDate.split('-').map(Number)
    const cohortEnd = new Date(y, m - 1, d, 16, 30, 0, 0)
    const cohortStart = new Date(y, m - 1, d - 1, 16, 30, 0, 0)
    return { cohortStart, cohortEnd }
  }, [dispersableDate])

  const DISPERSABLE_STATUSES = ['delivered', 'completed', 'paid', 'accepted']

  const dispersablePreview = useMemo(() => {
    const { cohortStart, cohortEnd } = dispersableCohort
    const cohortOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      return d >= cohortStart && d < cohortEnd && DISPERSABLE_STATUSES.includes(o.status)
    })
    // Count unique stores with bank data
    const storeIds = new Set(cohortOrders.map(o => o.store_id))
    const storesWithBank = [...storeIds].filter(sid => {
      const s = storesList.find(st => st.id === sid)
      return s?.bank_account_number
    })
    let totalVes = 0
    cohortOrders.forEach(o => {
      if (o.amount_in_ves) totalVes += Number(o.amount_in_ves)
      else if (o.exchange_rate && o.payment_currency !== 'VES') totalVes += Number(o.total_amount) * Number(o.exchange_rate)
      else totalVes += Number(o.total_amount)
    })
    return { orderCount: cohortOrders.length, storeCount: storesWithBank.length, totalVes }
  }, [orders, storesList, dispersableCohort])

  const downloadDispersable = useCallback(() => {
    const { cohortStart, cohortEnd } = dispersableCohort

    const cohortOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      return d >= cohortStart && d < cohortEnd && DISPERSABLE_STATUSES.includes(o.status)
    })

    const byStore: Record<string, { total_ves: number }> = {}
    cohortOrders.forEach(o => {
      if (!byStore[o.store_id]) byStore[o.store_id] = { total_ves: 0 }
      let amountVes = 0
      if (o.amount_in_ves) {
        amountVes = Number(o.amount_in_ves)
      } else if (o.exchange_rate && o.payment_currency !== 'VES') {
        amountVes = Number(o.total_amount) * Number(o.exchange_rate)
      } else {
        amountVes = Number(o.total_amount)
      }
      byStore[o.store_id].total_ves += amountVes
    })

    const headers = ['R.I.F.', 'CLIENTE BENEFICIARIO', 'CUENTA BANCARIA', 'TOTAL BS']
    const rows: string[][] = []

    Object.entries(byStore).forEach(([storeId, data]) => {
      const store = storesList.find(s => s.id === storeId)
      if (!store || !store.bank_account_number) return

      const rif = (store.bank_account_holder_id || '').replace(/-/g, '')
      const nombre = store.name
      const cuenta = store.bank_account_number
      const totalBs = data.total_ves.toFixed(2).replace('.', ',')

      rows.push([rif, nombre, cuenta, totalBs])
    })

    if (rows.length === 0) {
      alert('No hay ventas completadas en la ventana de corte (16:30 a 16:30) o los afiliados no tienen datos bancarios registrados.')
      return
    }

    const dateLabel = dispersableDate.replace(/-/g, '')
    downloadCSV(`dispersable_${dateLabel}.csv`, headers, rows)
  }, [orders, storesList, dispersableCohort, dispersableDate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Panel General</h1>
        <span className="text-sm text-gray-500 hidden sm:block">{rangeLabel}</span>
      </div>

      {/* Global Date Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Calendar className="h-5 w-5 text-gray-400 hidden sm:block" />
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                activePreset === p.key
                  ? 'bg-papola-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setActivePreset('custom') }}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue bg-white text-gray-900"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setActivePreset('custom') }}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue bg-white text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Dispersable R4 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Dispersable R4</p>
              <p className="text-xs text-gray-500">
                Corte: {dispersableCohort.cohortStart.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })}{' '}
                16:30 → {dispersableCohort.cohortEnd.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })}{' '}
                16:30
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dispersableDate}
              onChange={(e) => setDispersableDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-gray-900"
            />
            <button
              onClick={downloadDispersable}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
              Descargar
            </button>
          </div>
        </div>
        {/* Preview stats */}
        <div className="flex items-center gap-6 pl-14 text-xs text-gray-500">
          <span>{dispersablePreview.orderCount} pedido{dispersablePreview.orderCount !== 1 ? 's' : ''}</span>
          <span>{dispersablePreview.storeCount} afiliado{dispersablePreview.storeCount !== 1 ? 's' : ''}</span>
          <span className="font-medium text-gray-700">Bs. {dispersablePreview.totalVes.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ventas */}
        <button
          onClick={() => toggleCard('ventas')}
          className={cn(
            'bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md text-left w-full',
            expandedCard === 'ventas' ? 'border-papola-green ring-2 ring-papola-green/20' : 'border-gray-100'
          )}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-papola-green-20">
                <DollarSign className="h-6 w-6 text-papola-green" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Ventas</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalSales.toFixed(2)}</p>
              </div>
              <ChevronDown className={cn(
                'h-5 w-5 text-gray-300 transition-transform flex-shrink-0',
                expandedCard === 'ventas' && 'rotate-180 text-papola-green'
              )} />
            </div>
          </div>
        </button>

        {/* Pedidos */}
        <button
          onClick={() => toggleCard('pedidos')}
          className={cn(
            'bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md text-left w-full',
            expandedCard === 'pedidos' ? 'border-papola-blue ring-2 ring-papola-blue/20' : 'border-gray-100'
          )}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-papola-blue-20">
                <ShoppingBag className="h-6 w-6 text-papola-blue" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <ChevronDown className={cn(
                'h-5 w-5 text-gray-300 transition-transform flex-shrink-0',
                expandedCard === 'pedidos' && 'rotate-180 text-papola-blue'
              )} />
            </div>
          </div>
        </button>

        {/* Afiliados Activos */}
        <button
          onClick={() => toggleCard('afiliados')}
          className={cn(
            'bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md text-left w-full',
            expandedCard === 'afiliados' ? 'border-papola-blue ring-2 ring-papola-blue/20' : 'border-gray-100'
          )}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-papola-lilac/20">
                <Store className="h-6 w-6 text-papola-blue" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Afiliados Activos</p>
                <p className="text-2xl font-bold text-gray-900">{storesCount}</p>
                {storesList.length !== storesCount && (
                  <p className="text-xs text-gray-400">{storesList.length} en total</p>
                )}
              </div>
              <ChevronDown className={cn(
                'h-5 w-5 text-gray-300 transition-transform flex-shrink-0',
                expandedCard === 'afiliados' && 'rotate-180 text-papola-blue'
              )} />
            </div>
          </div>
        </button>

        {/* Usuarios */}
        <button
          onClick={() => toggleCard('usuarios')}
          className={cn(
            'bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md text-left w-full',
            expandedCard === 'usuarios' ? 'border-orange-400 ring-2 ring-orange-400/20' : 'border-gray-100'
          )}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-orange-100">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                {activePreset !== 'todo' && (
                  <p className="text-xs text-gray-400">{profiles.length} en total</p>
                )}
              </div>
              <ChevronDown className={cn(
                'h-5 w-5 text-gray-300 transition-transform flex-shrink-0',
                expandedCard === 'usuarios' && 'rotate-180 text-orange-500'
              )} />
            </div>
          </div>
        </button>
      </div>

      {/* Expanded Detail Panel */}
      {expandedCard && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Ventas Detail */}
          {expandedCard === 'ventas' && (
            <>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Ventas por Afiliado</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadVentas}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-papola-green bg-papola-green-20 rounded-lg hover:bg-papola-green/20 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Excel
                  </button>
                  <button onClick={() => setExpandedCard(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
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
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{stats.totalOrders}</td>
                        <td className="px-6 py-3 text-sm font-bold text-papola-green text-right">
                          ${stats.totalSales.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">Sin ventas en este periodo</div>
              )}
            </>
          )}

          {/* Pedidos Detail */}
          {expandedCard === 'pedidos' && (
            <>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Pedidos por Día</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadPedidos}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-papola-blue bg-papola-blue-20 rounded-lg hover:bg-papola-blue/20 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Excel
                  </button>
                  <button onClick={() => setExpandedCard(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {stats.dailyBreakdown.length > 0 ? (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Pedidos</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.dailyBreakdown.map((row) => (
                        <>
                          <tr
                            key={row.day}
                            onClick={() => setExpandedDay(prev => prev === row.day ? null : row.day)}
                            className={cn(
                              'cursor-pointer transition-colors',
                              expandedDay === row.day ? 'bg-papola-blue-20' : 'hover:bg-gray-50'
                            )}
                          >
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                <ChevronDown className={cn(
                                  'h-4 w-4 text-gray-400 transition-transform flex-shrink-0',
                                  expandedDay === row.day && 'rotate-180 text-papola-blue'
                                )} />
                                {new Date(row.day + 'T12:00:00').toLocaleDateString('es', {
                                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-500 text-right">{row.count}</td>
                            <td className="px-6 py-3 text-sm font-bold text-papola-blue text-right">
                              ${row.total.toFixed(2)}
                            </td>
                          </tr>
                          {expandedDay === row.day && (
                            <tr key={row.day + '-detail'}>
                              <td colSpan={3} className="p-0">
                                <div className="bg-gray-50 border-y border-gray-100">
                                  <table className="min-w-full">
                                    <thead>
                                      <tr>
                                        <th className="px-8 py-2 text-left text-xs font-medium text-gray-400">Usuario</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Afiliado</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Hora</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-400">Estado</th>
                                        <th className="px-6 py-2 text-right text-xs font-medium text-gray-400">Monto</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {dayOrders.map(order => {
                                        const st = STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' }
                                        return (
                                          <tr key={order.id} className="hover:bg-white/60">
                                            <td className="px-8 py-2.5 text-sm text-gray-700">
                                              {order.customer?.full_name || order.customer?.email || 'Desconocido'}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-gray-500">
                                              {order.stores?.name || 'Desconocido'}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-gray-500">
                                              {new Date(order.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', st.color)}>
                                                {st.label}
                                              </span>
                                            </td>
                                            <td className="px-6 py-2.5 text-sm font-medium text-gray-900 text-right">
                                              ${(Number(order.total_amount) || 0).toFixed(2)}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 sticky bottom-0 z-10">
                      <tr>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{stats.totalOrders}</td>
                        <td className="px-6 py-3 text-sm font-bold text-papola-blue text-right">
                          ${stats.totalSales.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">Sin pedidos en este periodo</div>
              )}
            </>
          )}

          {/* Afiliados Detail */}
          {expandedCard === 'afiliados' && (
            <>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Afiliados ({storesList.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadAfiliados}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-papola-blue bg-papola-blue-20 rounded-lg hover:bg-papola-blue/20 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Excel
                  </button>
                  <button onClick={() => setExpandedCard(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {storesList.length > 0 ? (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nombre</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Categoría</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Registro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {storesList.map((store) => (
                        <tr key={store.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">{store.name}</td>
                          <td className="px-6 py-3 text-sm text-gray-500">{store.category || '—'}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
                              store.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            )}>
                              <span className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                store.is_active ? 'bg-green-500' : 'bg-red-500'
                              )} />
                              {store.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-400 text-right">
                            {store.created_at
                              ? new Date(store.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">No hay afiliados registrados</div>
              )}
            </>
          )}

          {/* Usuarios Detail */}
          {expandedCard === 'usuarios' && (
            <>
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">
                    Usuarios Registrados ({stats.totalUsers})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadUsuarios}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Excel
                    </button>
                    <button onClick={() => setExpandedCard(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 bg-white text-gray-900"
                  />
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-6">
                {searchedUsers.length > 0 ? (
                  searchedUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <span className="text-orange-600 font-bold text-xs">
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
                        {new Date(user.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No se encontraron usuarios en este periodo.
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100 text-xs text-gray-400">
                Mostrando {searchedUsers.length} de {profiles.length} usuarios totales
              </div>
            </>
          )}
        </div>
      )}

      {/* Record de ventas del día */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-yellow-100">
            <Trophy className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500">Récord de ventas en un día</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.recordAmount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">
              {stats.recordDay
                ? new Date(stats.recordDay + 'T12:00:00').toLocaleDateString('es', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })
                : 'Sin datos aún'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
