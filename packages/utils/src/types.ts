export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  identification_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  avatar_url?: string;
  phone_number?: string;
  role: 'customer' | 'driver' | 'admin' | 'store_owner' | 'pending_store_owner';
  created_at?: string;
}

export interface Store {
  id: string;
  owner_id?: string;
  name: string;
  description?: string;
  image_url?: string;
  address?: string;
  phone?: string;
  schedule?: string;
  category?: string;
  rating?: number;
  delivery_time_min?: number;
  delivery_time_max?: number;
  latitude?: number;
  longitude?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder_id?: string;
  bank_account_type?: 'corriente' | 'ahorro';
  is_active: boolean;
  created_at?: string;
}

export interface BankAccountChange {
  id: string;
  store_id: string;
  requested_by: string;
  new_bank_name: string;
  new_account_number: string;
  new_account_holder_id: string;
  new_account_type: 'corriente' | 'ahorro';
  old_bank_name?: string;
  old_account_number?: string;
  old_account_holder_id?: string;
  old_account_type?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  stores?: { name: string };
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  image_url?: string;
  images?: string[];
  category?: string;
  stock?: number;
  sku?: string;
  is_available: boolean;
  created_at?: string;
}

export interface Order {
  id: string;
  user_id?: string;
  customer_id?: string;
  store_id: string;
  driver_id?: string;
  total_amount: number;
  currency?: string;
  status:
    | 'pending'
    | 'pending_payment'
    | 'authorized'
    | 'paid'
    | 'accepted'
    | 'preparing'
    | 'ready_for_pickup'
    | 'ready_for_delivery'
    | 'picked_up'
    | 'out_for_delivery'
    | 'delivered'
    | 'completed'
    | 'canceled'
    | 'cancelled'
    | 'expired';
  payment_reference?: string;
  payment_method?: 'c2p' | 'pago_movil' | 'cash';
  payment_currency?: 'USD' | 'VES';
  exchange_rate?: number;
  amount_in_ves?: number;
  payment_id_card?: string;
  deal_id?: string;
  discount_amount?: number;
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  created_at?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price?: number;
  unit_price?: number;
  product?: Product;
}

export interface CartItem extends Product {
  quantity: number;
}

export type DiscountType = 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'coupon';
export type DealAppliesTo = 'all_products' | 'specific_products' | 'category';

export interface Deal {
  id: string;
  store_id: string;
  created_by: string;
  title: string;
  description?: string;
  image_url?: string;
  discount_type: DiscountType;
  discount_value?: number;
  buy_quantity?: number;
  get_quantity?: number;
  coupon_code?: string;
  applies_to: DealAppliesTo;
  category?: string;
  starts_at: string;
  ends_at?: string;
  is_flash_deal: boolean;
  max_redemptions?: number;
  current_redemptions: number;
  min_order_amount?: number;
  currency: string;
  is_active: boolean;
  is_featured: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  store?: Store;
  products?: Product[];
}

export interface DealRedemption {
  id: string;
  deal_id: string;
  order_id?: string;
  customer_id: string;
  discount_applied: number;
  redeemed_at: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  reference?: string;
  is_primary: boolean;
  created_at?: string;
}

export interface ExchangeRate {
  id: string;
  currency_pair: string;
  rate: number;
  source: string;
  fetched_at: string;
}
