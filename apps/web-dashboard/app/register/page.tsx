'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Store, User, Lock, MapPin, ArrowRight, FileText, Phone, Eye, EyeOff } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
      // 1. Crear Usuario con metadata (signup_type en vez de role)
      // El trigger handle_new_user() asignará pending_store_owner automáticamente
      console.log('Step 1: Signing up user...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            signup_type: 'store',
            pending_store: true,
            store_name: storeName,
            store_rif: storeRif,
            store_phone: storePhone,
            store_address: storeAddress,
            store_description: storeDescription,
          }
        }
      })

      if (authError) {
        console.error('Auth error:', authError.message, authError.status, authError.name)
        throw new Error(authError.message || `Error de autenticación (${authError.status})`)
      }
      if (!authData.user) throw new Error('No se pudo crear el usuario')

      console.log('Step 1 OK. User created:', authData.user.id, 'Session:', !!authData.session)

      // Si requiere confirmación de correo (sesión es null)
      if (!authData.session) {
        alert('Registro exitoso. Por favor revisa tu correo para confirmar tu cuenta. Tu solicitud será revisada por nuestro equipo.')
        router.push('/login')
        return
      }

      const userId = authData.user.id

      // El perfil se crea automáticamente via trigger (handle_new_user)
      // Solo creamos la tienda con is_active: false
      console.log('Step 2: Creating store...')
      const { error: storeError } = await supabase
        .from('stores')
        .insert({
          owner_id: userId,
          name: storeName,
          rif: storeRif,
          phone: storePhone,
          description: storeDescription,
          address: storeAddress,
          is_active: false,
          rating: 5.0
        })

      if (storeError) {
        console.error('Store error:', storeError.message, storeError.code, storeError.details)
        throw new Error(storeError.message || 'Error al crear la tienda')
      }

      console.log('Step 2 OK. Store created.')
      alert('Registro exitoso. Tu solicitud está pendiente de aprobación por nuestro equipo.')
      router.push('/login')

    } catch (err: any) {
      console.error('Registration error:', err)
      const message = err?.message || err?.error_description || (typeof err === 'object' ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : String(err))
      setError(message || 'Ocurrió un error durante el registro')
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
          Regístrate como afiliado y comienza a vender hoy mismo.
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
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-lg py-3 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-lg py-3 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
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
                  <h3 className="text-lg font-medium text-gray-900">Datos del Negocio</h3>
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
