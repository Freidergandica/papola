-- =============================================================================
-- Migración: 4 gaps (push_tokens, expires_at, índices)
-- Fecha: Feb 20, 2026
-- =============================================================================

-- 1. Tabla push_tokens para Expo Push Notifications
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT DEFAULT 'mobile',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- RLS para push_tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden gestionar sus propios tokens
CREATE POLICY "Users manage own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- Service role tiene acceso total (para enviar desde el API server)
CREATE POLICY "Service role full access push_tokens"
  ON push_tokens FOR ALL
  USING (true)
  WITH CHECK (true);

-- Índice para buscar tokens por usuario
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- 2. Columna expires_at en orders para expiración persistente (DB-based)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Índice para el polling de órdenes expiradas
CREATE INDEX IF NOT EXISTS idx_orders_expires_at
  ON orders(expires_at)
  WHERE status = 'pending_payment' AND expires_at IS NOT NULL;

-- 3. Setear expires_at en órdenes pending_payment existentes que no lo tengan
-- (por si hay órdenes viejas sin expires_at que quedaron en pending_payment)
UPDATE orders
SET status = 'expired', expires_at = NULL
WHERE status = 'pending_payment'
  AND expires_at IS NULL
  AND created_at < NOW() - INTERVAL '5 minutes';
