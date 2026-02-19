import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export function useSupportMessages(
  ticketId: string | null,
  onNewMessage: (message: SupportMessage) => void,
) {
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`support-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          onNewMessage(payload.new as SupportMessage);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, onNewMessage]);
}
