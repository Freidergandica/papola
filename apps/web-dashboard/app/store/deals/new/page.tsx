import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DealForm from '@/components/store/deal-form'

export default async function StoreNewDealPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!store) redirect('/store/dashboard')

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Oferta</h1>
        <p className="mt-1 text-sm text-gray-500">Crea una nueva oferta para {store.name}.</p>
      </div>

      <DealForm
        userId={user.id}
        stores={[store]}
        storeId={store.id}
        redirectPath="/store/deals"
      />
    </div>
  )
}
