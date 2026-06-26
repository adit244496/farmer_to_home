import api from '@/lib/api'
import type { User } from '@/types'

export interface OTPRequestResponse {
  message: string
  expires_in?: number
}

export interface OTPVerifyResponse {
  access: string
  refresh: string
  user: User
  is_new_user: boolean
}

export const authService = {
  requestOTP: async (phone: string): Promise<OTPRequestResponse> => {
    const response = await api.post('/auth/otp/request/', { phone })
    return response.data
  },

  verifyOTP: async (phone: string, otp: string): Promise<OTPVerifyResponse> => {
    const response = await api.post('/auth/otp/verify/', { phone, otp })
    return response.data
  },

  requestEmailOTP: async (email: string): Promise<OTPRequestResponse> => {
    const response = await api.post('/auth/otp/email/request/', { email })
    return response.data
  },

  verifyEmailOTP: async (email: string, otp: string): Promise<OTPVerifyResponse> => {
    const response = await api.post('/auth/otp/email/verify/', { email, otp })
    return response.data
  },

  loginWithPassword: async (
    identifier: { phone?: string; email?: string },
    password: string
  ): Promise<OTPVerifyResponse> => {
    const response = await api.post('/auth/customer/login', { ...identifier, password })
    return response.data
  },

  setPassword: async (password: string): Promise<void> => {
    await api.post('/auth/set-password/', { password })
  },

  registerCustomer: async (data: {
    full_name: string
    phone?: string
    email?: string
    language_preference?: 'mr' | 'en'
  }): Promise<OTPVerifyResponse> => {
    const response = await api.post('/auth/register/customer/', data)
    return response.data
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/users/me/')
    return response.data
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.patch('/users/me/', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout/')
  },
}
