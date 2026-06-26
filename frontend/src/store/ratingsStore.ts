import { create } from 'zustand';

export interface UserRating {
  productId: number;
  stars: number;
  comment: string;
  ratedAt: string;
}

interface RatingsStore {
  ratings: Record<number, UserRating>;
  deliveredProductIds: number[];
  pendingDeliveryProductIds: number[];

  rateProduct: (productId: number, stars: number, comment: string) => void;
  getUserRating: (productId: number) => UserRating | undefined;
  clearRating: (productId: number) => void;

  /** Called at checkout, before cart is cleared, to queue IDs for delivery */
  setPendingDelivery: (productIds: number[]) => void;
  /** Called from order-confirm when user taps "I've Received My Order" */
  markPendingAsDelivered: () => void;
  /** Check if a specific product has been marked delivered */
  isDelivered: (productId: number) => boolean;
}

export const useRatingsStore = create<RatingsStore>((set, get) => ({
  ratings: {},
  deliveredProductIds: [],
  pendingDeliveryProductIds: [],

  rateProduct: (productId, stars, comment) =>
    set((state) => ({
      ratings: {
        ...state.ratings,
        [productId]: { productId, stars, comment, ratedAt: new Date().toISOString() },
      },
    })),

  getUserRating: (productId) => get().ratings[productId],

  clearRating: (productId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [productId]: _, ...rest } = state.ratings;
      return { ratings: rest };
    }),

  setPendingDelivery: (productIds) =>
    set({ pendingDeliveryProductIds: productIds }),

  markPendingAsDelivered: () =>
    set((state) => ({
      deliveredProductIds: [
        ...new Set([...state.deliveredProductIds, ...state.pendingDeliveryProductIds]),
      ],
      pendingDeliveryProductIds: [],
    })),

  isDelivered: (productId) => get().deliveredProductIds.includes(productId),
}));
