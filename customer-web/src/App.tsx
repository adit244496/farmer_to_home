import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui/Spinner'

import LoginPage from '@/pages/auth/LoginPage'
import OTPVerifyPage from '@/pages/auth/OTPVerifyPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import HomePage from '@/pages/home/HomePage'
import ProductDetailPage from '@/pages/product/ProductDetailPage'
import CategoryPage from '@/pages/product/CategoryPage'
import CartPage from '@/pages/cart/CartPage'
import CheckoutPage from '@/pages/cart/CheckoutPage'
import OrdersPage from '@/pages/orders/OrdersPage'
import OrderDetailPage from '@/pages/orders/OrderDetailPage'
import ProfilePage from '@/pages/profile/ProfilePage'
import EditProfilePage from '@/pages/profile/EditProfilePage'
import AddressesPage from '@/pages/profile/AddressesPage'
import FarmerProfilePage from '@/pages/farmer/FarmerProfilePage'
import SearchPage from '@/pages/home/SearchPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuthStore()
  if (!isInitialized) return <div className="flex h-screen items-center justify-center"><Spinner /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuthStore()
  if (!isInitialized) return <div className="flex h-screen items-center justify-center"><Spinner /></div>
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/auth/otp" element={<OTPVerifyPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Public browsing routes */}
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/category/:id" element={<CategoryPage />} />
        <Route path="/farmer/:id" element={<FarmerProfilePage />} />
        <Route path="/search" element={<SearchPage />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
        <Route path="/profile/addresses" element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
