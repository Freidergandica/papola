'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MapPin, Star } from 'lucide-react'

export default function StoresTable({ initialStores }: { initialStores: any[] }) {
  const [stores, setStores] = useState(initialStores)
  const supabase = createClient()
  const [updating, setUpdating] = useState<string | null>(null)

  const toggleStore = async (id: string, currentStatus: boolean) => {
    setUpdating(id)
    try {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) {
        console.error('Error updating store:', error)
        alert('Error al actualizar el afiliado')
        return
      }

      setStores(stores.map((s) => (s.id === id ? { ...s, is_active: !currentStatus } : s)))
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Afiliado
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ubicación
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rating
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {stores.map((store) => (
            <tr key={store.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <img className="h-10 w-10 rounded-full object-cover" src={store.image_url} alt="" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{store.name}</div>
                    <div className="text-sm text-gray-500">{store.description?.substring(0, 30)}...</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    {store.address}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-900">
                    <Star className="flex-shrink-0 mr-1.5 h-4 w-4 text-yellow-400 fill-current" />
                    {store.rating}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${store.is_active ? 'bg-papola-green-20 text-papola-green' : 'bg-red-100 text-red-800'}`}>
                  {store.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => toggleStore(store.id, store.is_active)}
                  disabled={updating === store.id}
                  className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white ${
                    store.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-papola-green hover:bg-papola-green-80'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue disabled:opacity-50`}
                >
                  {updating === store.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : store.is_active ? (
                    'Desactivar'
                  ) : (
                    'Activar'
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
