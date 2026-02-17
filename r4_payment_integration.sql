-- R4 Payment Integration Migration
-- Migrates the payment flow from Legacy to Supabase + NestJS

-- ============================================================
-- 1. Add missing columns to orders (used by existing code)
-- ============================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_in_ves NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deal_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- ============================================================
-- 2. Update orders.status CHECK constraint to include new statuses
-- ============================================================

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'pending_payment', 'authorized', 'paid', 'accepted', 'preparing', 'picked_up', 'delivered', 'rejected', 'cancelled', 'expired'));

-- ============================================================
-- 3. Add payment columns to orders
-- ============================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_bank TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_network_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_concept TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id_card TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_datetime TIMESTAMPTZ;

-- ============================================================
-- 4. Add balance to stores
-- ============================================================

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS balance DECIMAL(15,2) DEFAULT 0;

-- ============================================================
-- 5. Create platform_balances table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_balances (
  key TEXT PRIMARY KEY,
  value DECIMAL(15,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial rows
INSERT INTO public.platform_balances (key, value)
VALUES
  ('available_balance', 0),
  ('accounting_balance', 0)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 6. Create payment_transactions table (audit trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  gross_amount DECIMAL(15,2) NOT NULL,
  fee_percentage DECIMAL(5,2) NOT NULL,
  fee_amount DECIMAL(15,2) NOT NULL,
  net_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. Index for fast webhook lookup
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_payment_lookup
  ON public.orders (payment_id_card, status, payment_method);

-- ============================================================
-- 8. RLS on new tables
-- ============================================================

-- platform_balances: only service_role can read/write
ALTER TABLE public.platform_balances ENABLE ROW LEVEL SECURITY;

-- payment_transactions: only service_role can insert; store owners can read their own
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view their payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (store_id IN (
    SELECT id FROM public.stores WHERE owner_id = auth.uid()
  ));
