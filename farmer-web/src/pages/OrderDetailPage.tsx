import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, MapPin, User, Package } from 'lucide-react'
import api from '@/lib/api'
import type { Order } from '@/types'
import clsx from 'clsx'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  dispatched: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const nextStatusMap: Record<string, { status: string; label: string; color: string }> = {
  pending: { status: 'confirmed', label: 'Confirm Order', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  confirmed: { status: 'dispatched', label: 'Mark as Dispatched', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  dispatched: { status: 'delivered', label: 'Mark as Delivered', color: 'bg-green-600 hover:bg-green-700 text-white' },
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    api.get<Order>(`/farmers/me/orders/${id}/`)
      .then((res) => setOrder(res.data))
      .catch(() => setError('Failed to load order details'))
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true)
    setUpdateError('')
    try {
      await api.patch(`/farmers/me/orders/${id}/status/`, { status: newStatus })
      setOrder((prev) => prev ? { ...prev, status: newStatus } : prev)
    } catch {
      setUpdateError('Failed to update order status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </button>
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error || 'Order not found'}
        </div>
      </div>
    )
  }

  const next = nextStatusMap[order.status]

  return (
    <div className="p-6 max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Order #{order.order_id}</h1>
            <span className={clsx(
              'px-3 py-0.5 rounded-full text-xs font-semibold border',
              statusColors[order.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
            )}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {updateError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {updateError}
        </div>
      )}

      {/* Customer info */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Customer Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Name" value={order.customer?.full_name ?? '—'} />
          <InfoItem label="Phone" value={order.customer?.phone ?? '—'} />
        </div>
      </div>

      {/* Delivery address */}
      {order.delivery_address && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-gray-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Delivery Address</h3>
          </div>
          <p className="text-gray-700 text-sm">
            {order.delivery_address.area}{order.delivery_address.city ? `, ${order.delivery_address.city}` : ''}
            {order.delivery_address.pin_code ? ` - ${order.delivery_address.pin_code}` : ''}
          </p>
        </div>
      )}

      {/* Order items */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Package className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Order Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Product</th>
                <th className="text-right px-5 py-3 font-medium">Qty</th>
                <th className="text-right px-5 py-3 font-medium">Unit Price</th>
                <th className="text-right px-5 py-3 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-gray-800 font-medium">{item.product_name}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="px-5 py-3 text-right text-gray-600">₹{item.unit_price?.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">₹{item.subtotal?.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={3} className="px-5 py-3 text-right font-semibold text-gray-700">Total</td>
                <td className="px-5 py-3 text-right font-bold text-green-700 text-base">
                  ₹{order.total_amount?.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Status update */}
      {next && order.status !== 'cancelled' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Update Order Status</h3>
          <div className="flex gap-3">
            <button
              onClick={() => handleStatusUpdate(next.status)}
              disabled={updating}
              className={clsx(
                'flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60',
                next.color
              )}
            >
              {updating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  Updating...
                </span>
              ) : next.label}
            </button>
            {order.status === 'pending' && (
              <button
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={updating}
                className="px-5 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}
