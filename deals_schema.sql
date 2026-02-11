-- ============================================
-- PAPOLA - Sistema de Ofertas/Descuentos
-- ============================================

-- 1. Tabla principal de OFERTAS/DEALS
CREATE TABLE public.deals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) NOT NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Tipo y valor del descuento
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'coupon')) NOT NULL,
  discount_value DECIMAL(10, 2), -- Porcentaje o monto fijo
  buy_quantity INTEGER, -- Para buy_x_get_y: compra X
  get_quantity INTEGER, -- Para buy_x_get_y: lleva Y
  coupon_code TEXT UNIQUE, -- Codigo unico para cupones

  -- A que aplica
  applies_to TEXT CHECK (applies_to IN ('all_products', 'specific_products', 'category')) DEFAULT 'all_products',
  category TEXT, -- Si applies_to = 'category'

  -- Temporalidad
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  is_flash_deal BOOLEAN DEFAULT false,

  -- Limites
  max_redemptions INTEGER, -- NULL = ilimitado
  current_redemptions INTEGER DEFAULT 0,
  min_order_amount DECIMAL(10, 2),

  -- Moneda y estado
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false, -- Requiere aprobacion de admin

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Junction table para deals de productos especificos
CREATE TABLE public.deal_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(deal_id, product_id)
);

-- 3. Tracking de canjes/redenciones
CREATE TABLE public.deal_redemptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  customer_id UUID REFERENCES public.profiles(id) NOT NULL,
  discount_applied DECIMAL(10, 2) NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices para performance
CREATE INDEX idx_deals_store_id ON public.deals(store_id);
CREATE INDEX idx_deals_coupon_code ON public.deals(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX idx_deals_active ON public.deals(is_active, is_approved) WHERE is_active = true AND is_approved = true;
CREATE INDEX idx_deals_flash ON public.deals(is_flash_deal, ends_at) WHERE is_flash_deal = true;
CREATE INDEX idx_deals_featured ON public.deals(is_featured) WHERE is_featured = true;
CREATE INDEX idx_deal_products_deal_id ON public.deal_products(deal_id);
CREATE INDEX idx_deal_redemptions_deal_id ON public.deal_redemptions(deal_id);
CREATE INDEX idx_deal_redemptions_customer_id ON public.deal_redemptions(customer_id);

-- RLS Policies
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_redemptions ENABLE ROW LEVEL SECURITY;

-- Deals: lectura publica de deals activos y aprobados
CREATE POLICY "Anyone can view active approved deals" ON public.deals
  FOR SELECT USING (is_active = true AND is_approved = true);

-- Deals: store owners pueden ver sus propios deals (incluso no aprobados)
CREATE POLICY "Store owners can view own deals" ON public.deals
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.stores WHERE stores.id = deals.store_id AND stores.owner_id = auth.uid()
    )
  );

-- Deals: admins pueden ver todos
CREATE POLICY "Admins can view all deals" ON public.deals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Deals: store owners pueden crear deals para su tienda
CREATE POLICY "Store owners can create deals" ON public.deals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores WHERE stores.id = deals.store_id AND stores.owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Deals: store owners pueden actualizar sus deals
CREATE POLICY "Store owners can update own deals" ON public.deals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.stores WHERE stores.id = deals.store_id AND stores.owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Deal products: lectura publica
CREATE POLICY "Anyone can view deal products" ON public.deal_products
  FOR SELECT USING (true);

-- Deal products: owners/admins pueden gestionar
CREATE POLICY "Store owners can manage deal products" ON public.deal_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.deals
      JOIN public.stores ON stores.id = deals.store_id
      WHERE deals.id = deal_products.deal_id AND stores.owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Redemptions: usuarios pueden ver sus propias redenciones
CREATE POLICY "Users can view own redemptions" ON public.deal_redemptions
  FOR SELECT USING (customer_id = auth.uid());

-- Redemptions: store owners pueden ver redenciones de sus deals
CREATE POLICY "Store owners can view deal redemptions" ON public.deal_redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deals
      JOIN public.stores ON stores.id = deals.store_id
      WHERE deals.id = deal_redemptions.deal_id AND stores.owner_id = auth.uid()
    )
  );

-- Redemptions: usuarios pueden canjear
CREATE POLICY "Users can redeem deals" ON public.deal_redemptions
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Storage bucket para imagenes de deals
INSERT INTO storage.buckets (id, name, public) VALUES ('deals', 'deals', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view deal images" ON storage.objects
  FOR SELECT USING (bucket_id = 'deals');

CREATE POLICY "Authenticated users can upload deal images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'deals' AND auth.role() = 'authenticated');

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_deals_updated_at();

-- Habilitar realtime para deals
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
