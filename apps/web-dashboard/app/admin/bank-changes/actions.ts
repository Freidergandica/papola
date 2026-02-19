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
  return user.id
}

export async function approveBankChange(changeId: string): Promise<{ error?: string }> {
  try {
    const adminUserId = await assertAdmin()
    const admin = createAdminClient()

    // Fetch the change request
    const { data: change, error: fetchError } = await admin
      .from('bank_account_changes')
      .select('*')
      .eq('id', changeId)
      .single()

    if (fetchError || !change) return { error: 'Solicitud no encontrada.' }
    if (change.status !== 'pending') return { error: 'Esta solicitud ya fue procesada.' }

    // Update the store with the new bank data
    const { error: storeError } = await admin
      .from('stores')
      .update({
        bank_name: change.new_bank_name,
        bank_account_number: change.new_account_number,
        bank_account_holder_id: change.new_account_holder_id,
        bank_account_type: change.new_account_type,
      })
      .eq('id', change.store_id)

    if (storeError) return { error: storeError.message }

    // Mark as approved
    const { error: updateError } = await admin
      .from('bank_account_changes')
      .update({
        status: 'approved',
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', changeId)

    if (updateError) return { error: updateError.message }

    revalidatePath('/admin/bank-changes')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}

export async function rejectBankChange(changeId: string): Promise<{ error?: string }> {
  try {
    const adminUserId = await assertAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('bank_account_changes')
      .update({
        status: 'rejected',
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', changeId)
      .eq('status', 'pending')

    if (error) return { error: error.message }

    revalidatePath('/admin/bank-changes')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}
