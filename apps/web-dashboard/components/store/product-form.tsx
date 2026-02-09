'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X } from 'lucide-react'

export default function ProductForm({ storeId }: { storeId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [stock, setStock] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('') // Main image
  const [uploading, setUploading] = useState(false)
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('products').getPublicUrl(filePath)
      
      setImageUrl(data.publicUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('products').insert({
        store_id: storeId,
        name,
        description,
        price: parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        stock: parseInt(stock) || 0,
        sku: sku || null,
        category,
        image_url: imageUrl,
        is_available: true
      })

      if (error) throw error

      router.push('/store/products')
      router.refresh()
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Error al crear el producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white p-6 rounded-lg shadow">
      <div className="space-y-8 divide-y divide-gray-200">
        <div>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            
            {/* Nombre */}
            <div className="sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre del Producto
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="shadow-sm focus:ring-papola-blue focus:border-papola-blue block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-gray-900 bg-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="shadow-sm focus:ring-papola-blue focus:border-papola-blue block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3 text-gray-900 bg-white placeholder-gray-400"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">Breve descripción del producto, ingredientes o características.</p>
            </div>

            {/* Precios */}
            <div className="sm:col-span-2">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Precio de Venta
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="price"
                  id="price"
                  required
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border text-gray-900 bg-white placeholder-gray-400"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="original_price" className="block text-sm font-medium text-gray-700">
                Precio Original (Antes)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="original_price"
                  id="original_price"
                  step="0.01"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="focus:ring-papola-blue focus:border-papola-blue block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border text-gray-900 bg-white placeholder-gray-400"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Opcional. Para mostrar descuento.</p>
            </div>

            {/* Inventario */}
            <div className="sm:col-span-2">
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                Stock (Cantidad)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="stock"
                  id="stock"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="shadow-sm focus:ring-papola-blue focus:border-papola-blue block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-gray-900 bg-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                SKU (Código)
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="sku"
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="shadow-sm focus:ring-papola-blue focus:border-papola-blue block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-gray-900 bg-white placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Categoría
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="category"
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="shadow-sm focus:ring-papola-blue focus:border-papola-blue block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-gray-900 bg-white placeholder-gray-400"
                  placeholder="Ej. Bebidas, Ropa, Electrónica"
                />
              </div>
            </div>

            {/* Imagen Upload */}
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700">
                Imagen del Producto
              </label>
              <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative hover:border-papola-blue transition-colors">
                <div className="space-y-1 text-center">
                  {imageUrl ? (
                    <div className="relative w-full h-48 mx-auto mb-4">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="h-48 object-contain mx-auto rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
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
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-papola-blue hover:text-papola-blue-80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-papola-blue"
                        >
                          <span>Subir un archivo</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploading}
                          />
                        </label>
                        <p className="pl-1">o arrastrar y soltar</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF hasta 5MB
                      </p>
                    </>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
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

      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-papola-blue hover:bg-papola-blue-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-papola-blue disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Guardar Producto'}
          </button>
        </div>
      </div>
    </form>
  )
}
