import apiClient from '../utils/api';
import { saveTokens } from '../utils/auth';
import { User } from '../types';

export interface OTPRequestResponse {
  message: string;
  phone?: string;
  expires_in?: number;
}

export interface OTPVerifyResponse {
  access: string;
  refresh: string;
  user: User;
  is_new_user: boolean;
}

export interface CustomerRegisterData {
  full_name: string;
  phone: string;
  email?: string;
  otp?: string;
  language_preference?: 'mr' | 'en';
}

export interface FarmerRegisterData {
  full_name: string;
  phone: string;
  email?: string;
  password?: string;
  district: string;
  taluka: string;
  village: string;
  farm_size_acres: number;
  produce_types: string[];
  aadhaar_number: string;
  bank_account: string;
  bank_ifsc: string;
  bank_name: string;
}

export const authService = {
  requestOTP: async (phone: string): Promise<OTPRequestResponse> => {
    const response = await apiClient.post('/auth/otp/request/', { phone });
    return response.data;
  },

  verifyOTP: async (phone: string, otp: string): Promise<OTPVerifyResponse> => {
    const response = await apiClient.post('/auth/otp/verify/', { phone, otp });
    const data: OTPVerifyResponse = response.data;
    if (data.access && data.refresh) {
      await saveTokens(data.access, data.refresh);
    }
    return data;
  },

  requestEmailOTP: async (email: string): Promise<OTPRequestResponse> => {
    const response = await apiClient.post('/auth/otp/email/request/', { email });
    return response.data;
  },

  verifyEmailOTP: async (email: string, otp: string): Promise<OTPVerifyResponse> => {
    const response = await apiClient.post('/auth/otp/email/verify/', { email, otp });
    const data: OTPVerifyResponse = response.data;
    if (data.access && data.refresh) {
      await saveTokens(data.access, data.refresh);
    }
    return data;
  },

  registerCustomer: async (data: CustomerRegisterData): Promise<OTPVerifyResponse> => {
    const response = await apiClient.post('/auth/register/customer/', data);
    const result: OTPVerifyResponse = response.data;
    if (result.access && result.refresh) {
      await saveTokens(result.access, result.refresh);
    }
    return result;
  },

  registerFarmer: async (formData: FormData): Promise<{ message: string; status: string }> => {
    const response = await apiClient.post('/auth/register/farmer/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ access: string; refresh?: string }> => {
    const response = await apiClient.post('/auth/token/refresh/', { refresh: refreshToken });
    return response.data;
  },

  logout: async (): Promise<void> => {
    const response = await apiClient.post('/auth/logout/');
    return response.data;
  },

  adminLogin: async (
    email: string,
    password: string
  ): Promise<{ access: string; refresh: string; user: User }> => {
    const response = await apiClient.post('/auth/admin/login', { email, password });
    const data = response.data;
    if (data.access && data.refresh) {
      await saveTokens(data.access, data.refresh);
    }
    return data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/users/me/');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch('/users/me/', data);
    return response.data;
  },
};
