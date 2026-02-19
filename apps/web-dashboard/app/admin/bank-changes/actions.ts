'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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

async function sendBankChangeEmail(
  storeOwnerId: string,
  storeName: string,
  status: 'approved' | 'rejected',
) {
  if (!resend) return // Skip if no API key configured

  const admin = createAdminClient()
  const { data: owner } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', storeOwnerId)
    .single()

  if (!owner?.email) return

  const isApproved = status === 'approved'
  const subject = isApproved
    ? `Cuenta bancaria actualizada - ${storeName}`
    : `Solicitud de cambio de cuenta rechazada - ${storeName}`

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Papola</h1>
      </div>
      <div style="padding: 24px; background: #f9fafb; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #111827;">Hola ${owner.full_name || 'Afiliado'},</p>
        ${isApproved
          ? `<p style="color: #374151;">Tus datos bancarios para <strong>${storeName}</strong> han sido <span style="color: #059669; font-weight: bold;">actualizados correctamente</span>.</p>
             <p style="color: #374151;">La cuenta bancaria registrada en tu perfil ya refleja los nuevos datos. A partir de ahora, tus pagos serán depositados en la nueva cuenta.</p>
             <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 16px;">
               <p style="color: #92400e; font-size: 14px; margin: 0;"><strong>Aviso de seguridad:</strong> Recientemente se solicit&oacute; un cambio en los datos bancarios de tu perfil en Papola. Si no fuiste t&uacute; quien realiz&oacute; esta solicitud, por favor contacta inmediatamente al equipo de Papola a trav&eacute;s del sistema de soporte.</p>
             </div>`
          : `<p style="color: #374151;">Tu solicitud de cambio de cuenta bancaria para <strong>${storeName}</strong> ha sido <span style="color: #dc2626; font-weight: bold;">rechazada</span>.</p>
             <p style="color: #374151;">Los datos bancarios de tu perfil no han sido modificados. Si consideras que se trata de un error o deseas m&aacute;s informaci&oacute;n, puedes contactarnos a trav&eacute;s del sistema de soporte en la plataforma.</p>`
        }
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">— Equipo Papola</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">Este es un mensaje autom&aacute;tico, por favor no respondas a este correo.</p>
      </div>
    </div>
  `

  try {
    await resend.emails.send({
      from: 'Papola <no-reply@papolaapp.com>',
      to: owner.email,
      subject,
      html,
    })
  } catch (e) {
    console.error('Error sending bank change email:', e)
  }
}

export async function approveBankChange(changeId: string): Promise<{ error?: string }> {
  try {
    const adminUserId = await assertAdmin()
    const admin = createAdminClient()

    // Fetch the change request
    const { data: change, error: fetchError } = await admin
      .from('bank_account_changes')
      .select('*, stores(name, owner_id)')
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

    // Send email notification
    const store = change.stores as unknown as { name: string; owner_id: string } | null
    if (store) {
      await sendBankChangeEmail(store.owner_id, store.name, 'approved')
    }

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

    // Fetch store info for email
    const { data: change } = await admin
      .from('bank_account_changes')
      .select('*, stores(name, owner_id)')
      .eq('id', changeId)
      .single()

    if (!change || change.status !== 'pending') return { error: 'Solicitud no encontrada o ya procesada.' }

    const { error } = await admin
      .from('bank_account_changes')
      .update({
        status: 'rejected',
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', changeId)

    if (error) return { error: error.message }

    // Send email notification
    const store = change.stores as unknown as { name: string; owner_id: string } | null
    if (store) {
      await sendBankChangeEmail(store.owner_id, store.name, 'rejected')
    }

    revalidatePath('/admin/bank-changes')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}

export async function deleteBankChange(changeId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('bank_account_changes')
      .delete()
      .eq('id', changeId)

    if (error) return { error: error.message }

    revalidatePath('/admin/bank-changes')
    return {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NEXT_REDIRECT')) throw e
    return { error: msg }
  }
}
