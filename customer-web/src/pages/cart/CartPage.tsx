import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { formatCurrency } from '@/utils/formatting'

export default function CartPage() {
  const { t } = useTranslation('orders')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { language } = useAuthStore()
  const { items, subtotal, cartDiscount, deliveryCharge, gst, totalAmount, minOrderValue, loading, fetchCart, updateItem, removeItem } = useCartStore()

  useEffect(() => { fetchCart() }, [fetchCart])

  if (loading) {
    return (
      <div className="h-dvh flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex justify-center items-center"><Spinner /></div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50 pb-24 sm:pb-0">
      <Header />
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('orderSummary')}</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <ShoppingBag className="h-14 w-14 mb-4" />
            <p className="font-medium text-gray-600 mb-2">{t('noOrders')}</p>
            <p className="text-sm mb-6">{t('noOrdersDesc')}</p>
            <Button onClick={() => navigate('/')}>{t('shopNow')}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {items.map((item) => {
                const name = language === 'mr' ? item.product_name_mr : item.product_name_en
                return (
                  <div key={item.id} className="flex gap-3 p-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                      {item.primary_image ? (
                        <img src={item.primary_image} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🌿</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/product/${item.product_id}`)}
                        className="text-sm font-semibold text-gray-800 line-clamp-1 hover:text-primary-700 text-left"
                      >
                        {name}
                      </button>
                      {item.farmer_name && (
                        <p className="text-xs text-gray-400">{item.farmer_name}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatCurrency(item.product_price)} / {item.product_unit}
                      </p>
                      <p className="text-sm font-bold text-primary-700 mt-1">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateItem(item.product_id, Math.max(item.product_min_order_qty, item.quantity - 1))}
                          className="p-1.5 hover:bg-gray-100 disabled:opacity-40"
                          disabled={item.quantity <= item.product_min_order_qty}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-sm font-semibold min-w-[2rem] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateItem(item.product_id, Math.min(item.product_stock, item.quantity + 1))}
                          className="p-1.5 hover:bg-gray-100 disabled:opacity-40"
                          disabled={item.quantity >= item.product_stock}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Min order warning */}
            {minOrderValue > 0 && subtotal < minOrderValue && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                Add {formatCurrency(minOrderValue - subtotal)} more to place your order (minimum {formatCurrency(minOrderValue)})
              </div>
            )}

            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
              <h3 className="font-semibold text-gray-800">{t('orderSummary')}</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('subtotal')}</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-green-600 font-medium">− {formatCurrency(cartDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('deliveryCharge')}</span>
                <span className={deliveryCharge === 0 ? 'text-green-600 font-medium' : ''}>
                  {deliveryCharge === 0 ? tc('free') : formatCurrency(deliveryCharge)}
                </span>
              </div>
              {deliveryCharge > 0 && (
                <p className="text-xs text-gray-400">{t('freeDeliveryAbove')}</p>
              )}
              {gst > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">GST</span>
                  <span>{formatCurrency(gst)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold">
                <span>{t('grandTotal')}</span>
                <span className="text-primary-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <Button
              fullWidth
              size="lg"
              onClick={() => navigate('/checkout')}
              disabled={minOrderValue > 0 && subtotal < minOrderValue}
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
      </div>{/* end scroll wrapper */}
      <BottomNav />
    </div>
  )
}
