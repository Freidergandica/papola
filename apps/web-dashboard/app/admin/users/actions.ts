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
