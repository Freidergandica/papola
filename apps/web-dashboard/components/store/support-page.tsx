'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, MessageCircle, Plus, Send } from 'lucide-react'

interface SupportTicket {
  id: string
  subject: string
  category: string
  status: string
  created_at: string
  last_message_at: string
  support_messages?: Array<{ message: string; created_at: string; sender_id: string }>
}

const FAQ_ITEMS = [
  {
    question: '¿Cómo agrego productos?',
    answer: 'Ve a la sección "Productos" en el menú lateral y haz clic en "Agregar Producto". Completa el nombre, descripción, precio, e imagen del producto.',
  },
  {
    question: '¿Cómo gestiono mis pedidos?',
    answer: 'En la sección "Pedidos" verás todos los pedidos en tiempo real. Puedes avanzar el estado de cada pedido (Aceptar → Preparando → Listo → En camino → Entregado).',
  },
  {
    question: '¿Cuándo recibo mis pagos?',
    answer: 'Los pagos se procesan diariamente a través del sistema de dispersión. El cierre se realiza a las 16:30 y los montos se transfieren a la cuenta bancaria registrada.',
  },
  {
    question: '¿Cómo cambio mis datos bancarios?',
    answer: 'Ve a "Mi Negocio" y solicita un cambio de cuenta bancaria. Un administrador revisará y aprobará el cambio por seguridad.',
  },
  {
    question: '¿Por qué mi tienda está inactiva?',
    answer: 'Las tiendas nuevas requieren aprobación del administrador. Si tu tienda fue desactivada, contacta al soporte para más información.',
  },
]

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'products', label: 'Productos' },
  { value: 'orders', label: 'Pedidos' },
  { value: 'payments', label: 'Pagos' },
  { value: 'account', label: 'Mi Cuenta' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierto', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En proceso', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Cerrado', color: 'bg-gray-100 text-gray-500' },
}

export default function StoreSupportPage({
  initialTickets,
  userId,
}: {
  initialTickets: SupportTicket[]
  userId: string
}) {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const createTicket = async () => {
    if (!subject.trim() || !message.trim()) return
    setCreating(true)

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        subject: subject.trim(),
        category,
      })
      .select()
      .single()

    if (ticketError || !ticket) {
      console.error('Error creating ticket:', ticketError)
      setCreating(false)
      return
    }

    await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      sender_id: userId,
      message: message.trim(),
    })

    setShowForm(false)
    setSubject('')
    setCategory('general')
    setMessage('')
    setCreating(false)
    router.push(`/store/support/${ticket.id}`)
  }

  const getLastMessage = (ticket: SupportTicket) => {
    const msgs = ticket.support_messages
    if (!msgs || msgs.length === 0) return ''
    const sorted = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return sorted[0].message
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ayuda y Soporte</h1>
          <p className="mt-1 text-sm text-gray-500">Consulta las preguntas frecuentes o contacta al equipo de soporte.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-papola-blue text-white rounded-xl text-sm font-medium hover:bg-papola-blue-80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Consulta
        </button>
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Nueva Consulta</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue"
                placeholder="¿En qué podemos ayudarte?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                      category === cat.value
                        ? 'bg-papola-blue-20 border-papola-blue text-papola-blue'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue resize-none"
                placeholder="Describe tu consulta..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={createTicket}
                disabled={!subject.trim() || !message.trim() || creating}
                className="flex items-center gap-2 px-5 py-2.5 bg-papola-blue text-white rounded-xl text-sm font-medium hover:bg-papola-blue-80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {creating ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Preguntas Frecuentes</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {FAQ_ITEMS.map((item, index) => (
            <button
              key={index}
              className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{item.question}</span>
                {expandedFaq === index
                  ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                }
              </div>
              {expandedFaq === index && (
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.answer}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Mis Consultas</h2>
        {tickets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No tienes consultas aún.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const status = statusConfig[ticket.status] || statusConfig.open
              const lastMsg = getLastMessage(ticket)
              return (
                <button
                  key={ticket.id}
                  onClick={() => router.push(`/store/support/${ticket.id}`)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(ticket.last_message_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 truncate">{ticket.subject}</p>
                  {lastMsg && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{lastMsg}</p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
