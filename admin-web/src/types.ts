export interface User {
  id: number
  email?: string
  full_name: string
  role: string
  is_active: boolean
}

export interface DashboardStats {
  total_farmers: number
  pending_farmers: number
  approved_farmers: number
  rejected_farmers: number
  total_customers: number
  total_products: number
  orders_today: number
  total_orders: number
  total_revenue: number
  revenue_today: number
  revenue_this_month: number
  low_stock_count: number
  top_products: {
    id: string
    name_en: string
    category: string
    total_ratings: number
  }[]
  recent_orders: {
    id: string
    customer: string
    amount: number
    status: string
    created_at: string
  }[]
}

export interface Farmer {
  id: string
  full_name: string
  phone: string
  email?: string
  is_active: boolean
  member_since: string
  is_new: boolean
  approval_status: string
  rating: number
  district: string
  taluka: string
  village: string
  farm_size_acres: number
  produce_types: string[]
  bio?: string
  rejection_reason?: string
  total_orders_fulfilled: number
  profile_photo_url?: string
}

export interface Product {
  id: string
  name_en: string
  name_mr: string
  category: string
  price_per_unit: number
  unit: string
  stock_quantity: number
  is_organic: boolean
  is_active: boolean
}

export interface Order {
  id: number
  order_id: string
  status: string
  total_amount: number
  created_at: string
  customer: {
    id: number
    full_name: string
    phone: string
  }
  items: {
    id: number
    product_name: string
    quantity: number
    unit_price: number
  }[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}
