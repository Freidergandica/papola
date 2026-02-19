'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteProduct } from './actions'

export default function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${productName}"? Esta acción no se puede deshacer.`)) return
    setLoading(true)
    const result = await deleteProduct(productId)
    if (result.error) {
      alert('Error: ' + result.error)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors"
      title="Eliminar producto"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      Eliminar
    </button>
  )
}
