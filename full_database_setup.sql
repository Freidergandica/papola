-- SETUP COMPLETO DE LA BASE DE DATOS PAPOLA
-- Ejecuta TODO este script para crear las tablas y datos de prueba

-- ==========================================
-- 1. CREACIÓN DE TABLAS (SCHEMA)
-- ==========================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de PERFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  phone_number TEXT,
  role TEXT CHECK (role IN ('admin', 'store_owner', 'customer', 'driver')) DEFAULT 'customer',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de TIENDAS
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE, 
  description TEXT,
  image_url TEXT,
  address TEXT,
  rating DECIMAL(2, 1) DEFAULT 5.0,
  delivery_time_min INTEGER,
  delivery_time_max INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de PRODUCTOS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  category TEXT,
  stock INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.profiles(id) NOT NULL,
  store_id UUID REFERENCES public.stores(id) NOT NULL,
  driver_id UUID REFERENCES public.profiles(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('pending', 'paid', 'preparing', 'picked_up', 'delivered', 'cancelled')) DEFAULT 'pending',
  payment_reference TEXT,
  delivery_address TEXT NOT NULL,
  delivery_coordinates POINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de DETALLE DEL PEDIDO
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL
);

-- Seguridad (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público para lectura (para que la app pueda leer tiendas y productos)
CREATE POLICY "Public stores are viewable by everyone" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Public products are viewable by everyone" ON public.products FOR SELECT USING (true);

-- ==========================================
-- 2. DATOS DE PRUEBA (SEED DATA)
-- ==========================================

INSERT INTO public.stores (id, name, description, image_url, address, rating, delivery_time_min, delivery_time_max, is_active)
VALUES 
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    'Burger King', 
    'Las mejores hamburguesas a la parrilla desde 1954.', 
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=1000&auto=format&fit=crop', 
    'Av. Principal 123', 
    4.5, 
    25, 
    40, 
    true
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 
    'Pizza Hut', 
    'El sabor de compartir. Pizzas calientes y deliciosas.', 
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000&auto=format&fit=crop', 
    'Calle 50, Plaza Central', 
    4.2, 
    30, 
    50, 
    true
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 
    'Sushi Market', 
    'Sushi fresco y rolls creativos para todos los gustos.', 
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1000&auto=format&fit=crop', 
    'Boulevard Gastronómico', 
    4.8, 
    35, 
    55, 
    true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (store_id, name, description, price, image_url, category, is_available)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Whopper Doble',
    'Dos carnes de res a la parrilla, queso, tomate, lechuga y mayonesa.',
    8.50,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop',
    'Hamburguesas',
    true
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Papas Fritas Medianas',
    'Papas fritas doradas y crujientes.',
    3.50,
    'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?q=80&w=1000&auto=format&fit=crop',
    'Acompañantes',
    true
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Pizza Pepperoni',
    'Masa tradicional con salsa de tomate, queso mozzarella y pepperoni.',
    12.99,
    'https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=1000&auto=format&fit=crop',
    'Pizzas',
    true
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'California Roll',
    'Cangrejo, aguacate y pepino. 10 piezas.',
    9.50,
    'https://images.unsplash.com/photo-1617196019294-dcce4747b637?q=80&w=1000&auto=format&fit=crop',
    'Rolls',
    true
  );
