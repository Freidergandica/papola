'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { Store } from '@/types' // Using our new types file

export default function StoreSettingsForm({ store }: { store: Store }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [formData, setFormData] = useState({
    name: store.name,
    description: store.description || '',
    address: store.address || '',
    phone: store.phone || '',
    schedule: store.schedule || '',
    category: store.category || '',
    image_url: store.image_url || ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          phone: formData.phone,
          schedule: formData.schedule,
          category: formData.category,
          image_url: formData.image_url
        })
        .eq('id', store.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Datos de la tienda actualizados correctamente.' })
    } catch (error) {
      console.error('Error updating store:', error)
      setMessage({ type: 'error', text: 'Error al actualizar los datos.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Información General</h3>
          <p className="mt-1 text-sm text-gray-500">
            Detalles públicos de tu comercio visibles para los clientes.
          </p>
        </div>
        <div className="mt-5 md:mt-0 md:col-span-2 space-y-6">
          <div className="grid grid-cols-6 gap-6">
            <div className="col-span-6 sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Comercio</label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
              />
            </div>

            <div className="col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-papola-blue focus:border-papola-blue block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
              <input
                type="text"
                name="category"
                id="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
              />
            </div>

             <div className="col-span-6">
              <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">URL del Logo</label>
              <input
                type="url"
                name="image_url"
                id="image_url"
                value={formData.image_url}
                onChange={handleChange}
                className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
              />
               <p className="mt-2 text-xs text-gray-500">Recomendado: Imagen cuadrada (1:1)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:block" aria-hidden="true">
        <div className="py-5">
          <div className="border-t border-gray-200" />
        </div>
      </div>

      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Ubicación y Contacto</h3>
          <p className="mt-1 text-sm text-gray-500">
            Cómo pueden encontrarte tus clientes.
          </p>
        </div>
        <div className="mt-5 md:mt-0 md:col-span-2 space-y-6">
           <div className="grid grid-cols-6 gap-6">
            <div className="col-span-6">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">Dirección</label>
              <input
                type="text"
                name="address"
                id="address"
                value={formData.address}
                onChange={handleChange}
                className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input
                type="text"
                name="phone"
                id="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
              />
            </div>

            <div className="col-span-6">
              <label htmlFor="schedule" className="block text-sm font-medium text-gray-700">Horario de Atención</label>
              <input
                type="text"
                name="schedule"
                id="schedule"
                value={formData.schedule}
                onChange={handleChange}
                placeholder="Ej. Lun-Vie: 9am - 6pm"
                className="mt-1 focus:ring-papola-blue focus:border-papola-blue block w-full shadow-sm sm:text-sm border-gray-300 rounded-md border py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-5">
         {message && (
          <div className={`mr-4 flex items-center text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-papola-blue hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  )
}
