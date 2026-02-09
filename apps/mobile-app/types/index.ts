export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
  role: 'customer' | 'driver' | 'admin';
}

export interface Store {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  address?: string;
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
  image_url?: string;
  category?: string;
  is_available: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}
