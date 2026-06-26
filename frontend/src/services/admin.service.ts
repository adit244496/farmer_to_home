import apiClient from '../utils/api';
import { AdminDashboard, Farmer, Product, Order, Analytics, PromoCode, PaginatedResponse } from '../types';

export interface FarmerListFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'suspended';
  district?: string;
  category?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface OrderListFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  payment_status?: string;
  farmer_name?: string;
  page?: number;
  page_size?: number;
}

export const adminService = {
  getDashboard: async (): Promise<AdminDashboard> => {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  },

  listFarmers: async (filters?: FarmerListFilters): Promise<PaginatedResponse<Farmer>> => {
    const response = await apiClient.get('/admin/farmers', { params: filters });
    return response.data;
  },

  getFarmerDetail: async (id: number): Promise<Farmer & { documents: Record<string, string> }> => {
    const response = await apiClient.get(`/admin/farmers/${id}`);
    return response.data;
  },

  approveFarmer: async (id: number): Promise<Farmer> => {
    const response = await apiClient.post(`/admin/farmers/${id}/approve`);
    return response.data;
  },

  rejectFarmer: async (id: number, reason: string): Promise<Farmer> => {
    const response = await apiClient.post(`/admin/farmers/${id}/reject`, { reason });
    return response.data;
  },

  suspendFarmer: async (id: number, reason?: string): Promise<Farmer> => {
    const response = await apiClient.post(`/admin/farmers/${id}/suspend`, { reason });
    return response.data;
  },

  getFarmerInventory: async (
    farmerId: number,
    params?: { page?: number; status?: string }
  ): Promise<PaginatedResponse<Product>> => {
    const response = await apiClient.get(`/admin/farmers/${farmerId}/products`, { params });
    return response.data;
  },

  adminUpdateProduct: async (
    farmerId: number,
    productId: number,
    data: Partial<Product> & { admin_reason?: string }
  ): Promise<Product> => {
    const response = await apiClient.patch(`/admin/farmers/${farmerId}/products/${productId}`, data);
    return response.data;
  },

  toggleProductStatus: async (
    farmerId: number,
    productId: number,
    isActive: boolean
  ): Promise<Product> => {
    const response = await apiClient.patch(`/admin/farmers/${farmerId}/products/${productId}`, {
      is_active: isActive,
    });
    return response.data;
  },

  getAllOrders: async (filters?: OrderListFilters): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/admin/orders', { params: filters });
    return response.data;
  },

  getOrderDetail: async (id: number): Promise<Order> => {
    const response = await apiClient.get(`/admin/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id: number, status: string): Promise<Order> => {
    const response = await apiClient.patch(`/admin/orders/${id}/status`, { status });
    return response.data;
  },

  issueRefund: async (orderId: number, amount?: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/admin/orders/${orderId}/refund`, { amount });
    return response.data;
  },

  getAnalytics: async (period: 'today' | 'week' | 'month' | 'year'): Promise<Analytics> => {
    const response = await apiClient.get('/admin/analytics', { params: { period } });
    return response.data;
  },

  createPromo: async (data: Omit<PromoCode, 'id' | 'used_count'>): Promise<PromoCode> => {
    const response = await apiClient.post('/admin/promos', data);
    return response.data;
  },

  listPromos: async (): Promise<PaginatedResponse<PromoCode>> => {
    const response = await apiClient.get('/admin/promos');
    return response.data;
  },

  deletePromo: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/promos/${id}`);
  },

  getCustomers: async (params?: {
    search?: string;
    page?: number;
  }): Promise<PaginatedResponse<import('../types').Customer>> => {
    const response = await apiClient.get('/admin/customers', { params });
    return response.data;
  },

  seedTestData: async (): Promise<{
    message: string;
    created: { categories: number; farmers: number; products: number };
    note: string;
  }> => {
    const response = await apiClient.post('/admin/seed-test-data');
    return response.data;
  },
};
