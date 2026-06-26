import { create } from 'zustand';
import { User } from '../types';
import { getAccessToken, getRefreshToken, clearTokens, decodeToken } from '../utils/auth';
import apiClient from '../utils/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  role: 'customer' | 'farmer' | 'admin' | null;
  isLoading: boolean;
  language: 'mr' | 'en';

  setUser: (user: User) => void;
  setLanguage: (lang: 'mr' | 'en') => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  role: null,
  isLoading: true,
  language: 'en',

  setUser: (user: User) => {
    set({
      user,
      isAuthenticated: true,
      role: user.role,
      language: user.language_preference || 'en',
    });
  },

  setLanguage: (lang: 'mr' | 'en') => {
    set({ language: lang });
    // Persist to user preference if logged in
    const { user } = get();
    if (user) {
      apiClient.patch('/users/me/', { language_preference: lang }).catch(() => {
        // Silent fail - preference will be updated next time
      });
    }
  },

  logout: async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/auth/logout/', { refresh: refreshToken }).catch(() => {
          // Silent fail on logout API call
        });
      }
    } catch {
      // Silent fail
    } finally {
      await clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        role: null,
      });
    }
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Decode token to get basic info
      const payload = decodeToken(token);
      if (!payload) {
        await clearTokens();
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Fetch full user profile
      const response = await apiClient.get('/users/me/');
      const user: User = response.data;

      set({
        user,
        isAuthenticated: true,
        role: user.role,
        language: user.language_preference || 'en',
        isLoading: false,
      });
    } catch {
      await clearTokens();
      set({
        user: null,
        isAuthenticated: false,
        role: null,
        isLoading: false,
      });
    }
  },
}));
