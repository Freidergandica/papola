import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProductForm from '@/components/store/product-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function NewProductPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!store) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">No se encontró tu tienda</h2>
        <p className="mt-2 text-gray-500">Por favor contacta a soporte o asegúrate de tener una tienda asignada.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/store/products" className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Volver a Productos
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Nuevo Producto</h1>
        <p className="mt-2 text-gray-600">
          Añade un nuevo producto a tu catálogo.
        </p>
      </div>

      <ProductForm storeId={store.id} />
    </div>
  )
}
