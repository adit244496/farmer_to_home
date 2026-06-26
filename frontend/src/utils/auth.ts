import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'fth_access_token';
const REFRESH_TOKEN_KEY = 'fth_refresh_token';

const storage = {
  set: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  get: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  delete: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const saveTokens = async (accessToken: string, refreshToken: string): Promise<void> => {
  try {
    await storage.set(ACCESS_TOKEN_KEY, accessToken);
    await storage.set(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Failed to save tokens:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await storage.get(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await storage.get(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
};

export const clearTokens = async (): Promise<void> => {
  try {
    await storage.delete(ACCESS_TOKEN_KEY);
    await storage.delete(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
};

export interface JWTPayload {
  user_id?: number;
  sub?: string;
  exp?: number;
  iat?: number;
  role?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    // Pad base64 if needed
    const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(paddedPayload);
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true;
  }
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};
