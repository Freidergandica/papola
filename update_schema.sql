-- Actualización de esquema para soportar Dashboard de Tiendas (Papola)
-- Este script es idempotente: puedes ejecutarlo múltiples veces sin errores.

-- 1. Actualizar tabla 'stores'
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id), -- Relación con el usuario dueño
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS schedule TEXT, -- Puede ser JSON o Texto libre
ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Actualizar tabla 'products'
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2), -- Para mostrar descuento (precio tachado)
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[]; -- Array de URLs para galería de imágenes

-- 3. Configurar RLS (Row Level Security) de forma segura
-- Primero habilitamos RLS por si no estaba
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Eliminamos políticas existentes para evitar el error "policy already exists" (42710)
DROP POLICY IF EXISTS "Public stores are viewable by everyone" ON public.stores;
DROP POLICY IF EXISTS "Store Owners can update own store" ON public.stores;
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Store Owners can manage own products" ON public.products;

-- 4. Crear Políticas Nuevamente

-- Stores: Todos pueden ver las tiendas
CREATE POLICY "Public stores are viewable by everyone" 
ON public.stores FOR SELECT 
USING (true);

-- Stores: Solo el dueño puede editar su tienda
CREATE POLICY "Store Owners can update own store" 
ON public.stores FOR UPDATE 
USING (auth.uid() = owner_id);

-- Stores: Usuarios autenticados pueden crear su propia tienda
DROP POLICY IF EXISTS "Users can create their own store" ON public.stores;
CREATE POLICY "Users can create their own store" 
ON public.stores FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Products: Todos pueden ver los productos
CREATE POLICY "Public products are viewable by everyone" 
ON public.products FOR SELECT 
USING (true);

-- Products: Los dueños pueden gestionar (crear/editar/borrar) productos de sus tiendas
CREATE POLICY "Store Owners can manage own products" 
ON public.products FOR ALL 
USING (
  store_id IN (
    SELECT id FROM public.stores WHERE owner_id = auth.uid()
  )
);

-- 5. Configurar RLS para Profiles (necesario para el registro)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);
