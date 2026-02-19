'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MessageCircle, User, Store } from 'lucide-react'

interface SupportTicket {
  id: string
  user_id: string
  subject: string
  category: string
  status: string
  created_at: string
  last_message_at: string
  profiles?: { full_name: string; email: string; role: string }
  support_messages?: Array<{ message: string; created_at: string; sender_id: string }>
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierto', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En proceso', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Cerrado', color: 'bg-gray-100 text-gray-500' },
}

const categoryLabels: Record<string, string> = {
  general: 'General',
  orders: 'Pedidos',
  payments: 'Pagos',
  delivery: 'Entregas',
  account: 'Cuenta',
  products: 'Productos',
}

export default function AdminSupportTicketsTable({ tickets }: { tickets: SupportTicket[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const router = useRouter()

  const filtered = tickets.filter((ticket) => {
    const matchesSearch =
      !search ||
      ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
      ticket.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      ticket.profiles?.email?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getLastMessage = (ticket: SupportTicket) => {
    const msgs = ticket.support_messages
    if (!msgs || msgs.length === 0) return ''
    const sorted = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return sorted[0].message
  }

  const isStoreOwner = (ticket: SupportTicket) => {
    return ticket.profiles?.role === 'store_owner'
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por asunto, nombre o email..."
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
          <option value="open">Abiertos</option>
          <option value="in_progress">En proceso</option>
          <option value="resolved">Resueltos</option>
          <option value="closed">Cerrados</option>
        </select>
      </div>

      {/* Tickets list */}
      <div className="space-y-3">
        {filtered.map((ticket) => {
          const status = statusConfig[ticket.status] || statusConfig.open
          const lastMsg = getLastMessage(ticket)
          const isAffiliate = isStoreOwner(ticket)

          return (
            <button
              key={ticket.id}
              onClick={() => router.push(`/admin/support/${ticket.id}`)}
              className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                    {categoryLabels[ticket.category] || ticket.category}
                  </span>
                  {isAffiliate ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600">
                      <Store className="h-2.5 w-2.5" /> Afiliado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">
                      <User className="h-2.5 w-2.5" /> Cliente
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(ticket.last_message_at).toLocaleDateString('es', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <p className="text-sm font-bold text-gray-900 mb-1">{ticket.subject}</p>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs text-gray-500">
                  {ticket.profiles?.full_name || 'Usuario'} &middot; {ticket.profiles?.email || ''}
                </p>
              </div>
              {lastMsg && (
                <p className="text-xs text-gray-400 truncate">{lastMsg}</p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                <MessageCircle className="h-3 w-3" />
                {ticket.support_messages?.length || 0} mensajes
              </div>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Sin consultas</h3>
          <p className="mt-2 text-sm text-gray-500">
            {tickets.length === 0
              ? 'Aún no hay consultas de soporte.'
              : 'No se encontraron consultas con esos criterios.'}
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Mostrando {filtered.length} de {tickets.length} consultas
      </p>
    </div>
  )
}
