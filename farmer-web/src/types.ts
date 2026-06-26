export interface User {
  id: number;
  phone?: string;
  email?: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface FarmerProfile {
  id: number;
  full_name: string;
  phone: string;
  district: string;
  taluka: string;
  village: string;
  farm_size_acres: number;
  produce_types: string[];
  bio?: string;
  farm_description?: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rating: number;
  total_orders_fulfilled: number;
  member_since: string;
}

export interface Product {
  id: number;
  name_en: string;
  name_mr: string;
  description_en?: string;
  description_mr?: string;
  category: string;
  price_per_unit: number;
  unit: string;
  min_order_qty: number;
  stock_quantity: number;
  is_organic: boolean;
  is_active: boolean;
  tags: string[];
  images: { id: number; image_url: string; is_primary: boolean }[];
}

export interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  customer: { id: number; full_name: string; phone: string };
  items: OrderItem[];
  delivery_address?: { area: string; city: string; pin_code: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface EarningsSummary {
  total_earnings: number;
  pending_payout: number;
  orders_count: number;
  avg_order_value: number;
}
