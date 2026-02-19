import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Save, Landmark, Hash, Upload } from 'lucide-react'
import { STORE_CATEGORIES } from '@/lib/categories'

export default async function EditStorePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams
  if (!id) redirect('/admin/stores')

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  const adminClient = createAdminClient()
  const { data: store } = await adminClient
    .from('stores')
    .select('*')
    .eq('id', id)
    .single()

  if (!store) redirect('/admin/stores')

  async function updateStore(formData: FormData) {
    'use server'

    const storeId = formData.get('store_id') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const address = formData.get('address') as string
    const category = formData.get('category') as string
    const phone = formData.get('phone') as string
    const schedule = formData.get('schedule') as string
    const delivery_min = parseInt(formData.get('delivery_min') as string) || 20
    const delivery_max = parseInt(formData.get('delivery_max') as string) || 45

    const adminClient = createAdminClient()

    // Handle image upload
    let image_url = formData.get('current_image_url') as string || ''
    const imageFile = formData.get('image') as File

    if (imageFile && imageFile.size > 0) {
      const ext = imageFile.name.split('.').pop() || 'jpg'
      const path = `${storeId}/logo.${ext}`

      const { error: uploadError } = await adminClient.storage
        .from('stores')
        .upload(path, imageFile, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = adminClient.storage.from('stores').getPublicUrl(path)
        image_url = urlData.publicUrl
      } else {
        console.error('Error uploading image:', uploadError)
      }
    }

    const { error } = await adminClient.from('stores').update({
      name,
      description,
      address,
      category,
      phone,
      schedule,
      image_url,
      delivery_time_min: delivery_min,
      delivery_time_max: delivery_max,
    }).eq('id', storeId)

    if (error) {
      console.error('Error updating store:', error)
      return
    }

    redirect('/admin/stores')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/stores" className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Volver a Afiliados
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Editar Afiliado</h1>
        <p className="text-gray-500 mt-2">Modifica los datos de <strong>{store.name}</strong>.</p>
      </div>

      <form action={updateStore} className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 space-y-6">
        <input type="hidden" name="store_id" value={store.id} />

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Afiliado</label>
          <input
            type="text"
            name="name"
            id="name"
            required
            defaultValue={store.name}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            name="description"
            id="description"
            rows={3}
            defaultValue={store.description || ''}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoría</label>
          <select
            name="category"
            id="category"
            required
            defaultValue={store.category || ''}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white"
          >
            <option value="">Seleccionar categoría</option>
            {STORE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">Dirección Física</label>
          <input
            type="text"
            name="address"
            id="address"
            required
            defaultValue={store.address || ''}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              type="text"
              name="phone"
              id="phone"
              defaultValue={store.phone || ''}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white"
            />
          </div>
          <div>
            <label htmlFor="schedule" className="block text-sm font-medium text-gray-700">Horario</label>
            <input
              type="text"
              name="schedule"
              id="schedule"
              defaultValue={store.schedule || ''}
              placeholder="Ej. Lun-Vie: 9am - 6pm"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Imagen del Negocio</label>
          <input type="hidden" name="current_image_url" value={store.image_url || ''} />
          {store.image_url && (
            <div className="mt-2 mb-3">
              <img src={store.image_url} alt={store.name} className="h-32 w-full object-cover rounded-lg border border-gray-200" />
            </div>
          )}
          <label htmlFor="image" className="mt-1 flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-papola-blue transition-colors bg-gray-50">
            <Upload className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-500">Seleccionar nueva imagen</span>
            <input
              type="file"
              name="image"
              id="image"
              accept="image/*"
              className="hidden"
            />
          </label>
          <p className="mt-1 text-xs text-gray-400">JPG, PNG o WebP. Se reemplazará la imagen actual.</p>
        </div>

        {store.affiliate_number && (
          <div className="flex items-center gap-2 px-4 py-3 bg-papola-blue-20 rounded-lg">
            <Hash className="h-4 w-4 text-papola-blue" />
            <span className="text-sm font-bold text-papola-blue">Afiliado N° {store.affiliate_number}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="delivery_min" className="block text-sm font-medium text-gray-700">Tiempo Min. (min)</label>
            <input
              type="number"
              name="delivery_min"
              id="delivery_min"
              defaultValue={store.delivery_time_min || 20}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white"
            />
          </div>
          <div>
            <label htmlFor="delivery_max" className="block text-sm font-medium text-gray-700">Tiempo Max. (min)</label>
            <input
              type="number"
              name="delivery_max"
              id="delivery_max"
              defaultValue={store.delivery_time_max || 45}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-papola-blue focus:ring-papola-blue sm:text-sm px-4 py-3 border text-gray-900 bg-white"
            />
          </div>
        </div>

        {/* Datos Bancarios (read-only) */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
            <Landmark className="h-4 w-4 text-papola-blue" />
            Datos Bancarios
          </h3>
          {store.bank_name ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500">Banco</dt>
                <dd className="mt-1 text-sm text-gray-900">{store.bank_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Tipo de Cuenta</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{store.bank_account_type || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Número de Cuenta</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{store.bank_account_number || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Cédula / RIF del Titular</dt>
                <dd className="mt-1 text-sm text-gray-900">{store.bank_account_holder_id || '-'}</dd>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Sin datos bancarios registrados.</p>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            className="inline-flex justify-center items-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-papola-blue hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  )
}
