import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoreSettingsForm from '@/components/store/settings-form'

export default async function SettingsPage() {
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
        <h2 className="text-xl font-semibold text-gray-900">No se encontró tu negocio</h2>
        <p className="mt-2 text-gray-500">Por favor contacta a soporte.</p>
      </div>
    )
  }

  // Fetch pending bank change request
  const { data: pendingBankChange } = await supabase
    .from('bank_account_changes')
    .select('id, status, new_bank_name, new_account_number, new_account_holder_id, new_account_type, created_at')
    .eq('store_id', store.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Mi Negocio</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona la información de tu negocio, logo y horarios.
        </p>
      </div>

      <StoreSettingsForm store={store} pendingBankChange={pendingBankChange} />
    </div>
  )
}
