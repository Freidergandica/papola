'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Store, MapPin, Loader2, FileText, Phone } from 'lucide-react'

export default function CreateStoreForm({ userId, userEmail }: { userId: string, userEmail: string }) {
  const [loading, setLoading] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [storeRif, setStoreRif] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Asegurar que el perfil existe
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: userEmail,
          role: 'store_owner',
          full_name: storeName
        })

      if (profileError) {
        console.error('Error creando perfil:', profileError)
      }

      // 2. Registrar Negocio
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

      if (storeError) throw storeError

      // Éxito
      router.refresh()
      
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al registrar el negocio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white py-8 px-4 shadow rounded-lg sm:px-10 border border-gray-100">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Completa tu Registro</h3>
        <p className="mt-1 text-sm text-gray-500">
          Ya casi terminamos. Registra tu negocio para comenzar.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCreateStore} className="space-y-6">
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
              placeholder="Ej. Moda & Estilo..."
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
            placeholder="Descripción de tu negocio..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-papola-blue hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Registrar Negocio'}
        </button>
      </form>
    </div>
  )
}
