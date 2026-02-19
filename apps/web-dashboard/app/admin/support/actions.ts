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

export async function updateTicketStatus(ticketId: string, status: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('support_tickets')
      .update({ status })
      .eq('id', ticketId)

    if (error) return { error: error.message }

    revalidatePath('/admin/support')
    revalidatePath(`/admin/support/${ticketId}`)
    return {}
  } catch {
    return { error: 'Error actualizando estado del ticket' }
  }
}
