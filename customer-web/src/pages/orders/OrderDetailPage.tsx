import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { orderService } from '@/services/order.service'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDateTime, getStatusColor, getProductName, getPrimaryImage } from '@/utils/formatting'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'

const STATUS_STEPS = ['pending', 'confirmed', 'packed', 'dispatched', 'delivered']

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation('orders')
  const { t: tc } = useTranslation('common')
  const { language } = useAuthStore()
  const queryClient = useQueryClient()
  const justPlaced = (location.state as { justPlaced?: boolean })?.justPlaced

  const [cancelling, setCancelling] = useState(false)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrderDetail(id!),
    enabled: !!id,
  })

  const handleCancel = async () => {
    if (!order || !confirm(t('confirmCancel'))) return
    setCancelling(true)
    try {
      await orderService.cancelOrder(order.id, 'Customer requested')
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    } finally {
      setCancelling(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!order) return null

  const stepIndex = STATUS_STEPS.indexOf(order.status)
  const canCancel = ['pending', 'confirmed'].includes(order.status)

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-gray-900">{t('orderDetail')}</h1>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Just placed banner */}
        {justPlaced && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">{t('orderPlaced')}</p>
              <p className="text-sm text-green-600">{t('thankYou')}</p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">#{order.order_id}</p>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusColor(order.status)}`}>
              {t(order.status as keyof typeof t)}
            </span>
          </div>
          <p className="text-xs text-gray-400">{formatDateTime(order.placed_at, language)}</p>

          {order.status !== 'cancelled' && (
            <div className="flex items-center gap-0 mt-4">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    i <= stepIndex ? 'bg-primary-700' : 'bg-gray-200'
                  }`}>
                    {i < stepIndex ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${i === stepIndex ? 'bg-white' : 'bg-gray-400'}`} />
                    )}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 ${i < stepIndex ? 'bg-primary-700' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{t('orderItems')}</h3>
          <div className="space-y-3">
            {order.items.map((item) => {
              const name = getProductName(item.product, language)
              const image = getPrimaryImage(item.product.images)
              return (
                <div key={item.id} className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    {image ? <img src={image} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🌿</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.unit_price)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{formatCurrency(item.subtotal)}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-700" /> {t('deliveryAddress')}
          </h3>
          <p className="text-sm font-medium text-gray-800">{order.delivery_address.full_name}</p>
          <p className="text-sm text-gray-500">
            {order.delivery_address.line1}, {order.delivery_address.area}, {order.delivery_address.city} - {order.delivery_address.pin_code}
          </p>
        </div>

        {/* Payment summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-500">{t('subtotal')}</span><span>{formatCurrency(order.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">{t('deliveryCharge')}</span><span>{order.delivery_charge === 0 ? tc('free') : formatCurrency(order.delivery_charge)}</span></div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-green-600"><span>{t('discount')}</span><span>-{formatCurrency(order.discount_amount)}</span></div>
          )}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>{t('grandTotal')}</span>
            <span className="text-primary-700">{formatCurrency(order.total_amount)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{t('paymentMethod')}</span><span>{t((order.payment_method as keyof typeof t) ?? 'cod')}</span>
          </div>
        </div>

        {canCancel && (
          <Button variant="danger" fullWidth loading={cancelling} onClick={handleCancel}>
            {t('cancelOrder')}
          </Button>
        )}
      </div>
    </div>
  )
}
