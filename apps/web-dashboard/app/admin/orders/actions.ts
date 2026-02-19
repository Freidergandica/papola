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

  if (profile?.role !== 'admin' && profile?.role !== 'sales_manager') redirect('/login')
}

export async function updateOrderStatus(orderId: string, status: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    const validStatuses = [
      'pending', 'paid', 'accepted', 'preparing',
      'ready_for_pickup', 'ready_for_delivery',
      'out_for_delivery', 'delivered', 'completed', 'cancelled',
    ]

    if (!validStatuses.includes(status)) {
      return { error: 'Estado inválido' }
    }

    const { error } = await admin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) return { error: error.message }

    revalidatePath('/admin/orders')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}
