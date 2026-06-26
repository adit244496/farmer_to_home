import apiClient from '../utils/api';
import { Cart, Order, PaginatedResponse } from '../types';

export interface PlaceOrderData {
  delivery_address_id: number;
  payment_method: 'cod' | 'upi' | 'card' | 'netbanking';
  promo_code?: string;
  notes?: string;
}

export interface PaymentVerifyData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order_id: number;
}

export interface OrderFilters {
  status?: string;
  payment_status?: string;
  page?: number;
  page_size?: number;
}

export interface ReviewSubmitData {
  order_id: number;
  reviews: Array<{
    product_id: number;
    rating: number;
    comment: string;
    photos?: string[];
  }>;
}

export const orderService = {
  getCart: async (): Promise<Cart> => {
    const response = await apiClient.get('/orders/cart/');
    return response.data;
  },

  addToCart: async (productId: number, qty: number): Promise<Cart> => {
    const response = await apiClient.post('/orders/cart/items/', {
      product_id: productId,
      quantity: qty,
    });
    return response.data;
  },

  updateCartItem: async (productId: number, qty: number): Promise<Cart> => {
    const response = await apiClient.patch(`/orders/cart/items/${productId}/`, {
      quantity: qty,
    });
    return response.data;
  },

  removeFromCart: async (productId: number): Promise<Cart> => {
    const response = await apiClient.delete(`/orders/cart/items/${productId}/`);
    return response.data;
  },

  applyPromo: async (code: string): Promise<{ discount_amount: number; message: string }> => {
    const response = await apiClient.post('/orders/cart/promo/', { code });
    return response.data;
  },

  removePromo: async (): Promise<Cart> => {
    const response = await apiClient.delete('/orders/cart/promo/');
    return response.data;
  },

  placeOrder: async (data: PlaceOrderData): Promise<Order> => {
    const response = await apiClient.post('/orders/', data);
    return response.data;
  },

  initiatePayment: async (orderId: number): Promise<{
    razorpay_order_id: string;
    amount: number;
    currency: string;
    key_id: string;
  }> => {
    const response = await apiClient.post(`/orders/${orderId}/payment/initiate/`);
    return response.data;
  },

  verifyPayment: async (data: PaymentVerifyData): Promise<{ success: boolean; order: Order }> => {
    const response = await apiClient.post('/orders/payment/verify/', data);
    return response.data;
  },

  getOrders: async (filters?: OrderFilters): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/orders/', { params: filters });
    return response.data;
  },

  getOrderDetail: async (id: number): Promise<Order> => {
    const response = await apiClient.get(`/orders/${id}/`);
    return response.data;
  },

  cancelOrder: async (id: number, reason: string): Promise<Order> => {
    const response = await apiClient.post(`/orders/${id}/cancel/`, { reason });
    return response.data;
  },

  submitReview: async (data: ReviewSubmitData): Promise<{ message: string }> => {
    const response = await apiClient.post('/orders/reviews/', data);
    return response.data;
  },

  getAddresses: async (): Promise<import('../types').Address[]> => {
    const response = await apiClient.get('/users/addresses/');
    return response.data;
  },

  addAddress: async (data: Omit<import('../types').Address, 'id'>): Promise<import('../types').Address> => {
    const response = await apiClient.post('/users/addresses/', data);
    return response.data;
  },

  updateAddress: async (id: number, data: Partial<import('../types').Address>): Promise<import('../types').Address> => {
    const response = await apiClient.patch(`/users/addresses/${id}/`, data);
    return response.data;
  },

  deleteAddress: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/addresses/${id}/`);
  },

  setDefaultAddress: async (id: number): Promise<import('../types').Address> => {
    const response = await apiClient.post(`/users/addresses/${id}/set-default/`);
    return response.data;
  },
};
