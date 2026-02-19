import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoreSupportPage from '@/components/store/support-page'

export default async function StoreSupport() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('*, support_messages(message, created_at, sender_id)')
    .eq('user_id', user.id)
    .order('last_message_at', { ascending: false })

  return <StoreSupportPage initialTickets={tickets || []} userId={user.id} />
}
