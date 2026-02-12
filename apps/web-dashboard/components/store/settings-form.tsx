'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, X } from 'lucide-react'
import { Store } from '@/types'

export default function StoreSettingsForm({ store }: { store: Store }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `stores/${store.id}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('products').getPublicUrl(fileName)
      setFormData({ ...formData, image_url: data.publicUrl })
    } catch (error) {
      console.error('Error uploading image:', error)
      setMessage({ type: 'error', text: 'Error al subir la imagen' })
    } finally {
      setUploading(false)
    }
  }

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
              <label className="block text-sm font-medium text-gray-700">Logo del Comercio</label>
              <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative hover:border-papola-blue transition-colors">
                <div className="space-y-1 text-center">
                  {formData.image_url ? (
                    <div className="relative w-full h-48 mx-auto mb-4">
                      <img
                        src={formData.image_url}
                        alt="Logo"
                        className="h-48 object-contain mx-auto rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute top-0 right-0 -mr-2 -mt-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="logo-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-papola-blue hover:text-papola-blue-80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-papola-blue"
                        >
                          <span>Subir un archivo</span>
                          <input
                            id="logo-upload"
                            name="logo-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploading}
                          />
                        </label>
                        <p className="pl-1">o arrastrar y soltar</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB. Recomendado: Imagen cuadrada (1:1)</p>
                    </>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-md">
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 text-papola-blue animate-spin" />
                        <span className="text-sm text-papola-blue mt-2">Subiendo imagen...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
