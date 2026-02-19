import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Clock, Mail, Store } from 'lucide-react'
import SignOutButton from './sign-out-button'

export default async function PendingStorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // If already approved, redirect to dashboard
  if (profile?.role === 'store_owner') {
    redirect('/store/dashboard')
  }

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard')
  }

  // Get store name from metadata or DB
  const { data: store } = await supabase
    .from('stores')
    .select('name')
    .eq('owner_id', user.id)
    .single()

  const storeName = store?.name || user.user_metadata?.store_name || 'Tu tienda'

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 mb-6">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Solicitud en Revisión
        </h1>

        <p className="text-gray-600 mb-6">
          Tu solicitud para registrarte como afiliado está siendo revisada por nuestro equipo.
          Te notificaremos cuando sea aprobada.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Store className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-500">Negocio:</span>
            <span className="font-medium text-gray-900 truncate">{storeName}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-500">Correo:</span>
            <span className="font-medium text-gray-900 truncate">{user.email}</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full text-xs font-medium text-yellow-700 mb-6">
          <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
          Pendiente de aprobación
        </div>

        <div className="pt-4 border-t border-gray-100">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
