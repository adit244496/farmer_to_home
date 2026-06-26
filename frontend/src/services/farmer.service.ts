import apiClient from '../utils/api';
import { Farmer, Product, Order, FarmerDashboard, Earnings, PaginatedResponse } from '../types';

export interface FarmerProductParams {
  status?: 'active' | 'inactive' | 'out_of_stock' | 'all';
  page?: number;
  page_size?: number;
  search?: string;
}

export interface FarmerOrderParams {
  status?: string;
  page?: number;
  page_size?: number;
}

export const farmerService = {
  getPublicFarmerProfile: async (id: string): Promise<Farmer> => {
    const response = await apiClient.get(`/farmers/${id}`);
    return response.data;
  },

  getFarmerProducts: async (id: string, params?: FarmerProductParams): Promise<PaginatedResponse<Product>> => {
    const response = await apiClient.get(`/farmers/${id}/products`, { params });
    return response.data;
  },

  getFarmerDashboard: async (): Promise<FarmerDashboard> => {
    const response = await apiClient.get('/farmers/me/dashboard');
    return response.data;
  },

  getMyProducts: async (params?: FarmerProductParams): Promise<PaginatedResponse<Product>> => {
    const response = await apiClient.get('/farmers/me/products', { params });
    return response.data;
  },

  addProduct: async (formData: FormData): Promise<Product> => {
    const response = await apiClient.post('/farmers/me/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateProduct: async (id: string, formData: FormData): Promise<Product> => {
    const response = await apiClient.put(`/farmers/me/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(`/farmers/me/products/${id}`);
  },

  updateStock: async (id: string, stock: number): Promise<Product> => {
    const response = await apiClient.patch(`/farmers/me/products/${id}/stock`, { stock });
    return response.data;
  },

  getMyOrders: async (params?: FarmerOrderParams): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/farmers/me/orders', { params });
    return response.data;
  },

  getOrderDetail: async (id: string): Promise<Order> => {
    const response = await apiClient.get(`/farmers/me/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (
    id: string,
    status: string,
    tracking?: { tracking_number?: string; carrier?: string }
  ): Promise<Order> => {
    const response = await apiClient.patch(`/farmers/me/orders/${id}/status`, {
      status,
      ...tracking,
    });
    return response.data;
  },

  getEarnings: async (): Promise<Earnings> => {
    const response = await apiClient.get('/farmers/me/earnings');
    return response.data;
  },

  updateProfile: async (data: FormData | Record<string, unknown>): Promise<Farmer> => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.put('/farmers/me/profile', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return response.data;
  },

  getMyProfile: async (): Promise<Farmer> => {
    const response = await apiClient.get('/farmers/me/profile');
    return response.data;
  },

  getNearbyFarmers: async (params?: { limit?: number }): Promise<Farmer[]> => {
    const response = await apiClient.get('/farmers/nearby', { params });
    return response.data;
  },

  getTopRatedFarmers: async (params?: { limit?: number }): Promise<Farmer[]> => {
    const response = await apiClient.get('/farmers/top-rated', { params });
    return response.data;
  },
};
