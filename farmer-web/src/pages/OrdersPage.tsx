import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import type { Order, PaginatedResponse } from '@/types'
import clsx from 'clsx'

const TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
]

const PAGE_SIZE = 10

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  dispatched: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const fetchOrders = async (p = page, status = activeTab) => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, unknown> = { page: p, page_size: PAGE_SIZE }
      if (status) params.status = status
      const res = await api.get<PaginatedResponse<Order>>('/farmers/me/orders/', { params })
      setOrders(res.data.items ?? [])
      setTotal(res.data.total ?? 0)
    } catch {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders(page, activeTab) }, [page, activeTab])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setPage(1)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-500 text-sm mt-0.5">{total} total orders</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No orders found</p>
            <p className="text-gray-400 text-sm mt-1">
              {activeTab ? `No ${activeTab} orders` : 'Orders will appear here once customers start purchasing'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Order ID</th>
                  <th className="text-left px-5 py-3 font-medium">Customer</th>
                  <th className="text-left px-5 py-3 font-medium">Items</th>
                  <th className="text-left px-5 py-3 font-medium">Amount</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-700 font-medium">{order.order_id}</td>
                    <td className="px-5 py-3">
                      <p className="text-gray-800 font-medium">{order.customer?.full_name ?? '—'}</p>
                      <p className="text-gray-400 text-xs">{order.customer?.phone ?? ''}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}</td>
                    <td className="px-5 py-3 font-semibold text-gray-800">₹{order.total_amount?.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3">
                      <span className={clsx(
                        'px-2.5 py-0.5 rounded-full text-xs font-medium',
                        statusColors[order.status] ?? 'bg-gray-100 text-gray-700'
                      )}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
