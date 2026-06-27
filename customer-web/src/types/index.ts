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
  id?: string
  image_url: string
  is_primary: boolean
  order?: number
}

export interface Product {
  id: string                        // UUID
  name_en: string
  name_mr: string
  description_en?: string
  description_mr?: string
  price: number
  unit: string
  min_order_qty: number
  stock: number
  is_organic: boolean
  status?: string
  primary_image?: string | null
  images: ProductImage[]
  category_slug?: string | null
  benefits?: string[]
  benefits_mr?: string[]
  highlights?: string[] | null
  highlights_mr?: string[] | null
  critical_difference?: string | null
  critical_difference_mr?: string | null
  tags?: string[]
  // List endpoint: flat farmer fields
  farmer_name?: string | null
  farmer_id?: string | null
  farmer_district?: string | null
  farmer_rating?: number | null
  // Detail endpoint: nested farmer object
  farmer?: {
    id: string
    name: string
    district?: string | null
    rating?: number
    photo?: string | null
  } | null
  discount?: {
    discount_percent: number
    valid_from: string | null
    valid_until: string | null
  } | null
  // Ratings (null in list, populated in detail)
  rating?: number | null
  avg_rating?: number | null
  review_count?: number
  harvest_date?: string | null
  best_before_date?: string | null
  created_at?: string
  updated_at?: string
}

export interface CartItem {
  id: string
  product_id: string
  product_name_en: string
  product_name_mr: string
  product_price: number
  product_unit: string
  product_stock: number
  product_min_order_qty: number
  farmer_name: string | null
  primary_image: string | null
  quantity: number
  subtotal: number
  added_at: string
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
  items: T[]
  results?: T[]  // legacy alias
  total: number
  page: number
  page_size: number
  pages: number
}
