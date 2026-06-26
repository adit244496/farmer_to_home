import { create } from 'zustand'
import api from '@/lib/api'
import type { User, FarmerProfile } from '@/types'

interface AuthState {
  user: User | null
  farmerProfile: FarmerProfile | null
  isAuthenticated: boolean
  isInitialized: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
  initialize: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  farmerProfile: null,
  isAuthenticated: false,
  isInitialized: false,

  login: async (phone: string, password: string) => {
    const response = await api.post('/auth/login', { phone, password })
    const { access, refresh } = response.data
    localStorage.setItem('farmer_access_token', access)
    localStorage.setItem('farmer_refresh_token', refresh)

    const userResponse = await api.get('/users/me/')
    const farmerResponse = await api.get('/farmers/me/')

    set({
      user: userResponse.data,
      farmerProfile: farmerResponse.data,
      isAuthenticated: true,
    })
  },

  logout: () => {
    localStorage.removeItem('farmer_access_token')
    localStorage.removeItem('farmer_refresh_token')
    set({
      user: null,
      farmerProfile: null,
      isAuthenticated: false,
    })
  },

  initialize: async () => {
    const token = localStorage.getItem('farmer_access_token')
    if (!token) {
      set({ isInitialized: true })
      return
    }

    try {
      const userResponse = await api.get('/users/me/')
      const farmerResponse = await api.get('/farmers/me/')
      set({
        user: userResponse.data,
        farmerProfile: farmerResponse.data,
        isAuthenticated: true,
        isInitialized: true,
      })
    } catch {
      localStorage.removeItem('farmer_access_token')
      localStorage.removeItem('farmer_refresh_token')
      set({ isInitialized: true })
    }
  },

  refreshProfile: async () => {
    try {
      const userResponse = await api.get('/users/me/')
      const farmerResponse = await api.get('/farmers/me/')
      set({
        user: userResponse.data,
        farmerProfile: farmerResponse.data,
      })
    } catch {
      // silently fail
    }
  },
}))
