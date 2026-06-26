import { useAuthStore } from '../store/authStore';
import { useCallback } from 'react';
import { router } from 'expo-router';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    role,
    isLoading,
    language,
    setUser,
    setLanguage,
    logout: storeLogout,
    initialize,
  } = useAuthStore();

  const logout = useCallback(async () => {
    await storeLogout();
    router.replace('/auth/role-select');
  }, [storeLogout]);

  const navigateToHome = useCallback(() => {
    router.replace('/customer/home');
  }, []);

  const isCustomer = role === 'customer';
  const isFarmer = role === 'farmer';
  const isAdmin = role === 'admin';

  return {
    user,
    isAuthenticated,
    role,
    isLoading,
    language,
    isCustomer,
    isFarmer,
    isAdmin,
    setUser,
    setLanguage,
    logout,
    initialize,
    navigateToHome,
  };
};
