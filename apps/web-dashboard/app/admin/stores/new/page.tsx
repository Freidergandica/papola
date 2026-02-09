
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Save, Loader2 } from 'lucide-react'

export default function NewStorePage() {
  async function createStore(formData: FormData) {
    'use server'
    
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const address = formData.get('address') as string
    const image_url = formData.get('image_url') as string
    const delivery_min = parseInt(formData.get('delivery_min') as string) || 15
    const delivery_max = parseInt(formData.get('delivery_max') as string) || 45

    const supabase = await createClient()
    
    // Create the store
    const { error } = await supabase.from('stores').insert({
      name,
      description,
      address,
      image_url,
      delivery_time_min: delivery_min,
      delivery_time_max: delivery_max,
      is_active: true,
      rating: 5.0 // Default rating
    })

    if (error) {
      console.error('Error creating store:', error)
      // In a real app we would handle errors better
      return
    }

    redirect('/admin/stores')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/stores" className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Volver a Tiendas
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Registrar Nuevo Comercio</h1>
        <p className="text-gray-500 mt-2">Ingresa los detalles básicos del nuevo comercio.</p>
      </div>

      <form action={createStore} className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Comercio</label>
          <input 
            type="text" 
            name="name" 
            id="name" 
            required
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white placeholder-gray-400"
            placeholder="Ej. Moda & Estilo, TechStore, Cafetería Central..."
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea 
            name="description" 
            id="description" 
            rows={3}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white placeholder-gray-400"
            placeholder="Breve descripción de los productos y servicios..."
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">Dirección Física</label>
          <input 
            type="text" 
            name="address" 
            id="address" 
            required
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white placeholder-gray-400"
            placeholder="Av. Principal 123, Local 4..."
          />
        </div>

        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">URL de Imagen (Logo/Banner)</label>
          <input 
            type="url" 
            name="image_url" 
            id="image_url" 
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white placeholder-gray-400"
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="delivery_min" className="block text-sm font-medium text-gray-700">Tiempo Min. (min)</label>
            <input 
              type="number" 
              name="delivery_min" 
              id="delivery_min" 
              defaultValue={20}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white placeholder-gray-400"
            />
          </div>
          <div>
            <label htmlFor="delivery_max" className="block text-sm font-medium text-gray-700">Tiempo Max. (min)</label>
            <input 
              type="number" 
              name="delivery_max" 
              id="delivery_max" 
              defaultValue={45}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white placeholder-gray-400"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button 
            type="submit"
            className="inline-flex justify-center items-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-papola-blue hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Tienda
          </button>
        </div>
      </form>
    </div>
  )
}
