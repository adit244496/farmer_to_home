import api from '@/lib/api'
import type { Order, CartItem, Address, PaginatedResponse } from '@/types'

export interface PlaceOrderData {
  delivery_address_id: number
  payment_method: 'cod' | 'upi' | 'card' | 'netbanking'
  promo_code?: string
}

export const orderService = {
  getCart: async (): Promise<{ items: CartItem[]; subtotal: number; total: number }> => {
    const response = await api.get('/orders/cart/')
    return response.data
  },

  addToCart: async (productId: number, quantity: number): Promise<CartItem> => {
    const response = await api.post('/orders/cart/items/', { product_id: productId, quantity })
    return response.data
  },

  updateCartItem: async (itemId: number, quantity: number): Promise<CartItem> => {
    const response = await api.patch(`/orders/cart/items/${itemId}/`, { quantity })
    return response.data
  },

  removeFromCart: async (itemId: number): Promise<void> => {
    await api.delete(`/orders/cart/items/${itemId}/`)
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
