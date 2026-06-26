import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Plus, CheckCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { orderService } from '@/services/order.service'
import { useCartStore } from '@/store/cartStore'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/formatting'
import type { Address } from '@/types'

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery' },
  { id: 'upi', label: 'UPI' },
]

export default function CheckoutPage() {
  const { t } = useTranslation('orders')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { items, subtotal, deliveryCharge, totalAmount, clear } = useCartStore()

  const [selectedAddress, setSelectedAddress] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('cod')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: orderService.getAddresses,
  })

  useEffect(() => {
    if (addresses?.length && !selectedAddress) {
      const def = addresses.find((a) => a.is_default) ?? addresses[0]
      setSelectedAddress(def.id)
    }
  }, [addresses, selectedAddress])

  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { setError('Please select a delivery address'); return }
    setError('')
    setPlacing(true)
    try {
      const order = await orderService.placeOrder({
        delivery_address_id: selectedAddress,
        payment_method: paymentMethod,
      })
      clear()
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } }
      setError(e?.response?.data?.detail || e?.response?.data?.message || tc('serverError'))
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-gray-900">Checkout</h1>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Delivery address */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-700" /> {t('deliveryAddress')}
          </h2>
          {(addresses ?? []).length === 0 ? (
            <button
              onClick={() => navigate('/profile/addresses')}
              className="flex items-center gap-2 text-sm text-primary-700 font-medium"
            >
              <Plus className="h-4 w-4" /> Add delivery address
            </button>
          ) : (
            <div className="space-y-2">
              {(addresses ?? []).map((addr) => (
                <AddressOption
                  key={addr.id}
                  address={addr}
                  selected={selectedAddress === addr.id}
                  onSelect={() => setSelectedAddress(addr.id)}
                />
              ))}
              <button
                onClick={() => navigate('/profile/addresses')}
                className="flex items-center gap-1 text-xs text-primary-700 font-medium mt-2"
              >
                <Plus className="h-3.5 w-3.5" /> Add new address
              </button>
            </div>
          )}
        </section>

        {/* Payment method */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-3">{t('paymentMethod')}</h2>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id as 'cod' | 'upi')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${
                  paymentMethod === pm.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-medium text-gray-800">{pm.label}</span>
                {paymentMethod === pm.id && <CheckCircle className="h-4 w-4 text-primary-600" />}
              </button>
            ))}
          </div>
        </section>

        {/* Order summary */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <h2 className="font-semibold text-gray-800 mb-2">{t('orderSummary')}</h2>
          <div className="flex justify-between text-sm"><span className="text-gray-500">{t('subtotal')}</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('deliveryCharge')}</span>
            <span className={deliveryCharge === 0 ? 'text-green-600 font-medium' : ''}>{deliveryCharge === 0 ? tc('free') : formatCurrency(deliveryCharge)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>{t('grandTotal')}</span>
            <span className="text-primary-700">{formatCurrency(totalAmount)}</span>
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
        )}

        <Button fullWidth size="lg" loading={placing} onClick={handlePlaceOrder}>
          Place Order · {formatCurrency(totalAmount)}
        </Button>
      </div>
    </div>
  )
}

function AddressOption({
  address,
  selected,
  onSelect,
}: {
  address: Address
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
        selected ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase">{address.label}</span>
        {selected && <CheckCircle className="h-4 w-4 text-primary-600" />}
      </div>
      <p className="text-sm font-medium text-gray-800">{address.full_name}</p>
      <p className="text-xs text-gray-500">{address.line1}, {address.area}, {address.city} - {address.pin_code}</p>
    </button>
  )
}
