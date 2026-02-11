'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Store, User, Lock, MapPin, ArrowRight, FileText, Phone } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterStorePage() {
  const [step, setStep] = useState(1) // 1: Usuario, 2: Tienda
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storeRif, setStoreRif] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [storeDescription, setStoreDescription] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Crear Usuario
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'store_owner' // Metadata inicial
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No se pudo crear el usuario')

      // Verificar si se requiere confirmación de correo (sesión es null)
      if (!authData.session) {
        alert('Registro exitoso. Por favor revisa tu correo para confirmar tu cuenta. Una vez confirmado, podrás iniciar sesión y completar el registro de tu tienda.')
        router.push('/login')
        return
      }

      const userId = authData.user.id

      // 2. Crear Perfil (Store Owner)
      // Nota: Esto debería hacerse idealmente con un Trigger en Supabase, 
      // pero lo haremos aquí explícitamente por seguridad del flujo.
      // Si ya existe por trigger, el insert podría fallar o ignorarse.
      // Intentaremos actualizar si ya existe o insertar.
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          role: 'store_owner',
          full_name: storeName // Usamos el nombre de la tienda como nombre temporal
        })

      if (profileError) {
        console.error('Profile Error:', profileError)
        // No bloqueamos, seguimos intentando crear la tienda
      }

      // 3. Crear Tienda
      const { error: storeError } = await supabase
        .from('stores')
        .insert({
          owner_id: userId,
          name: storeName,
          rif: storeRif,
          phone: storePhone,
          description: storeDescription,
          address: storeAddress,
          is_active: false, // Inactivo por defecto, requiere aprobación
          rating: 5.0
        })

      if (storeError) throw storeError

      // Éxito
      // Redirigir a una página de éxito o login
      alert('Registro exitoso. Tu tienda está pendiente de aprobación.')
      router.push('/login')

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Ocurrió un error durante el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="relative h-12 w-40 mx-auto mb-4">
           <Image 
             src="/logo.png" 
             alt="Papola" 
             fill
             className="object-contain"
             priority
           />
        </div>
        <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
          Únete a Papola
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Registra tu comercio y comienza a vender hoy mismo.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-papola-blue text-white' : 'bg-gray-200 text-gray-500'} font-bold text-sm transition-colors`}>
              1
            </div>
            <div className={`h-1 w-12 ${step >= 2 ? 'bg-papola-blue' : 'bg-gray-200'} mx-2 transition-colors`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-papola-blue text-white' : 'bg-gray-200 text-gray-500'} font-bold text-sm transition-colors`}>
              2
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={step === 1 ? handleNextStep : handleRegister} className="space-y-6">
            
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Datos de la Cuenta</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-papola-blue hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue transition-colors"
                >
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Datos del Comercio</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre del Negocio</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Store className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="Ej. Moda & Estilo, TechStore, Cafetería Central..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">RIF de la Empresa</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={storeRif}
                      onChange={(e) => setStoreRif(e.target.value)}
                      className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="J-12345678-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={storePhone}
                      onChange={(e) => setStorePhone(e.target.value)}
                      className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="+58 412 1234567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Dirección</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={storeAddress}
                      onChange={(e) => setStoreAddress(e.target.value)}
                      className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="Av. Siempre Viva 123"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción Corta</label>
                  <textarea
                    rows={3}
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full sm:text-sm border-gray-300 rounded-lg p-3 text-gray-900 bg-white placeholder-gray-400"
                    placeholder="Vendemos ropa, accesorios, tecnología o comida con los mejores descuentos..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-papola-green hover:bg-papola-green-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Finalizar Registro'}
                  </button>
                </div>
              </div>
            )}

          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  ¿Ya tienes cuenta?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link href="/login" className="font-medium text-papola-blue hover:text-papola-blue-80">
                Inicia sesión aquí
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
