import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, ShoppingBag, Users, Store } from 'lucide-react'

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

  // KPIs Queries
  // 1. Total Ventas (Sum of total_amount from orders)
  const { data: ordersData } = await supabase
    .from('orders')
    .select('total_amount')
  
  const totalSales = ordersData?.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0) || 0

  // 2. Usuarios Registrados
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // 3. Tiendas Activas
  const { count: storesCount } = await supabase
    .from('stores')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // 4. Pedidos Totales
  const { count: ordersCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Panel General</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ventas Totales */}
        <div className="bg-white overflow-hidden rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-papola-green-20">
                <DollarSign className="h-6 w-6 text-papola-green" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-500 truncate">Ventas Totales</dt>
                  <dd>
                    <div className="text-2xl font-bold text-gray-900">
                      ${totalSales.toFixed(2)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Pedidos */}
        <div className="bg-white overflow-hidden rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-papola-blue-20">
                <ShoppingBag className="h-6 w-6 text-papola-blue" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-500 truncate">Pedidos Totales</dt>
                  <dd>
                    <div className="text-2xl font-bold text-gray-900">
                      {ordersCount || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Tiendas Activas */}
        <div className="bg-white overflow-hidden rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-xl bg-papola-lilac/20">
                <Store className="h-6 w-6 text-papola-blue" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-bold text-gray-500 truncate">Comercios Activos</dt>
                  <dd>
                    <div className="text-2xl font-bold text-gray-900">
                      {storesCount || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Usuarios */}
        <div className="bg-white overflow-hidden rounded-lg shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Usuarios Registrados</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {usersCount || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for Top Stores Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Top Tiendas (Próximamente)</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
          <span className="text-gray-500">Gráfico de Ventas por Tienda</span>
        </div>
      </div>
    </div>
  )
}
