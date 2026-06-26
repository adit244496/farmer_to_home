export interface User {
  id: number;
  phone?: string;
  email?: string;
  full_name: string;
  role: 'customer' | 'farmer' | 'admin';
  profile_photo?: string;
  language_preference: 'mr' | 'en';
  is_active: boolean;
  date_joined: string;
}

export interface Customer extends User {
  addresses: Address[];
  total_orders: number;
}

export interface Farmer {
  id: number;
  user: User;
  full_name: string;
  phone: string;
  profile_photo?: string;
  district: string;
  taluka: string;
  village: string;
  farm_size_acres: number;
  produce_types: string[];
  aadhaar_number?: string;
  bank_account?: string;
  bank_ifsc?: string;
  bank_name?: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejection_reason?: string;
  bio?: string;
  farm_description?: string;
  rating: number;
  total_ratings: number;
  total_orders_fulfilled: number;
  member_since: string;
  is_new: boolean;
}

export interface Address {
  id: number;
  recipient_name: string;
  phone: string;
  house_no: string;
  area: string;
  city: string;
  pin_code: string;
  state: string;
  is_default: boolean;
}

export interface Product {
  id: number;
  farmer: {
    id: number;
    full_name: string;
    district: string;
    village: string;
    profile_photo?: string;
    rating: number;
    total_ratings: number;
  };
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
  original_price?: number;
  discount_percent?: number;
  delivery_mins?: number;
  harvest_date?: string;
  best_before_date?: string;
  images: ProductImage[];
  tags: string[];
  benefits?: string[];
  rating: number;
  total_ratings: number;
  created_at: string;
}

export interface ProductImage {
  id: number;
  image_url: string;
  is_primary: boolean;
  order: number;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  promo_code?: string;
  discount_amount: number;
  subtotal: number;
  delivery_charge: number;
  total_amount: number;
}

export interface Order {
  id: number;
  order_id: string;
  customer: {
    id: number;
    full_name: string;
    phone: string;
  };
  items: OrderItem[];
  status: OrderStatus;
  payment_method: 'cod' | 'upi' | 'card' | 'netbanking';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  delivery_address: Address;
  subtotal: number;
  delivery_charge: number;
  discount_amount: number;
  total_amount: number;
  promo_code?: string;
  tracking_number?: string;
  carrier?: string;
  placed_at: string;
  confirmed_at?: string;
  packed_at?: string;
  dispatched_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  estimated_delivery?: string;
  razorpay_order_id?: string;
}

export interface OrderItem {
  id: number;
  product: Product;
  farmer: {
    id: number;
    full_name: string;
  };
  quantity: number;
  unit_price: number;
  subtotal: number;
  review?: Review;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'dispatched'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface Review {
  id: number;
  customer: {
    id: number;
    full_name: string;
    profile_photo?: string;
  };
  product: number;
  rating: number;
  comment: string;
  photos?: string[];
  created_at: string;
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  type: 'order' | 'promotion' | 'farmer' | 'system' | 'alert';
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface FarmerDashboard {
  today_orders: number;
  pending_dispatch: number;
  today_earnings: number;
  month_earnings: number;
  gross_earnings: number;
  commission_rate: number;
  net_payout: number;
  rating: number;
  total_ratings: number;
  low_stock_products: Product[];
  recent_orders: Order[];
}

export interface AdminDashboard {
  total_farmers: number;
  pending_farmers: number;
  approved_farmers: number;
  rejected_farmers: number;
  total_customers: number;
  orders_today: number;
  total_revenue: number;
  low_stock_count: number;
  top_products: Product[];
}

export interface Analytics {
  period: string;
  revenue: number;
  orders_count: number;
  avg_order_value: number;
  sales_by_category: Array<{ category: string; amount: number; percentage: number }>;
  top_farmers: Array<{ farmer: Farmer; total_sales: number; orders: number }>;
  top_products: Array<{ product: Product; quantity_sold: number; revenue: number }>;
  new_customers: number;
}

export interface PromoCode {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

export interface Earnings {
  gross_earnings: number;
  commission: number;
  commission_rate: number;
  net_payout: number;
  month_breakdown: Array<{
    month: string;
    year: number;
    gross: number;
    commission: number;
    net: number;
  }>;
  transactions: Array<{
    id: number;
    date: string;
    amount: number;
    type: 'payout' | 'deduction';
    description: string;
  }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  message: string;
  detail?: string;
  errors?: Record<string, string[]>;
}
