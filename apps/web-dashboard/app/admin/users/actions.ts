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
  await assertAdmin()
  const admin = createAdminClient()

  // 1. Cambiar rol a store_owner
  const { error: roleError } = await admin
    .from('profiles')
    .update({ role: 'store_owner' })
    .eq('id', userId)

  if (roleError) {
    return { error: roleError.message }
  }

  // 2. Activar su tienda (si tiene una)
  const { error: storeError } = await admin
    .from('stores')
    .update({ is_active: true })
    .eq('owner_id', userId)

  if (storeError) {
    return { error: storeError.message }
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin/stores')
  return {}
}

export async function rejectStoreOwner(userId: string): Promise<{ error?: string }> {
  await assertAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ role: 'customer' })
    .eq('id', userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/users')
  return {}
}

export async function changeUserRole(userId: string, newRole: string): Promise<{ error?: string }> {
  await assertAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/users')
  return {}
}
