import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DealForm from '@/components/store/deal-form'

export default async function AdminNewDealPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  // Admin can create deals for any store
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Oferta</h1>
        <p className="mt-1 text-sm text-gray-500">Crea una oferta para cualquier tienda de la plataforma.</p>
      </div>

      <DealForm
        userId={user.id}
        stores={stores || []}
        redirectPath="/admin/deals"
        autoApprove={true}
      />
    </div>
  )
}
