import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import FarmersPage from '@/pages/FarmersPage'
import FarmerDetailPage from '@/pages/FarmerDetailPage'
import ProductsPage from '@/pages/ProductsPage'
import FarmerProductsPage from '@/pages/FarmerProductsPage'
import OrdersPage from '@/pages/OrdersPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import AppSettingsPage from '@/pages/AppSettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="farmers" element={<FarmersPage />} />
        <Route path="farmers/:id" element={<FarmerDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="farmer-products" element={<FarmerProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<AppSettingsPage />} />
      </Route>
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
