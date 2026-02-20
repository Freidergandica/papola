import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export function useSupportMessages(
  ticketId: string | null,
  onNewMessage: (message: SupportMessage) => void,
  onMessageUpdate?: (message: SupportMessage) => void,
  onTyping?: (userId: string) => void,
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          onMessageUpdate?.(payload.new as SupportMessage);
        },
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId) {
          onTyping?.(payload.userId);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, onNewMessage, onMessageUpdate, onTyping]);
}
