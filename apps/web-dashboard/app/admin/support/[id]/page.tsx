import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Store } from 'lucide-react'
import SupportChat from '@/components/support-chat'
import AdminTicketStatus from './ticket-status'

export default async function AdminSupportChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  const admin = createAdminClient()

  const { data: ticket } = await admin
    .from('support_tickets')
    .select('*, profiles!support_tickets_user_id_fkey(full_name, email, phone_number, role)')
    .eq('id', id)
    .single()

  if (!ticket) redirect('/admin/support')

  const { data: messages } = await admin
    .from('support_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  const categoryLabels: Record<string, string> = {
    general: 'General',
    orders: 'Pedidos',
    payments: 'Pagos',
    delivery: 'Entregas',
    account: 'Cuenta',
    products: 'Productos',
  }

  const isAffiliate = ticket.profiles?.role === 'store_owner'
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-start gap-3 px-1 pb-4 border-b border-gray-200">
        <Link
          href="/admin/support"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors mt-0.5"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{ticket.subject}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">
              {ticket.profiles?.full_name || 'Usuario'} &middot; {ticket.profiles?.email || ''}
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
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {categoryLabels[ticket.category] || ticket.category}
            </span>
          </div>
        </div>
        <AdminTicketStatus ticketId={id} currentStatus={ticket.status} />
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0">
        <SupportChat
          ticketId={id}
          currentUserId={user.id}
          initialMessages={messages || []}
          isClosed={isClosed}
        />
      </div>
    </div>
  )
}
