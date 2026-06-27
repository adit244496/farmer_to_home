import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import api from '@/lib/api'
import type { Order, PaginatedResponse } from '@/types'
import clsx from 'clsx'

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

const ORDER_STATUSES = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled']

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    dispatched: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span
      className={clsx(
        'inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize',
        map[status] ?? 'bg-gray-100 text-gray-600',
      )}
    >
      {status}
    </span>
  )
}

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const [updatingOrder, setUpdatingOrder] = useState<number | null>(null)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders', status, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page }
      if (status) params.status = status
      const res = await api.get('/admin/orders', { params })
      return res.data
    },
  })

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    setUpdatingOrder(orderId)
    setOpenDropdown(null)
    setUpdateError(null)
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setUpdateError(axiosErr?.response?.data?.detail ?? 'Failed to update order status.')
    } finally {
      setUpdatingOrder(null)
    }
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <div className="space-y-4" onClick={() => setOpenDropdown(null)}>
      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatus(tab.key)
              setPage(1)
            }}
            className={clsx(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              status === tab.key
                ? 'bg-farm-green-700 text-white'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {updateError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {updateError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-7 w-7 animate-spin text-farm-green-600" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 m-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {(error as { message?: string })?.message ?? 'Failed to load orders.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 font-medium">Order ID</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.items && data.items.length > 0 ? (
                    data.items.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {order.order_id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {order.customer.full_name}
                          </div>
                          <div className="text-xs text-gray-400">{order.customer.phone}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          ₹{order.total_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative inline-block">
                            <button
                              onClick={() =>
                                setOpenDropdown(openDropdown === order.id ? null : order.id)
                              }
                              disabled={updatingOrder === order.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              {updatingOrder === order.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  Change
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </>
                              )}
                            </button>
                            {openDropdown === order.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                                {ORDER_STATUSES.filter((s) => s !== order.status).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => handleStatusUpdate(order.id, s)}
                                    className="w-full text-left px-3 py-2 text-xs capitalize hover:bg-gray-50 text-gray-700 transition-colors"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                        No orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} · {data?.total ?? 0} total
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
