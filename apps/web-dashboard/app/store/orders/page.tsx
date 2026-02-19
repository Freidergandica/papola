import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoreOrdersList from './orders-list'

export default async function StoreOrdersPage() {
  const supabase = await createClient()

  // Server-side: verify auth + store ownership
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'store_owner' && profile?.role !== 'admin') {
    redirect('/login')
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Primero debes registrar tu negocio.</p>
      </div>
    )
  }

  // Server-side: fetch initial orders (verified by ownership)
  const { data: orders } = await supabase
    .from('orders')
    .select('*, profiles!orders_customer_id_fkey(full_name, phone_number), order_items(*, products(name))')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return <StoreOrdersList initialOrders={orders || []} storeId={store.id} />
}
