import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import DealsTable from '@/components/admin/deals-table'

export default async function AdminDealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  const { data: deals } = await supabase
    .from('deals')
    .select('*, stores(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ofertas</h1>
          <p className="mt-1 text-sm text-gray-500">Gestiona todas las ofertas y descuentos de la plataforma.</p>
        </div>
        <Link
          href="/admin/deals/new"
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-papola-blue text-white rounded-lg hover:bg-papola-blue-80 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Oferta
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <DealsTable deals={deals || []} />
      </div>
    </div>
  )
}
