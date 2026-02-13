import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import UsersTable from '@/components/admin/users-table'

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  // Use admin client to bypass RLS and fetch all profiles
  const adminClient = createAdminClient()

  const { data: users } = await adminClient
    .from('profiles')
    .select('id, email, full_name, phone_number, role, created_at, avatar_url')
    .order('created_at', { ascending: false })

  // Fetch stores to show which users own stores
  const { data: stores } = await adminClient
    .from('stores')
    .select('id, name, owner_id, is_active')

  // Map stores by owner_id
  const storesByOwner: Record<string, { id: string; name: string; is_active: boolean }> = {}
  stores?.forEach((store) => {
    storesByOwner[store.owner_id] = { id: store.id, name: store.name, is_active: store.is_active }
  })

  // Count stats
  const totalUsers = users?.length || 0
  const adminCount = users?.filter(u => u.role === 'admin').length || 0
  const storeOwnerCount = users?.filter(u => u.role === 'store_owner').length || 0
  const customerCount = users?.filter(u => u.role === 'customer').length || 0
  const pendingCount = users?.filter(u => u.role === 'pending_store_owner').length || 0

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Usuarios</h2>
        <p className="text-gray-500 mt-2">Administra los usuarios, roles y permisos de la plataforma.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalUsers}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500">Administradores</p>
          <p className="text-2xl font-bold text-papola-blue mt-1">{adminCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500">Comercios</p>
          <p className="text-2xl font-bold text-papola-green mt-1">{storeOwnerCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-500">Clientes</p>
          <p className="text-2xl font-bold text-gray-700 mt-1">{customerCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <p className="text-sm font-medium text-yellow-600">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingCount}</p>
        </div>
      </div>

      <UsersTable
        users={users || []}
        storesByOwner={storesByOwner}
        currentUserId={user.id}
      />
    </div>
  )
}
