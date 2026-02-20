
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/admin/sidebar'
import Header from '@/components/admin/header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  if (role !== 'admin' && role !== 'sales_manager') redirect('/login')

  // Fetch notification counts
  const admin = createAdminClient()
  const [ordersResult, supportResult, bankResult] = await Promise.all([
    admin.from('orders').select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'accepted', 'preparing', 'ready', 'delivering']),
    admin.from('support_tickets').select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']),
    admin.from('bank_account_changes').select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const badges: Record<string, number> = {}
  if (ordersResult.count) badges['/admin/orders'] = ordersResult.count
  if (supportResult.count) badges['/admin/support'] = supportResult.count
  if (bankResult.count) badges['/admin/bank-changes'] = bankResult.count

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar role={role} badges={badges} />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
