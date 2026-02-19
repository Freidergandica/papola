'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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

export async function approveStoreOwner(userId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    const { error: roleError } = await admin
      .from('profiles')
      .update({ role: 'store_owner' })
      .eq('id', userId)

    if (roleError) return { error: roleError.message }

    const { error: storeError } = await admin
      .from('stores')
      .update({ is_active: true })
      .eq('owner_id', userId)

    if (storeError) return { error: storeError.message }

    revalidatePath('/admin/users')
    revalidatePath('/admin/stores')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    // re-throw Next.js redirects
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}

export async function rejectStoreOwner(userId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('profiles')
      .update({ role: 'customer' })
      .eq('id', userId)

    if (error) return { error: error.message }

    revalidatePath('/admin/users')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}

export async function changeUserRole(userId: string, newRole: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) return { error: error.message }

    revalidatePath('/admin/users')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    // Eliminar datos relacionados (tablas sin ON DELETE CASCADE)

    // bank_account_changes
    await admin.from('bank_account_changes').delete().eq('requested_by', userId)
    await admin.from('bank_account_changes').update({ reviewed_by: null }).eq('reviewed_by', userId)

    // deal_redemptions del usuario
    await admin.from('deal_redemptions').delete().eq('customer_id', userId)

    // deals creados por el usuario
    const { data: userDeals } = await admin.from('deals').select('id').eq('created_by', userId)
    if (userDeals && userDeals.length > 0) {
      const dealIds = userDeals.map(d => d.id)
      await admin.from('deal_redemptions').delete().in('deal_id', dealIds)
      await admin.from('deals').delete().eq('created_by', userId)
    }

    // orders como cliente (primero order_items)
    const { data: userOrders } = await admin.from('orders').select('id').eq('customer_id', userId)
    if (userOrders && userOrders.length > 0) {
      await admin.from('order_items').delete().in('order_id', userOrders.map(o => o.id))
    }
    await admin.from('orders').delete().eq('customer_id', userId)

    // orders como driver → nullificar
    await admin.from('orders').update({ driver_id: null }).eq('driver_id', userId)

    // stores del usuario (con sus productos, deals, orders)
    const { data: userStores } = await admin.from('stores').select('id').eq('owner_id', userId)
    if (userStores && userStores.length > 0) {
      const storeIds = userStores.map(s => s.id)
      const { data: storeOrders } = await admin.from('orders').select('id').in('store_id', storeIds)
      if (storeOrders && storeOrders.length > 0) {
        await admin.from('order_items').delete().in('order_id', storeOrders.map(o => o.id))
        await admin.from('orders').delete().in('store_id', storeIds)
      }
      await admin.from('products').delete().in('store_id', storeIds)
      const { data: storeDeals } = await admin.from('deals').select('id').in('store_id', storeIds)
      if (storeDeals && storeDeals.length > 0) {
        await admin.from('deal_redemptions').delete().in('deal_id', storeDeals.map(d => d.id))
        await admin.from('deals').delete().in('store_id', storeIds)
      }
      await admin.from('stores').delete().eq('owner_id', userId)
    }

    // addresses
    await admin.from('addresses').delete().eq('user_id', userId)

    // support_tickets + support_messages ya tienen ON DELETE CASCADE

    // Eliminar el usuario de auth (cascade a profiles)
    const { error: authError } = await admin.auth.admin.deleteUser(userId)
    if (authError) return { error: authError.message }

    revalidatePath('/admin/users')
    revalidatePath('/admin/stores')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}
