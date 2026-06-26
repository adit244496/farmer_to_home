import { useState, type ElementType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users,
  Clock,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Database,
  Star,
  CheckCircle,
} from 'lucide-react'
import api from '@/lib/api'
import type { DashboardStats } from '@/types'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: number | string
  icon: ElementType
  color: string
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedMessage, setSeedMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { data, isLoading, isError, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard')
      return res.data
    },
  })

  const handleSeedData = async () => {
    setSeedLoading(true)
    setSeedMessage(null)
    try {
      const res = await api.post('/admin/seed-test-data')
      setSeedMessage({
        type: 'success',
        text: res.data?.message ?? 'Test data seeded successfully.',
      })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setSeedMessage({
        type: 'error',
        text: axiosErr?.response?.data?.detail ?? 'Failed to seed test data.',
      })
    } finally {
      setSeedLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-farm-green-600" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-4">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">
          Failed to load dashboard:{' '}
          {(error as { message?: string })?.message ?? 'Unknown error'}
        </span>
      </div>
    )
  }

  const stats = data!

  return (
    <div className="space-y-6">
      {/* Pending farmers alert */}
      {stats.pending_farmers > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <span className="text-sm text-amber-800">
              <strong>{stats.pending_farmers}</strong> farmer
              {stats.pending_farmers > 1 ? 's are' : ' is'} waiting for approval.
            </span>
          </div>
          <Link
            to="/farmers?status=pending"
            className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
          >
            Review now →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Farmers"
          value={stats.total_farmers}
          icon={Users}
          color="bg-farm-green-100 text-farm-green-700"
          sub={`${stats.approved_farmers} approved · ${stats.rejected_farmers} rejected`}
        />
        <StatCard
          label="Pending Approval"
          value={stats.pending_farmers}
          icon={Clock}
          color="bg-amber-100 text-amber-700"
          sub="Awaiting review"
        />
        <StatCard
          label="Orders Today"
          value={stats.orders_today}
          icon={ShoppingCart}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          label="Total Revenue"
          value={`₹${stats.total_revenue.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          color="bg-purple-100 text-purple-700"
          sub={stats.low_stock_count > 0 ? `${stats.low_stock_count} low-stock items` : undefined}
        />
      </div>

      {/* Top Products table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Top Products</h2>
          <Star className="h-4 w-4 text-yellow-400" />
        </div>
        {stats.top_products && stats.top_products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 bg-gray-50">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium text-right">Ratings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.top_products.slice(0, 5).map((product, idx) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{product.name_en}</td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 bg-farm-green-50 text-farm-green-700 rounded text-xs font-medium capitalize">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{product.total_ratings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">No product data available.</p>
        )}
      </div>

      {/* Seed test data */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-800">Developer Tools</h2>
            <p className="text-sm text-gray-500 mt-1">
              Populate the database with sample farmers, products, and orders for testing.
            </p>
          </div>
          <button
            onClick={handleSeedData}
            disabled={seedLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {seedLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Seed Test Data
          </button>
        </div>
        {seedMessage && (
          <div
            className={`flex items-start gap-3 mt-4 rounded-lg px-4 py-3 text-sm ${
              seedMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {seedMessage.type === 'success' ? (
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            )}
            {seedMessage.text}
          </div>
        )}
      </div>
    </div>
  )
}
