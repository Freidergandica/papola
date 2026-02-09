export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
  role: 'customer' | 'driver' | 'admin' | 'store_owner';
}

export interface Store {
  id: string;
  owner_id?: string; // Link to Profile
  name: string;
  description?: string;
  image_url?: string; // Logo
  address?: string;
  phone?: string;
  schedule?: string;
  category?: string;
  rating?: number;
  delivery_time_min?: number;
  delivery_time_max?: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number; // Precio antes del descuento
  image_url?: string; // Imagen principal (portada)
  images?: string[]; // Galería de imágenes
  category?: string;
  stock?: number;
  sku?: string;
  is_available: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  store_id: string;
  total_amount: number;
  status: 'pending' | 'accepted' | 'ready_for_pickup' | 'ready_for_delivery' | 'out_for_delivery' | 'completed' | 'canceled' | 'expired';
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}
