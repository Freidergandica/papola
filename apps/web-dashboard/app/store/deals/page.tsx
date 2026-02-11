import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Tag } from 'lucide-react'

export default async function StoreDealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Primero debes crear una tienda.</p>
        <Link href="/store/dashboard" className="text-papola-blue hover:text-papola-blue-80 mt-2 inline-block">
          Ir al panel
        </Link>
      </div>
    )
  }

  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  const formatDiscount = (deal: { discount_type: string; discount_value?: number; coupon_code?: string }) => {
    switch (deal.discount_type) {
      case 'percentage': return `${deal.discount_value}%`
      case 'fixed_amount': return `$${deal.discount_value}`
      case 'buy_x_get_y': return 'Promo'
      case 'coupon': return deal.coupon_code || `$${deal.discount_value}`
      default: return '-'
    }
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Ofertas</h1>
          <p className="mt-1 text-sm text-gray-500">Gestiona las ofertas y descuentos de tu tienda.</p>
        </div>
        <Link
          href="/store/deals/new"
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-papola-blue text-white rounded-lg hover:bg-papola-blue-80 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Oferta
        </Link>
      </div>

      {!deals?.length ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Tag className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Sin ofertas</h3>
          <p className="mt-2 text-sm text-gray-500">Crea tu primera oferta para atraer más clientes.</p>
          <Link
            href="/store/deals/new"
            className="mt-4 inline-flex items-center text-papola-blue hover:text-papola-blue-80 font-medium text-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Crear oferta
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {deals.map((deal) => (
            <div key={deal.id} className="bg-white shadow rounded-lg p-5 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-gray-900">{deal.title}</h3>
                  <span className="text-sm font-bold text-papola-blue bg-papola-blue-20 px-2 py-0.5 rounded">
                    {formatDiscount(deal)}
                  </span>
                  {deal.is_flash_deal && (
                    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                      Flash
                    </span>
                  )}
                </div>
                {deal.description && (
                  <p className="text-sm text-gray-500 mt-1">{deal.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>Canjes: {deal.current_redemptions}/{deal.max_redemptions || '∞'}</span>
                  {deal.ends_at && (
                    <span>Expira: {new Date(deal.ends_at).toLocaleDateString('es')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {!deal.is_approved ? (
                  <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Pendiente</span>
                ) : deal.is_active ? (
                  <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">Activa</span>
                ) : (
                  <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Inactiva</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
