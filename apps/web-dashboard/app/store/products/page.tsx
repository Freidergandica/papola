import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Edit, Trash2 } from 'lucide-react'
import Image from 'next/image'

export default async function ProductsPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return <div>No autorizado</div>
  }

  // Get store for this user
  // Note: Assuming 'owner_id' is set. If not, this might return nothing.
  // For demo purposes, if owner_id is missing, we might not find the store.
  // In a real scenario, we ensure the store is created with owner_id.
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  let products: any[] = []

  if (store) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
    
    if (data) products = data
  } else {
      // Fallback: Check if user is admin or just show message
      // Or maybe the user hasn't created a store yet?
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mis Productos</h1>
        <Link 
          href="/store/products/new" 
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-papola-blue hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Nuevo Producto
        </Link>
      </div>

      {!store ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No tienes una tienda asignada o no se encontró tu tienda.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No tienes productos registrados aún.</p>
          <Link href="/store/products/new" className="text-papola-blue hover:text-papola-blue-80 mt-2 inline-block">
            Crear mi primer producto &rarr;
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {products.map((product) => (
              <li key={product.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center">
                  <div className="flex-shrink-0 h-16 w-16 relative rounded-md overflow-hidden border border-gray-200">
                    {product.image_url ? (
                       <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-400">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-papola-blue truncate">{product.name}</p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.is_available ? 'Disponible' : 'Agotado'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Precio: ${product.price}
                          {product.original_price && (
                            <span className="ml-2 text-xs line-through text-gray-400">${product.original_price}</span>
                          )}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          Stock: {product.stock || 0}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                         {/* Actions could go here */}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
