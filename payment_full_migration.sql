-- ============================================================
-- PAPOLA — Migración Completa de Pagos + R4 Integration
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- ============================================================

-- ============================================================
-- 1. Agregar campos de pago y descuento a orders
-- ============================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 4);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_in_ves DECIMAL(15, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- Campos de pago R4 (se llenan cuando R4 envía R4notifica)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_bank TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_network_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_concept TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id_card TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_datetime TIMESTAMPTZ;

-- ============================================================
-- 2. Status constraint — TODOS los statuses del sistema
-- ============================================================

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',              -- Orden creada (cash/c2p)
    'pending_payment',      -- Esperando pago móvil (R4 aún no confirma)
    'authorized',           -- R4consulta confirmó que existe el pago
    'paid',                 -- Pago confirmado (manual o c2p)
    'accepted',             -- R4notifica confirmó + tienda acepta
    'preparing',            -- Tienda preparando pedido
    'ready_for_pickup',     -- Listo para recoger
    'ready_for_delivery',   -- Listo para enviar
    'picked_up',            -- Recogido por el cliente
    'out_for_delivery',     -- En camino (delivery)
    'delivered',            -- Entregado
    'completed',            -- Completado
    'rejected',             -- Rechazado por la tienda
    'cancelled',            -- Cancelado por el cliente
    'expired'               -- Expirado (5 min sin pago)
  ));

-- ============================================================
-- 3. Balance de tiendas
-- ============================================================

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS balance DECIMAL(15,2) DEFAULT 0;

-- ============================================================
-- 4. Tabla exchange_rates (tasas de cambio BCV)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_pair TEXT NOT NULL DEFAULT 'USD_VES',
  rate DECIMAL(15, 4) NOT NULL,
  source TEXT DEFAULT 'BCV',
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair
  ON public.exchange_rates(currency_pair, fetched_at DESC);

-- ============================================================
-- 5. Tabla platform_balances (comisiones Papola)
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
-- 6. Tabla payment_transactions (audit trail)
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
-- 7. Índices para performance
-- ============================================================

-- Índice para búsqueda rápida de R4 webhooks (cédula + status + método)
CREATE INDEX IF NOT EXISTS idx_orders_payment_lookup
  ON public.orders (payment_id_card, status, payment_method);

-- Índice para orders con deals
CREATE INDEX IF NOT EXISTS idx_orders_deal_id
  ON public.orders(deal_id) WHERE deal_id IS NOT NULL;

-- ============================================================
-- 8. RLS (Row Level Security)
-- ============================================================

-- exchange_rates: cualquiera puede leer, solo admins insertan
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view exchange rates') THEN
    CREATE POLICY "Anyone can view exchange rates" ON public.exchange_rates
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage exchange rates') THEN
    CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- platform_balances: solo service_role puede leer/escribir
ALTER TABLE public.platform_balances ENABLE ROW LEVEL SECURITY;

-- payment_transactions: service_role inserta, store owners leen las suyas
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can view their payment transactions') THEN
    CREATE POLICY "Store owners can view their payment transactions"
      ON public.payment_transactions
      FOR SELECT
      USING (store_id IN (
        SELECT id FROM public.stores WHERE owner_id = auth.uid()
      ));
  END IF;
END $$;

-- orders: RLS para store owners y customers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can view store orders') THEN
    CREATE POLICY "Store owners can view store orders" ON public.orders
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can update order status') THEN
    CREATE POLICY "Store owners can update order status" ON public.orders
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Customers can create orders') THEN
    CREATE POLICY "Customers can create orders" ON public.orders
      FOR INSERT WITH CHECK (customer_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 9. Habilitar realtime para orders
-- ============================================================

-- Puede fallar si ya está habilitado, ignorar el error
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
