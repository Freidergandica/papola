import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import BankChangesTable from '@/components/admin/bank-changes-table'

export default async function BankChangesPage() {
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

  const { data: changes } = await admin
    .from('bank_account_changes')
    .select('*, stores(name)')
    .order('created_at', { ascending: false })

  const pendingCount = (changes || []).filter(c => c.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas Bancarias</h1>
          <p className="mt-1 text-sm text-gray-500">
            Solicitudes de cambio de cuenta bancaria de los afiliados.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <BankChangesTable
        changes={(changes || []).map(c => ({
          ...c,
          stores: c.stores as unknown as { name: string } | undefined,
        }))}
      />
    </div>
  )
}
