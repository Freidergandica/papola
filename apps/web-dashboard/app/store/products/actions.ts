'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Verify the product belongs to the user's store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!store) return { error: 'No tienes un negocio asignado.' }

    const { data: product } = await supabase
      .from('products')
      .select('id, store_id')
      .eq('id', productId)
      .single()

    if (!product || product.store_id !== store.id) {
      return { error: 'Producto no encontrado o no tienes permiso.' }
    }

    // Check if product has order_items (can't hard-delete if so)
    const { count } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)

    if (count && count > 0) {
      // Soft-delete: mark as unavailable (preserves order history)
      const { error } = await supabase
        .from('products')
        .update({ is_available: false })
        .eq('id', productId)

      if (error) return { error: error.message }
    } else {
      // Hard-delete: no orders reference this product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) return { error: error.message }
    }

    revalidatePath('/store/products')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}
