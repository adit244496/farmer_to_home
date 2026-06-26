import { create } from 'zustand'
import api from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  initialize: () => Promise<void>
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/admin/login', { email, password })
    const { access, refresh, user } = response.data

    localStorage.setItem('admin_access_token', access)
    localStorage.setItem('admin_refresh_token', refresh)

    set({ user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('admin_access_token')
    localStorage.removeItem('admin_refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  initialize: async () => {
    set({ isInitializing: true })
    try {
      const token = localStorage.getItem('admin_access_token')
      if (!token) {
        set({ isInitializing: false })
        return
      }

      const response = await api.get('/users/me/')
      const user: User = response.data

      if (user.role !== 'admin') {
        localStorage.removeItem('admin_access_token')
        localStorage.removeItem('admin_refresh_token')
        set({ user: null, isAuthenticated: false, isInitializing: false })
        return
      }

      set({ user, isAuthenticated: true, isInitializing: false })
    } catch {
      localStorage.removeItem('admin_access_token')
      localStorage.removeItem('admin_refresh_token')
      set({ user: null, isAuthenticated: false, isInitializing: false })
    }
  },
}))

export default useAuthStore
