import { create } from 'zustand'
import { orderService } from '@/services/order.service'
import type { CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  loading: boolean
  subtotal: number
  cartDiscount: number
  deliveryCharge: number
  gst: number
  totalAmount: number
  minOrderValue: number
  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity: number) => Promise<void>
  updateItem: (productId: string, quantity: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  clear: () => void
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,
  subtotal: 0,
  cartDiscount: 0,
  deliveryCharge: 0,
  gst: 0,
  totalAmount: 0,
  minOrderValue: 0,

  fetchCart: async () => {
    set({ loading: true })
    try {
      const cart = await orderService.getCart()
      const items = cart.items ?? []
      set({
        items,
        subtotal: cart.subtotal,
        cartDiscount: cart.cart_discount ?? 0,
        deliveryCharge: cart.delivery_charge,
        gst: cart.gst ?? 0,
        totalAmount: cart.total,
        minOrderValue: cart.min_order_value ?? 0,
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  addItem: async (productId, quantity) => {
    await orderService.addToCart(productId, quantity)
    await get().fetchCart()
  },

  updateItem: async (productId, quantity) => {
    await orderService.updateCartItem(productId, quantity)
    await get().fetchCart()
  },

  removeItem: async (productId) => {
    await orderService.removeFromCart(productId)
    await get().fetchCart()
  },

  clear: () => set({ items: [], subtotal: 0, cartDiscount: 0, deliveryCharge: 0, gst: 0, totalAmount: 0, minOrderValue: 0 }),
}))
