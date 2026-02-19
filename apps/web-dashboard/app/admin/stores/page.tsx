
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { MapPin, Star, Power, PowerOff, Edit2, Tag } from 'lucide-react'
import Link from 'next/link'

export default async function StoresPage() {
  const supabase = await createClient()
  
  // Fetch all stores
  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  async function toggleStoreStatus(storeId: string, currentStatus: boolean) {
    'use server'
    const supabase = await createClient()
    await supabase.from('stores').update({ is_active: !currentStatus }).eq('id', storeId)
    revalidatePath('/admin/stores')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Afiliados</h2>
          <p className="text-gray-500 mt-2">Activa, desactiva o edita los restaurantes de la plataforma.</p>
        </div>
        <Link 
          href="/admin/stores/new"
          className="bg-papola-blue hover:bg-papola-blue-80 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-papola-blue-20 transition-all flex items-center"
        >
          + Nuevo Afiliado
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores?.map((store) => (
          <div key={store.id} className={`bg-white rounded-2xl shadow-sm border ${store.is_active ? 'border-gray-100' : 'border-red-100 bg-red-50/30'} overflow-hidden flex flex-col`}>
            {/* Image Placeholder or Real Image */}
            <div className="h-40 bg-gray-200 relative">
               {store.image_url ? (
                 <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-gray-400">Sin Imagen</div>
               )}
               <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center shadow-sm">
                  <Star className="w-4 h-4 text-yellow-400 mr-1 fill-yellow-400" />
                  <span className="text-xs font-bold">{store.rating}</span>
               </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                 <h3 className="text-xl font-bold text-gray-900">{store.name}</h3>
                 <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${store.is_active ? 'bg-papola-green-20 text-papola-green border-papola-green-40' : 'bg-red-100 text-red-700 border-red-200'}`}>
                    {store.is_active ? 'Activo' : 'Inactivo'}
                 </span>
              </div>
              
              <p className="text-gray-500 text-sm mb-3 line-clamp-2">{store.description}</p>

              {store.category && (
                <div className="flex items-center text-sm mb-2">
                  <Tag className="w-3.5 h-3.5 mr-1.5 text-papola-blue" />
                  <span className="text-papola-blue font-medium">{store.category}</span>
                </div>
              )}

              <div className="flex items-center text-gray-400 text-sm mb-6">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="truncate">{store.address}</span>
              </div>

              <div className="mt-auto flex gap-3 pt-4 border-t border-gray-100">
                 <Link href={`/admin/stores/edit?id=${store.id}`} className="flex-1 flex items-center justify-center py-2 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                 </Link>
                 
                 <form action={toggleStoreStatus.bind(null, store.id, store.is_active)} className="flex-1">
                   <button 
                     type="submit"
                     className={`w-full flex items-center justify-center py-2 px-4 rounded-lg font-medium text-sm transition-colors ${store.is_active ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-papola-green-20 hover:bg-papola-green-40 text-papola-green'}`}
                   >
                      {store.is_active ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-2" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-2" />
                          Activar
                        </>
                      )}
                   </button>
                 </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
