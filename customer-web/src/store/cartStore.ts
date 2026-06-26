import { create } from 'zustand'
import { orderService } from '@/services/order.service'
import type { CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  loading: boolean
  subtotal: number
  deliveryCharge: number
  totalAmount: number
  fetchCart: () => Promise<void>
  addItem: (productId: number, quantity: number) => Promise<void>
  updateItem: (itemId: number, quantity: number) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
  clear: () => void
}

function calcTotals(items: CartItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const deliveryCharge = subtotal >= 500 ? 0 : 40
  return { subtotal, deliveryCharge, totalAmount: subtotal + deliveryCharge }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,
  subtotal: 0,
  deliveryCharge: 0,
  totalAmount: 0,

  fetchCart: async () => {
    set({ loading: true })
    try {
      const cart = await orderService.getCart()
      const items = cart.items ?? []
      set({ items, ...calcTotals(items), loading: false })
    } catch {
      set({ loading: false })
    }
  },

  addItem: async (productId, quantity) => {
    await orderService.addToCart(productId, quantity)
    await get().fetchCart()
  },

  updateItem: async (itemId, quantity) => {
    await orderService.updateCartItem(itemId, quantity)
    await get().fetchCart()
  },

  removeItem: async (itemId) => {
    await orderService.removeFromCart(itemId)
    await get().fetchCart()
  },

  clear: () => set({ items: [], subtotal: 0, deliveryCharge: 0, totalAmount: 0 }),
}))
