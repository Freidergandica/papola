import { createClient } from '@/lib/supabase/server'
import { DollarSign, ShoppingBag, Users, TrendingUp } from 'lucide-react'

// Helper component for KPI Cards
function KpiCard({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
      <div className={`p-4 rounded-xl ${color} mr-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch real data for KPIs
  // 1. Total Stores
  const { count: storeCount } = await supabase.from('stores').select('*', { count: 'exact', head: true })

  // 2. Total Users (Profiles)
  const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

  // 3. Total Orders (Mock for now since we don't have orders yet)
  // const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })
  const orderCount = 0

  // 4. Total Sales (Mock)
  const totalSales = 0

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Resumen Ejecutivo</h2>
        <p className="text-gray-500 mt-2">Bienvenido al panel de control de Papola.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Ventas Totales" 
          value={`$${totalSales.toLocaleString()}`} 
          icon={DollarSign} 
          color="bg-green-500" 
        />
        <KpiCard 
          title="Pedidos Totales" 
          value={orderCount.toString()} 
          icon={ShoppingBag} 
          color="bg-papola-blue" 
        />
        <KpiCard 
          title="Usuarios Activos" 
          value={userCount?.toString() || '0'} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <KpiCard 
          title="Afiliados" 
          value={storeCount?.toString() || '0'} 
          icon={TrendingUp} 
          color="bg-orange-500" 
        />
      </div>

      {/* Charts & Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Stores Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Top Afiliados</h3>
            <button className="text-sm text-papola-blue font-medium hover:text-papola-blue-80">Ver todos</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 text-sm font-semibold text-gray-500">Afiliado</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Calificacion</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500">Estado</th>
                  <th className="pb-3 text-sm font-semibold text-gray-500 text-right">Ventas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* We will fetch real top stores later */}
                <tr>
                  <td className="py-4 text-sm font-medium text-gray-900">Burger King</td>
                  <td className="py-4 text-sm text-gray-500">4.8 ⭐</td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Activo
                    </span>
                  </td>
                  <td className="py-4 text-sm font-bold text-gray-900 text-right">$1,200</td>
                </tr>
                <tr>
                  <td className="py-4 text-sm font-medium text-gray-900">Pizza Hut</td>
                  <td className="py-4 text-sm text-gray-500">4.5 ⭐</td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Activo
                    </span>
                  </td>
                  <td className="py-4 text-sm font-bold text-gray-900 text-right">$950</td>
                </tr>
                 <tr>
                  <td className="py-4 text-sm font-medium text-gray-900">McDonalds</td>
                  <td className="py-4 text-sm text-gray-500">4.2 ⭐</td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Cerrado
                    </span>
                  </td>
                  <td className="py-4 text-sm font-bold text-gray-900 text-right">$800</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity / Estimated Sales Chart Placeholder */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-gray-900 mb-6">Ventas Estimadas</h3>
           <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-sm">Gráfico de ventas aquí</p>
           </div>
           <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-sm text-gray-500">Hoy</span>
                 <span className="text-sm font-bold text-green-600">+12%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                 <div className="bg-green-500 h-2 rounded-full" style={{ width: '70%' }}></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
