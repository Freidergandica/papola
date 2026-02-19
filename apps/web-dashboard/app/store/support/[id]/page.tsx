import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import SupportChat from '@/components/support-chat'

export default async function StoreSupportChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!ticket) redirect('/store/support')

  const { data: messages } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  const statusConfig: Record<string, { label: string; color: string }> = {
    open: { label: 'Abierto', color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'En proceso', color: 'bg-yellow-100 text-yellow-700' },
    resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-700' },
    closed: { label: 'Cerrado', color: 'bg-gray-100 text-gray-500' },
  }

  const status = statusConfig[ticket.status] || statusConfig.open
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-1 pb-4 border-b border-gray-200">
        <Link
          href="/store/support"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{ticket.subject}</h1>
          <p className="text-xs text-gray-400">
            {new Date(ticket.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
          {status.label}
        </span>
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
