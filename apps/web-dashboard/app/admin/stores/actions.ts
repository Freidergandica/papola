'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')
}

export async function deleteStore(storeId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    // Eliminar datos asociados a la tienda

    // order_items de orders de esta tienda
    const { data: storeOrders } = await admin.from('orders').select('id').eq('store_id', storeId)
    if (storeOrders && storeOrders.length > 0) {
      await admin.from('order_items').delete().in('order_id', storeOrders.map(o => o.id))
    }
    await admin.from('orders').delete().eq('store_id', storeId)

    // products
    await admin.from('products').delete().eq('store_id', storeId)

    // deals + deal_redemptions
    const { data: storeDeals } = await admin.from('deals').select('id').eq('store_id', storeId)
    if (storeDeals && storeDeals.length > 0) {
      await admin.from('deal_redemptions').delete().in('deal_id', storeDeals.map(d => d.id))
      await admin.from('deals').delete().eq('store_id', storeId)
    }

    // bank_account_changes del owner
    const { data: store } = await admin.from('stores').select('owner_id').eq('id', storeId).single()
    if (store?.owner_id) {
      await admin.from('bank_account_changes').delete().eq('store_id', storeId)
    }

    // Eliminar la tienda
    const { error } = await admin.from('stores').delete().eq('id', storeId)
    if (error) return { error: error.message }

    revalidatePath('/admin/stores')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}
