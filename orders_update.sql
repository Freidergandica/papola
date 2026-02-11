-- ============================================
-- PAPOLA - Actualizacion de Orders + Exchange Rates
-- ============================================

-- Agregar campos de pago y descuento a orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('c2p', 'pago_movil', 'cash')),
  ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD' CHECK (payment_currency IN ('USD', 'VES')),
  ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 4),
  ADD COLUMN IF NOT EXISTS amount_in_ves DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- Actualizar el CHECK de status para incluir mas estados
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'paid', 'accepted', 'preparing',
    'ready_for_pickup', 'ready_for_delivery',
    'picked_up', 'out_for_delivery',
    'delivered', 'completed', 'cancelled', 'expired'
  ));

-- Tabla de tasas de cambio
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  currency_pair TEXT NOT NULL DEFAULT 'USD_VES',
  rate DECIMAL(15, 4) NOT NULL,
  source TEXT DEFAULT 'BCV',
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON public.exchange_rates(currency_pair, fetched_at DESC);

-- RLS para exchange_rates
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer tasas de cambio
CREATE POLICY "Anyone can view exchange rates" ON public.exchange_rates
  FOR SELECT USING (true);

-- Solo admins pueden insertar tasas
CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indice para buscar orders con deals
CREATE INDEX IF NOT EXISTS idx_orders_deal_id ON public.orders(deal_id) WHERE deal_id IS NOT NULL;

-- RLS adicional para orders: store owners pueden ver pedidos de su tienda
CREATE POLICY "Store owners can view store orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()
    )
  );

-- Store owners pueden actualizar status de pedidos de su tienda
CREATE POLICY "Store owners can update order status" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()
    )
  );

-- Customers pueden crear pedidos
CREATE POLICY "Customers can create orders" ON public.orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Habilitar realtime para orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
