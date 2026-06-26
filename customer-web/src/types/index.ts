export interface User {
  id: number
  phone?: string
  email?: string
  full_name: string
  role: 'customer' | 'farmer' | 'admin'
  profile_photo?: string
  language_preference: 'mr' | 'en'
  is_active: boolean
  date_joined: string
}

export interface Farmer {
  id: number
  full_name: string
  phone: string
  profile_photo?: string
  district: string
  taluka: string
  village: string
  farm_size_acres: number
  produce_types: string[]
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  bio?: string
  farm_description?: string
  rating: number
  total_ratings: number
  total_orders_fulfilled: number
  member_since: string
}

export interface ProductImage {
  id: number
  image_url: string
  is_primary: boolean
}

export interface Product {
  id: number
  farmer: {
    id: number
    full_name: string
    district: string
    village: string
    profile_photo?: string
    rating: number
    total_ratings: number
  }
  name_en: string
  name_mr: string
  description_en?: string
  description_mr?: string
  category: string
  price_per_unit: number
  unit: string
  min_order_qty: number
  stock_quantity: number
  is_organic: boolean
  is_active: boolean
  original_price?: number
  discount_percent?: number
  harvest_date?: string
  best_before_date?: string
  images: ProductImage[]
  tags: string[]
  benefits?: string[]
  rating: number
  total_ratings: number
  created_at: string
}

export interface CartItem {
  id: number
  product: Product
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Address {
  id: number
  label: string
  full_name: string
  phone: string
  line1: string
  line2?: string
  area: string
  city: string
  state: string
  pin_code: string
  is_default: boolean
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'dispatched'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export interface OrderItem {
  id: number
  product: Product
  quantity: number
  unit_price: number
  subtotal: number
  review_submitted: boolean
}

export interface Order {
  id: number
  order_id: string
  items: OrderItem[]
  status: OrderStatus
  payment_method: 'cod' | 'upi' | 'card' | 'netbanking'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  delivery_address: Address
  subtotal: number
  delivery_charge: number
  discount_amount: number
  total_amount: number
  tracking_number?: string
  carrier?: string
  placed_at: string
  delivered_at?: string
}

export interface Review {
  id: number
  customer: { id: number; full_name: string; profile_photo?: string }
  product: number
  rating: number
  comment: string
  photos?: string[]
  created_at: string
}

export interface Notification {
  id: number
  title: string
  body: string
  type: 'order' | 'promotion' | 'farmer' | 'system' | 'alert'
  is_read: boolean
  created_at: string
  data?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  results: T[]
  count: number
  next: string | null
  previous: string | null
}
