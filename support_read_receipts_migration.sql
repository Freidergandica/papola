-- Support Chat: Read Receipts
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna read_at a support_messages
ALTER TABLE public.support_messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Permitir UPDATE en support_messages (para marcar como leído)
-- Los usuarios pueden actualizar read_at en mensajes de sus tickets
CREATE POLICY "Users can mark messages as read in own tickets" ON public.support_messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_messages.ticket_id
    AND t.user_id = auth.uid()
  )
);

-- Los admins pueden marcar mensajes como leído en cualquier ticket
CREATE POLICY "Admins can mark messages as read" ON public.support_messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);
