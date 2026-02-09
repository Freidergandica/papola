-- Datos de prueba para Papola App
-- Ejecuta este script en el Editor SQL de Supabase para tener datos iniciales

-- 1. Crear Restaurantes (Stores)
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
  );

-- 2. Crear Productos (Products) para Burger King
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
  );

-- 2. Crear Productos (Products) para Pizza Hut
INSERT INTO public.products (store_id, name, description, price, image_url, category, is_available)
VALUES
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Pizza Pepperoni',
    'Masa tradicional con salsa de tomate, queso mozzarella y pepperoni.',
    12.99,
    'https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=1000&auto=format&fit=crop',
    'Pizzas',
    true
  );

-- 2. Crear Productos (Products) para Sushi Market
INSERT INTO public.products (store_id, name, description, price, image_url, category, is_available)
VALUES
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'California Roll',
    'Cangrejo, aguacate y pepino. 10 piezas.',
    9.50,
    'https://images.unsplash.com/photo-1617196019294-dcce4747b637?q=80&w=1000&auto=format&fit=crop',
    'Rolls',
    true
  );
