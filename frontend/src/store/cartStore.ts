import { create } from 'zustand';
import { CartItem, Product } from '../types';
import apiClient from '../utils/api';

interface CartState {
  items: CartItem[];
  promoCode: string | null;
  discountAmount: number;
  subtotal: number;
  totalAmount: number;
  deliveryCharge: number;
  isLoading: boolean;

  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, qty: number) => void;
  applyPromo: (code: string) => Promise<void>;
  removePromo: () => void;
  clearCart: () => void;
  syncWithServer: (userId: number) => Promise<void>;
  calculateTotals: () => void;
}

const DELIVERY_CHARGE_PER_FARMER = 40;
const FREE_DELIVERY_THRESHOLD = 500;

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  promoCode: null,
  discountAmount: 0,
  subtotal: 0,
  totalAmount: 0,
  deliveryCharge: 0,
  isLoading: false,

  addItem: (product: Product, quantity: number) => {
    const { items } = get();
    const existingIndex = items.findIndex((item) => item.product.id === product.id);

    if (existingIndex >= 0) {
      const updatedItems = [...items];
      const existing = updatedItems[existingIndex];
      const newQty = existing.quantity + quantity;
      updatedItems[existingIndex] = {
        ...existing,
        quantity: newQty,
        subtotal: newQty * existing.unit_price,
      };
      set({ items: updatedItems });
    } else {
      const newItem: CartItem = {
        id: Date.now(),
        product,
        quantity,
        unit_price: product.price_per_unit,
        subtotal: quantity * product.price_per_unit,
      };
      set({ items: [...items, newItem] });
    }
    get().calculateTotals();
  },

  removeItem: (productId: number) => {
    const { items } = get();
    set({ items: items.filter((item) => item.product.id !== productId) });
    get().calculateTotals();
  },

  updateQuantity: (productId: number, qty: number) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }

    const { items } = get();
    const updatedItems = items.map((item) => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity: qty,
          subtotal: qty * item.unit_price,
        };
      }
      return item;
    });
    set({ items: updatedItems });
    get().calculateTotals();
  },

  applyPromo: async (code: string) => {
    set({ isLoading: true });
    try {
      const { subtotal } = get();
      const response = await apiClient.post('/orders/cart/promo/', {
        code,
        subtotal,
      });
      const { discount_amount } = response.data;
      set({ promoCode: code, discountAmount: discount_amount });
      get().calculateTotals();
    } catch (error) {
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  removePromo: () => {
    set({ promoCode: null, discountAmount: 0 });
    get().calculateTotals();
  },

  clearCart: () => {
    set({
      items: [],
      promoCode: null,
      discountAmount: 0,
      subtotal: 0,
      totalAmount: 0,
      deliveryCharge: 0,
    });
  },

  syncWithServer: async (_userId: number) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/orders/cart/');
      const cartData = response.data;

      const items: CartItem[] = cartData.items || [];
      set({
        items,
        promoCode: cartData.promo_code || null,
        discountAmount: cartData.discount_amount || 0,
        deliveryCharge: cartData.delivery_charge || 0,
      });
      get().calculateTotals();
    } catch {
      // Keep local state if sync fails
    } finally {
      set({ isLoading: false });
    }
  },

  calculateTotals: () => {
    const { items, discountAmount } = get();

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

    // Count unique farmers for delivery charge
    const farmerIds = new Set(items.map((item) => item.product.farmer.id));
    const deliveryCharge =
      subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : farmerIds.size * DELIVERY_CHARGE_PER_FARMER;

    const totalAmount = subtotal + deliveryCharge - discountAmount;

    set({
      subtotal,
      deliveryCharge,
      totalAmount: Math.max(0, totalAmount),
    });
  },
}));
