import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { MessageCircle, Clock, Loader2, CheckCircle } from 'lucide-react'
import AdminSupportTicketsTable from '@/components/admin/support-tickets-table'

export default async function AdminSupportPage() {
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

  const { data: tickets } = await admin
    .from('support_tickets')
    .select(`
      *,
      profiles!support_tickets_user_id_fkey(full_name, email, role),
      support_messages(message, created_at, sender_id)
    `)
    .order('last_message_at', { ascending: false })

  const allTickets = tickets || []
  const openCount = allTickets.filter(t => t.status === 'open').length
  const inProgressCount = allTickets.filter(t => t.status === 'in_progress').length
  const resolvedCount = allTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Soporte</h2>
        <p className="text-gray-500 mt-2">Gestiona las consultas de usuarios y afiliados.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-papola-blue-20">
              <MessageCircle className="h-5 w-5 text-papola-blue" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{allTickets.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Abiertos</p>
              <p className="text-2xl font-bold text-blue-600">{openCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100">
              <Loader2 className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">En Proceso</p>
              <p className="text-2xl font-bold text-yellow-600">{inProgressCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Resueltos</p>
              <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <AdminSupportTicketsTable tickets={allTickets} />
    </div>
  )
}
