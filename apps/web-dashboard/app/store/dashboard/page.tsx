import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Package, ShoppingBag, Store, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function StoreDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Bienvenido a Papola</h2>
        <p className="mt-2 text-gray-500">Tu cuenta ha sido creada. Un administrador debe aprobar tu tienda antes de comenzar.</p>
      </div>
    )
  }

  // Fetch counts
  const { count: productsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', store.id)

  // Mock orders count for now as we don't have orders fully linked yet
  const ordersCount = 0 

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Hola, {store.name}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${store.is_active ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {store.is_active ? 'Tienda Activa' : 'En Revisión / Inactiva'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Productos */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Productos</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{productsCount || 0}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/store/products" className="font-medium text-papola-blue hover:text-papola-blue-80">
                Ver todos
              </Link>
            </div>
          </div>
        </div>

        {/* Pedidos */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBag className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pedidos Activos</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{ordersCount}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/store/orders" className="font-medium text-papola-blue hover:text-papola-blue-80">
                Ver pedidos
              </Link>
            </div>
          </div>
        </div>

        {/* Configuración */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Store className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Configuración</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">Perfil de Tienda</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/store/settings" className="font-medium text-papola-blue hover:text-papola-blue-80">
                Editar detalles
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
