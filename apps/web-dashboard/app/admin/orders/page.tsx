import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminOrdersTable from '@/components/admin/orders-table'
import { DollarSign, ShoppingBag, Clock, CheckCircle } from 'lucide-react'

export default async function AdminOrdersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'sales_manager') redirect('/login')

  // Use admin client to bypass RLS and see all customer profiles
  const admin = createAdminClient()

  // Fetch all orders with store and customer info
  const { data: orders } = await admin
    .from('orders')
    .select(`
      *,
      profiles!orders_customer_id_fkey(full_name, email, phone_number),
      stores!orders_store_id_fkey(name),
      order_items(quantity, unit_price, products(name))
    `)
    .order('created_at', { ascending: false })

  // Fetch all stores for filter dropdown
  const { data: stores } = await admin
    .from('stores')
    .select('id, name')
    .order('name')

  // Calculate stats
  const totalOrders = orders?.length || 0
  const totalRevenue = orders?.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0) || 0
  const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'accepted' || o.status === 'preparing').length || 0
  const completedOrders = orders?.filter(o => o.status === 'completed' || o.status === 'delivered').length || 0

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Pedidos Globales</h2>
        <p className="text-gray-500 mt-2">Vista general de todos los pedidos de la plataforma.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-papola-blue-20">
              <ShoppingBag className="h-5 w-5 text-papola-blue" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Pedidos</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-papola-green-20">
              <DollarSign className="h-5 w-5 text-papola-green" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">En Proceso</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Completados</p>
              <p className="text-2xl font-bold text-green-600">{completedOrders}</p>
            </div>
          </div>
        </div>
      </div>

      <AdminOrdersTable
        orders={orders || []}
        stores={stores || []}
      />
    </div>
  )
}
