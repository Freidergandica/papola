'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Star, StarOff } from 'lucide-react'

interface Deal {
  id: string
  title: string
  discount_type: string
  discount_value: number
  coupon_code?: string
  is_active: boolean
  is_approved: boolean
  is_featured: boolean
  is_flash_deal: boolean
  starts_at: string
  ends_at?: string
  current_redemptions: number
  max_redemptions?: number
  stores?: { name: string }
}

export default function DealsTable({ deals: initialDeals }: { deals: Deal[] }) {
  const [deals, setDeals] = useState(initialDeals)
  const supabase = createClient()

  const updateDeal = async (id: string, updates: Partial<Deal>) => {
    const { error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', id)

    if (!error) {
      setDeals(deals.map(d => d.id === id ? { ...d, ...updates } : d))
    }
  }

  const formatDiscount = (deal: Deal) => {
    switch (deal.discount_type) {
      case 'percentage': return `${deal.discount_value}%`
      case 'fixed_amount': return `$${deal.discount_value}`
      case 'buy_x_get_y': return 'Promo'
      case 'coupon': return deal.coupon_code || `$${deal.discount_value}`
      default: return '-'
    }
  }

  const getStatusBadge = (deal: Deal) => {
    if (!deal.is_active) return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Inactivo</span>
    if (!deal.is_approved) return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Pendiente</span>
    if (deal.ends_at && new Date(deal.ends_at) < new Date()) return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Expirado</span>
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Activo</span>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oferta</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tienda</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descuento</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canjes</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {deals.map((deal) => (
            <tr key={deal.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{deal.title}</div>
                {deal.is_flash_deal && (
                  <span className="text-xs text-orange-600 font-medium">Flash Deal</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {deal.stores?.name || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-papola-blue">
                {formatDiscount(deal)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {deal.current_redemptions}/{deal.max_redemptions || '∞'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(deal)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                {!deal.is_approved && (
                  <button
                    onClick={() => updateDeal(deal.id, { is_approved: true })}
                    className="inline-flex items-center p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                    title="Aprobar"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                {deal.is_approved && deal.is_active && (
                  <button
                    onClick={() => updateDeal(deal.id, { is_active: false })}
                    className="inline-flex items-center p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                    title="Desactivar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => updateDeal(deal.id, { is_featured: !deal.is_featured })}
                  className={`inline-flex items-center p-1.5 rounded-lg ${
                    deal.is_featured ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-400'
                  } hover:bg-yellow-100`}
                  title={deal.is_featured ? 'Quitar destacado' : 'Destacar'}
                >
                  {deal.is_featured ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                </button>
              </td>
            </tr>
          ))}
          {deals.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                No hay ofertas registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
