import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import DashboardContent from '@/components/admin/dashboard-content'

export default async function AdminDashboard() {
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

  // Fetch all orders with store name
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, total_amount, created_at, store_id, status, stores(name)')

  // Fetch all profiles (admin client bypasses RLS)
  const { data: allProfiles } = await admin
    .from('profiles')
    .select('id, email, full_name, phone_number, role, created_at, avatar_url')
    .order('created_at', { ascending: false })

  // Stores count (active)
  const { count: storesCount } = await supabase
    .from('stores')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Stores list (active)
  const { data: storesList } = await supabase
    .from('stores')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('name')

  return (
    <DashboardContent
      orders={(allOrders || []).map(o => ({
        ...o,
        stores: o.stores as unknown as { name: string } | undefined
      }))}
      profiles={allProfiles || []}
      storesCount={storesCount || 0}
      storesList={storesList || []}
    />
  )
}
