-- Habilitar extensión para UUIDs (identificadores únicos)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de PERFILES DE USUARIO (Se sincroniza con Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  phone_number TEXT,
  role TEXT CHECK (role IN ('admin', 'store_owner', 'customer', 'driver')) DEFAULT 'customer',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de TIENDAS
CREATE TABLE public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- Para URLs amigables (ej: papola.com/tienda/pizzahut)
  description TEXT,
  logo_url TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de PRODUCTOS
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL, -- Manejo de dinero seguro
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de PEDIDOS (La más importante)
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) NOT NULL,
  store_id UUID REFERENCES public.stores(id) NOT NULL,
  driver_id UUID REFERENCES public.profiles(id), -- Puede ser NULL al inicio
  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('pending', 'paid', 'preparing', 'picked_up', 'delivered', 'cancelled')) DEFAULT 'pending',
  payment_reference TEXT, -- Aquí guardamos el ID de la transacción del banco
  delivery_address TEXT NOT NULL,
  delivery_coordinates POINT, -- Latitud y Longitud para el mapa
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de DETALLE DEL PEDIDO (Qué compró exactamente)
CREATE TABLE public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL -- Guardamos el precio al momento de la compra (por si cambia después)
);

-- POLÍTICAS DE SEGURIDAD (Row Level Security - RLS)
-- Esto asegura que nadie vea datos que no le corresponden

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Ejemplo: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Ejemplo: Los usuarios pueden ver sus propias órdenes
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = customer_id);
