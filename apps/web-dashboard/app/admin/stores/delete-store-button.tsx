'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteStore } from './actions'

export default function DeleteStoreButton({ storeId, storeName }: { storeId: string; storeName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteStore(storeId)
    if (result.error) {
      alert(`Error al eliminar: ${result.error}`)
      setDeleting(false)
      setConfirming(false)
    } else {
      router.refresh()
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
        >
          {deleting ? '...' : 'Sí'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold transition-colors"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center justify-center py-2 px-4 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 font-medium text-sm transition-colors"
      title={`Eliminar ${storeName}`}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
