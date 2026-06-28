import api from '@/lib/api'
import type { Order, CartItem, Address, PaginatedResponse } from '@/types'

export interface PlaceOrderData {
  address_id: string  // UUID
  payment_method: 'cod' | 'upi' | 'card' | 'netbanking'
  promo_code?: string
}

export interface CartResponse {
  items: CartItem[]
  subtotal: number
  cart_discount: number
  delivery_charge: number
  gst: number
  discount: number
  total: number
  min_order_value: number
  promo_code: string | null
  item_count: number
}

export interface AddressCreateData {
  label: string
  recipient_name: string
  phone: string
  house: string
  area: string
  city: string
  state: string
  pin_code: string
  lat?: number
  lng?: number
  is_default: boolean
}

export const orderService = {
  getCart: async (): Promise<CartResponse> => {
    const response = await api.get('/cart/')
    return response.data
  },

  addToCart: async (productId: string, quantity: number): Promise<void> => {
    await api.post('/cart/items', { product_id: productId, quantity })
  },

  updateCartItem: async (productId: string, quantity: number): Promise<void> => {
    await api.put(`/cart/items/${productId}`, { quantity })
  },

  removeFromCart: async (productId: string): Promise<void> => {
    await api.delete(`/cart/items/${productId}`)
  },

  placeOrder: async (data: PlaceOrderData): Promise<Order> => {
    const response = await api.post('/orders/', data)
    return response.data
  },

  getOrders: async (params?: { status?: string; page?: number }): Promise<PaginatedResponse<Order>> => {
    const response = await api.get('/orders/', { params })
    return response.data
  },

  getOrderDetail: async (id: string | number): Promise<Order> => {
    const response = await api.get(`/orders/${id}/`)
    return response.data
  },

  cancelOrder: async (id: string | number, reason: string): Promise<Order> => {
    const response = await api.post(`/orders/${id}/cancel/`, { reason })
    return response.data
  },

  getAddresses: async (): Promise<Address[]> => {
    const response = await api.get('/customers/me/addresses')
    return Array.isArray(response.data) ? response.data : (response.data?.results ?? [])
  },

  createAddress: async (data: AddressCreateData): Promise<Address> => {
    const response = await api.post('/customers/me/addresses', data)
    return response.data
  },

  updateAddress: async (id: string, data: Partial<AddressCreateData>): Promise<Address> => {
    const response = await api.put(`/customers/me/addresses/${id}`, data)
    return response.data
  },

  deleteAddress: async (id: string): Promise<void> => {
    await api.delete(`/customers/me/addresses/${id}`)
  },

  checkDelivery: async (state: string, city: string, pin_code: string): Promise<{ allowed: boolean }> => {
    const response = await api.get('/orders/delivery-check', {
      params: { state, city, pin_code },
    })
    return response.data
  },

  getPublicSettings: async (): Promise<{ business_whatsapp: string }> => {
    const response = await api.get('/orders/public-settings')
    return response.data
  },
}
