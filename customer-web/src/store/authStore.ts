import { create } from 'zustand'
import api from '@/lib/api'
import i18n from '@/i18n'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isInitialized: boolean
  language: 'mr' | 'en'
  setUser: (user: User, access: string, refresh: string) => void
  setLanguage: (lang: 'mr' | 'en') => void
  logout: () => void
  initialize: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  language: (localStorage.getItem('language') as 'mr' | 'en') ?? 'en',

  setUser: (user, access, refresh) => {
    localStorage.setItem('customer_access_token', access)
    localStorage.setItem('customer_refresh_token', refresh)
    set({ user, isAuthenticated: true })
  },

  setLanguage: (lang) => {
    localStorage.setItem('language', lang)
    i18n.changeLanguage(lang)
    set({ language: lang })
    if (get().user) {
      api.patch('/users/me/', { language_preference: lang }).catch(() => {})
    }
  },

  logout: () => {
    localStorage.removeItem('customer_access_token')
    localStorage.removeItem('customer_refresh_token')
    set({ user: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  initialize: async () => {
    const token = localStorage.getItem('customer_access_token')
    if (!token) {
      set({ isInitialized: true })
      return
    }
    try {
      const response = await api.get('/users/me/')
      const user: User = response.data
      const lang = user.language_preference ?? 'en'
      i18n.changeLanguage(lang)
      set({ user, isAuthenticated: true, isInitialized: true, language: lang })
    } catch {
      localStorage.removeItem('customer_access_token')
      localStorage.removeItem('customer_refresh_token')
      set({ isInitialized: true })
    }
  },

  refreshUser: async () => {
    try {
      const response = await api.get('/users/me/')
      set({ user: response.data })
    } catch {
      // silently fail
    }
  },
}))
