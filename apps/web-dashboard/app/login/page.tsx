'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      if (!user) throw new Error('No se pudo obtener el usuario')

      // Verificar rol
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.log('Perfil no encontrado, intentando crear uno nuevo...', profileError)
        
        // Intentar crear el perfil si no existe (Recuperación automática)
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'store_owner',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0]
          })
          .select('role')
          .single()

        if (createError) {
           console.error('Error fatal creando perfil:', createError)
           setError('Error de integridad de cuenta. Por favor contacta soporte.')
           await supabase.auth.signOut()
           return
        }
        
        profile = newProfile
      }

      if (profile?.role === 'admin') {
        router.push('/admin/dashboard')
      } else if (profile?.role === 'store_owner') {
        router.push('/store/dashboard')
      } else {
        // Otros roles no tienen acceso al dashboard web por ahora
        setError('No tienes permisos para acceder a este panel.')
        await supabase.auth.signOut()
        return
      }

      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-10 shadow-xl rounded-2xl">
        <div className="text-center flex flex-col items-center">
          <div className="relative h-16 w-48 mb-4">
             <Image 
               src="/logo.png" 
               alt="Papola" 
               fill
               className="object-contain"
               priority
             />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Panel de Gestión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa tus credenciales para gestionar la plataforma
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-papola-blue focus:outline-none focus:ring-papola-blue sm:text-sm"
                  placeholder="admin@papola.app"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-papola-blue focus:outline-none focus:ring-papola-blue sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error de autenticación</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg border border-transparent bg-papola-blue px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-papola-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Ingresar al Dashboard'
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <p className="text-sm text-gray-600">
              ¿Tienes un comercio y quieres vender con nosotros?
            </p>
            <Link href="/register" className="mt-2 inline-block font-medium text-papola-green hover:text-papola-green-80 transition-colors">
              Registra tu negocio aquí &rarr;
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
