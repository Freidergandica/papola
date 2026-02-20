import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoreSidebar from '@/components/store/sidebar'
import StoreNotificationWrapper from './notification-wrapper'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get store for this user
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  // Fetch badge counts in parallel
  const badges: Record<string, number> = {}

  if (store) {
    const [ordersResult, supportResult] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .in('status', ['pending', 'paid', 'accepted', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'out_for_delivery']),
      supabase.from('support_tickets').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['open', 'in_progress']),
    ])

    if (ordersResult.count) badges['/store/orders'] = ordersResult.count
    if (supportResult.count) badges['/store/support'] = supportResult.count
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreSidebar badges={badges} storeId={store?.id} userId={user.id} />
      <StoreNotificationWrapper />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
