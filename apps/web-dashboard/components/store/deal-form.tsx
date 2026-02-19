'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DealFormProps {
  userId: string
  stores: Array<{ id: string; name: string }>
  storeId?: string // Pre-selected store (for store owners)
  redirectPath: string
  autoApprove?: boolean
}

export default function DealForm({ userId, stores, storeId, redirectPath, autoApprove }: DealFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([])

  const [form, setForm] = useState({
    store_id: storeId || '',
    title: '',
    description: '',
    discount_type: 'percentage' as string,
    discount_value: '',
    buy_quantity: '2',
    get_quantity: '1',
    coupon_code: '',
    applies_to: 'all_products',
    category: '',
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: '',
    is_flash_deal: false,
    max_redemptions: '',
    min_order_amount: '',
    product_ids: [] as string[],
  })

  const selectedStoreId = form.store_id || storeId

  useEffect(() => {
    if (selectedStoreId) {
      supabase
        .from('products')
        .select('id, name')
        .eq('store_id', selectedStoreId)
        .eq('is_available', true)
        .then(({ data }) => setProducts(data || []))
    }
  }, [selectedStoreId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const dealData: Record<string, unknown> = {
      store_id: selectedStoreId,
      created_by: userId,
      title: form.title,
      description: form.description || null,
      discount_type: form.discount_type,
      applies_to: form.applies_to,
      starts_at: form.starts_at,
      ends_at: form.ends_at || null,
      is_flash_deal: form.is_flash_deal,
      max_redemptions: form.max_redemptions ? parseInt(form.max_redemptions) : null,
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
      is_approved: autoApprove || false,
    }

    if (form.discount_type === 'percentage' || form.discount_type === 'fixed_amount') {
      dealData.discount_value = parseFloat(form.discount_value)
    } else if (form.discount_type === 'buy_x_get_y') {
      dealData.buy_quantity = parseInt(form.buy_quantity)
      dealData.get_quantity = parseInt(form.get_quantity)
    } else if (form.discount_type === 'coupon') {
      dealData.coupon_code = form.coupon_code.toUpperCase()
      dealData.discount_value = parseFloat(form.discount_value)
    }

    if (form.applies_to === 'category') {
      dealData.category = form.category
    }

    const { data, error } = await supabase
      .from('deals')
      .insert(dealData)
      .select()
      .single()

    if (error) {
      alert('Error al crear la oferta: ' + error.message)
      setLoading(false)
      return
    }

    if (form.applies_to === 'specific_products' && form.product_ids.length > 0) {
      const dealProducts = form.product_ids.map(pid => ({
        deal_id: data.id,
        product_id: pid,
      }))
      await supabase.from('deal_products').insert(dealProducts)
    }

    router.push(redirectPath)
  }

  const inputClass = 'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-papola-blue focus:ring-papola-blue focus:outline-none'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
      {/* Store selector (only for admin) */}
      {!storeId && (
        <div>
          <label className={labelClass}>Negocio</label>
          <select
            value={form.store_id}
            onChange={(e) => setForm({ ...form, store_id: e.target.value })}
            className={inputClass}
            required
          >
            <option value="">Seleccionar negocio...</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className={labelClass}>Título de la oferta</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClass}
          placeholder="Ej: 20% de descuento en pizzas"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Descripción (opcional)</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputClass}
          rows={3}
          placeholder="Descripción de la oferta..."
        />
      </div>

      {/* Discount Type */}
      <div>
        <label className={labelClass}>Tipo de descuento</label>
        <select
          value={form.discount_type}
          onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
          className={inputClass}
        >
          <option value="percentage">Porcentaje (%)</option>
          <option value="fixed_amount">Monto fijo ($)</option>
          <option value="buy_x_get_y">Lleva X paga Y (2x1, 3x2...)</option>
          <option value="coupon">Cupón canjeable</option>
        </select>
      </div>

      {/* Dynamic fields based on discount type */}
      {(form.discount_type === 'percentage' || form.discount_type === 'fixed_amount') && (
        <div>
          <label className={labelClass}>
            {form.discount_type === 'percentage' ? 'Porcentaje de descuento' : 'Monto de descuento ($)'}
          </label>
          <input
            type="number"
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
            className={inputClass}
            placeholder={form.discount_type === 'percentage' ? '20' : '5.00'}
            min="0"
            step={form.discount_type === 'percentage' ? '1' : '0.01'}
            required
          />
        </div>
      )}

      {form.discount_type === 'buy_x_get_y' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Compra (X)</label>
            <input
              type="number"
              value={form.buy_quantity}
              onChange={(e) => setForm({ ...form, buy_quantity: e.target.value })}
              className={inputClass}
              min="1"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Lleva (Y)</label>
            <input
              type="number"
              value={form.get_quantity}
              onChange={(e) => setForm({ ...form, get_quantity: e.target.value })}
              className={inputClass}
              min="1"
              required
            />
          </div>
        </div>
      )}

      {form.discount_type === 'coupon' && (
        <>
          <div>
            <label className={labelClass}>Código del cupón</label>
            <input
              type="text"
              value={form.coupon_code}
              onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })}
              className={inputClass}
              placeholder="Ej: DESCUENTO20"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Valor del descuento ($)</label>
            <input
              type="number"
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              className={inputClass}
              placeholder="5.00"
              min="0"
              step="0.01"
              required
            />
          </div>
        </>
      )}

      {/* Applies to */}
      <div>
        <label className={labelClass}>Aplica a</label>
        <select
          value={form.applies_to}
          onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
          className={inputClass}
        >
          <option value="all_products">Todos los productos</option>
          <option value="specific_products">Productos específicos</option>
          <option value="category">Categoría</option>
        </select>
      </div>

      {form.applies_to === 'specific_products' && products.length > 0 && (
        <div>
          <label className={labelClass}>Seleccionar productos</label>
          <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
            {products.map(p => (
              <label key={p.id} className="flex items-center space-x-2 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.product_ids.includes(p.id)}
                  onChange={(e) => {
                    const ids = e.target.checked
                      ? [...form.product_ids, p.id]
                      : form.product_ids.filter(id => id !== p.id)
                    setForm({ ...form, product_ids: ids })
                  }}
                  className="rounded text-papola-blue focus:ring-papola-blue"
                />
                <span className="text-sm text-gray-700">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {form.applies_to === 'category' && (
        <div>
          <label className={labelClass}>Categoría</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputClass}
            placeholder="Ej: Pizzas, Bebidas..."
            required
          />
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Fecha de inicio</label>
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Fecha de fin (opcional)</label>
          <input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      {/* Flash deal toggle */}
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="flash_deal"
          checked={form.is_flash_deal}
          onChange={(e) => setForm({ ...form, is_flash_deal: e.target.checked })}
          className="rounded text-papola-blue focus:ring-papola-blue"
        />
        <label htmlFor="flash_deal" className="text-sm font-medium text-gray-700">
          Oferta Flash (con countdown timer)
        </label>
      </div>

      {/* Limits */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Máximo de canjes (opcional)</label>
          <input
            type="number"
            value={form.max_redemptions}
            onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })}
            className={inputClass}
            placeholder="Ilimitado"
            min="1"
          />
        </div>
        <div>
          <label className={labelClass}>Pedido mínimo $ (opcional)</label>
          <input
            type="number"
            value={form.min_order_amount}
            onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
            className={inputClass}
            placeholder="Sin mínimo"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-papola-blue text-white rounded-lg hover:bg-papola-blue-80 transition-colors font-medium disabled:opacity-50"
      >
        {loading ? 'Creando oferta...' : 'Crear Oferta'}
      </button>
    </form>
  )
}
