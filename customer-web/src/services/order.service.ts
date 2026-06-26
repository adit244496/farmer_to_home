import api from '@/lib/api'
import type { Order, CartItem, Address, PaginatedResponse } from '@/types'

export interface PlaceOrderData {
  delivery_address_id: number
  payment_method: 'cod' | 'upi' | 'card' | 'netbanking'
  promo_code?: string
}

export interface CartResponse {
  items: CartItem[]
  subtotal: number
  delivery_charge: number
  discount: number
  total: number
  promo_code: string | null
  item_count: number
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
    const response = await api.get('/users/addresses/')
    return response.data?.results ?? response.data ?? []
  },

  createAddress: async (data: Omit<Address, 'id'>): Promise<Address> => {
    const response = await api.post('/users/addresses/', data)
    return response.data
  },

  updateAddress: async (id: number, data: Partial<Address>): Promise<Address> => {
    const response = await api.patch(`/users/addresses/${id}/`, data)
    return response.data
  },

  deleteAddress: async (id: number): Promise<void> => {
    await api.delete(`/users/addresses/${id}/`)
  },
}
