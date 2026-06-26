import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, Package, TrendingUp, Star, Plus, Eye, AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import type { Order, EarningsSummary, PaginatedResponse } from '@/types'
import clsx from 'clsx'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
    suspended: { label: 'Suspended', color: 'bg-gray-100 text-gray-700' },
  }
  const m = map[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', m.color)}>
      {m.label}
    </span>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    dispatched: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', colors[status] ?? 'bg-gray-100 text-gray-700')}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function DashboardPage() {
  const { farmerProfile } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, earningsRes, productsRes] = await Promise.all([
          api.get<PaginatedResponse<Order>>('/farmers/me/orders/', { params: { page: 1, page_size: 5 } }),
          api.get<EarningsSummary>('/farmers/me/earnings/', { params: { period: 'month' } }),
          api.get<PaginatedResponse<unknown>>('/farmers/me/products/', { params: { page: 1, page_size: 1 } }),
        ])
        setOrders(ordersRes.data.items ?? [])
        setEarnings(earningsRes.data)
        setProductCount(productsRes.data.total ?? 0)
      } catch {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const approvalStatus = farmerProfile?.approval_status

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, {farmerProfile?.full_name}!</p>
        </div>
      </div>

      {/* Approval warning banner */}
      {approvalStatus === 'pending' && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-300 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800 text-sm">Account Pending Approval</p>
            <p className="text-yellow-700 text-sm mt-0.5">
              Your account is under review. You can explore the portal, but you cannot accept orders until approved.
            </p>
          </div>
        </div>
      )}

      {/* Welcome card */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{farmerProfile?.full_name}</h2>
            <p className="text-green-200 text-sm mt-1">
              {farmerProfile?.village}, {farmerProfile?.taluka}, {farmerProfile?.district}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <StatusBadge status={approvalStatus ?? 'pending'} />
              <span className="text-green-200 text-xs">
                Member since {farmerProfile?.member_since ? new Date(farmerProfile.member_since).getFullYear() : '—'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/20 rounded-lg px-3 py-1.5">
            <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
            <span className="text-white font-semibold text-sm">{farmerProfile?.rating?.toFixed(1) ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{error}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Orders"
            value={farmerProfile?.total_orders_fulfilled ?? 0}
            icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-50"
          />
          <StatCard
            label="Products Listed"
            value={productCount}
            icon={<Package className="h-5 w-5 text-purple-600" />}
            bg="bg-purple-50"
          />
          <StatCard
            label="This Month"
            value={`₹${(earnings?.total_earnings ?? 0).toLocaleString('en-IN')}`}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            bg="bg-green-50"
          />
          <StatCard
            label="Rating"
            value={farmerProfile?.rating?.toFixed(1) ?? '—'}
            icon={<Star className="h-5 w-5 text-yellow-600" />}
            bg="bg-yellow-50"
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          to="/products/add"
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Product
        </Link>
        <Link
          to="/orders"
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Eye className="h-4 w-4" /> View All Orders
        </Link>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Recent Orders</h3>
          <Link to="/orders" className="text-green-700 text-sm hover:text-green-800 font-medium">View all</Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wide bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium">Order ID</th>
                  <th className="text-left px-5 py-3 font-medium">Customer</th>
                  <th className="text-left px-5 py-3 font-medium">Amount</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-700">{order.order_id}</td>
                    <td className="px-5 py-3 text-gray-700">{order.customer?.full_name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-800 font-medium">₹{order.total_amount?.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-5 py-3 text-gray-500">{new Date(order.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, bg }: { label: string; value: string | number; icon: React.ReactNode; bg: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className={clsx('inline-flex p-2.5 rounded-lg mb-3', bg)}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-gray-500 text-sm mt-0.5">{label}</p>
    </div>
  )
}

