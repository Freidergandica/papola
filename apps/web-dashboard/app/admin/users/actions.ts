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

    // Helper: ejecuta delete/update y retorna error si falla
    const del = async (table: string, col: string, val: string | string[], op: 'eq' | 'in' = 'eq') => {
      const q = op === 'in'
        ? admin.from(table).delete().in(col, val as string[])
        : admin.from(table).delete().eq(col, val as string)
      const { error } = await q
      if (error) throw new Error(`Error eliminando ${table}.${col}: ${error.message}`)
    }

    // 1. bank_account_changes (RESTRICT en requested_by y reviewed_by)
    await del('bank_account_changes', 'requested_by', userId)
    await admin.from('bank_account_changes').update({ reviewed_by: null }).eq('reviewed_by', userId)

    // 2. support_tickets + messages (CASCADE, pero eliminamos explícitamente por seguridad)
    const { data: userTickets } = await admin.from('support_tickets').select('id').eq('user_id', userId)
    if (userTickets && userTickets.length > 0) {
      const ticketIds = userTickets.map(t => t.id)
      await del('support_messages', 'ticket_id', ticketIds, 'in')
      await del('support_tickets', 'user_id', userId)
    }
    // Mensajes donde el usuario es sender en tickets de otros
    await admin.from('support_messages').delete().eq('sender_id', userId)

    // 3. deal_redemptions del usuario como customer
    await del('deal_redemptions', 'customer_id', userId)

    // 4. deals creados por el usuario (deal_products tiene CASCADE en deal_id)
    const { data: userDeals } = await admin.from('deals').select('id').eq('created_by', userId)
    if (userDeals && userDeals.length > 0) {
      const dealIds = userDeals.map(d => d.id)
      await del('deal_redemptions', 'deal_id', dealIds, 'in')
      await del('deals', 'created_by', userId)
    }

    // 5. orders como cliente → payment_transactions, order_items, luego orders
    const { data: userOrders } = await admin.from('orders').select('id').eq('customer_id', userId)
    if (userOrders && userOrders.length > 0) {
      const orderIds = userOrders.map(o => o.id)
      await del('payment_transactions', 'order_id', orderIds, 'in')
      await del('order_items', 'order_id', orderIds, 'in')
    }
    await admin.from('orders').delete().eq('customer_id', userId)

    // 6. orders como driver → nullificar
    await admin.from('orders').update({ driver_id: null }).eq('driver_id', userId)

    // 7. stores del usuario (cascade completo)
    const { data: userStores } = await admin.from('stores').select('id').eq('owner_id', userId)
    if (userStores && userStores.length > 0) {
      const storeIds = userStores.map(s => s.id)

      // payment_transactions de la tienda
      await del('payment_transactions', 'store_id', storeIds, 'in')

      // orders de la tienda → order_items primero
      const { data: storeOrders } = await admin.from('orders').select('id').in('store_id', storeIds)
      if (storeOrders && storeOrders.length > 0) {
        const storeOrderIds = storeOrders.map(o => o.id)
        await del('payment_transactions', 'order_id', storeOrderIds, 'in')
        await del('order_items', 'order_id', storeOrderIds, 'in')
        await admin.from('orders').delete().in('store_id', storeIds)
      }

      // productos
      await del('products', 'store_id', storeIds, 'in')

      // deals de la tienda → deal_redemptions primero
      const { data: storeDeals } = await admin.from('deals').select('id').in('store_id', storeIds)
      if (storeDeals && storeDeals.length > 0) {
        const storeDealIds = storeDeals.map(d => d.id)
        await del('deal_redemptions', 'deal_id', storeDealIds, 'in')
        await admin.from('deals').delete().in('store_id', storeIds)
      }

      // bank_account_changes de la tienda
      await admin.from('bank_account_changes').delete().in('store_id', storeIds)

      // finalmente las tiendas
      await admin.from('stores').delete().eq('owner_id', userId)
    }

    // 8. addresses
    await del('addresses', 'user_id', userId)

    // 9. Eliminar el usuario de auth (cascade a profiles)
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
