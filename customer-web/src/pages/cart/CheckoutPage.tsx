import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Plus, CheckCircle, MessageCircle, X, AlertCircle } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { orderService } from '@/services/order.service'
import { useCartStore } from '@/store/cartStore'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { AddressForm } from '@/components/address/AddressForm'
import { formatCurrency } from '@/utils/formatting'
import type { Address } from '@/types'
import type { AddressCreateData } from '@/services/order.service'

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery' },
  { id: 'upi', label: 'UPI' },
]

function OutOfZoneModal({
  address,
  whatsapp,
  onClose,
}: {
  address: Address
  whatsapp: string
  onClose: () => void
}) {
  const [requested, setRequested] = useState(false)
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hi! I'd like to place an order but my location (${address.city}, ${address.state} - ${address.pin_code}) is outside your delivery area. Can you help?`
      )}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-amber-50 border-b border-amber-100 px-5 py-4">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 flex-shrink-0">
              <MapPin className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Delivery Not Available</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {address.city}, {address.state} — {address.pin_code}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {!requested ? (
            <>
              <p className="text-sm text-gray-600 leading-relaxed">
                We're not currently delivering to your location through the app, but our team may be able to help you personally!
              </p>

              <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-xs text-teal-700">
                Our delivery zones are expanding. Check back soon or get in touch — we'll do our best to reach you.
              </div>

              <div className="space-y-2.5">
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98]"
                    style={{ background: '#25D366' }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat on WhatsApp
                  </a>
                )}

                <button
                  onClick={() => setRequested(true)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm border-2 border-[#0d9488] text-[#0d9488] hover:bg-teal-50 transition-colors"
                >
                  Raise a Request
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-[#0d9488]" />
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Request Raised!</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                We've noted your interest. Our team will reach out to you at the earliest.
              </p>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-[#25D366]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Also message us on WhatsApp
                </a>
              )}
              <button onClick={onClose} className="block w-full mt-4 text-sm text-gray-400 hover:text-gray-600">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const { t } = useTranslation('orders')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { items, subtotal, cartDiscount, deliveryCharge, gst, totalAmount, clear } = useCartStore()

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('cod')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [outOfZoneModal, setOutOfZoneModal] = useState(false)

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: orderService.getAddresses,
  })

  const { data: publicSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: orderService.getPublicSettings,
    staleTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (addresses?.length && !selectedAddressId) {
      const def = addresses.find((a) => a.is_default) ?? addresses[0]
      setSelectedAddressId(def.id)
    }
  }, [addresses, selectedAddressId])

  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId) ?? null

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || !selectedAddress) {
      setError('Please select a delivery address')
      return
    }
    setError('')

    // Delivery zone check
    try {
      const check = await orderService.checkDelivery(
        selectedAddress.state,
        selectedAddress.city,
        selectedAddress.pin_code
      )
      if (!check.allowed) {
        setOutOfZoneModal(true)
        return
      }
    } catch {
      // If check fails, allow order to proceed (fail-open)
    }

    setPlacing(true)
    try {
      const order = await orderService.placeOrder({
        address_id: selectedAddressId,
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

  const handleAddressSaved = async (data: AddressCreateData) => {
    const created = await orderService.createAddress(data)
    queryClient.invalidateQueries({ queryKey: ['addresses'] })
    setSelectedAddressId(created.id)
    setShowAddForm(false)
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

          {(addresses ?? []).length === 0 && !showAddForm ? (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">No saved addresses. Please add one to continue.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 text-sm text-primary-700 font-semibold mx-auto"
              >
                <Plus className="h-4 w-4" /> Add Delivery Address
              </button>
            </div>
          ) : !showAddForm ? (
            <div className="space-y-2">
              {(addresses ?? []).map((addr) => (
                <AddressOption
                  key={addr.id}
                  address={addr}
                  selected={selectedAddressId === addr.id}
                  onSelect={() => setSelectedAddressId(addr.id)}
                />
              ))}
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 text-xs text-primary-700 font-medium mt-2"
              >
                <Plus className="h-3.5 w-3.5" /> Add new address
              </button>
            </div>
          ) : (
            <AddressForm
              onSave={handleAddressSaved}
              onCancel={(addresses ?? []).length > 0 ? () => setShowAddForm(false) : undefined}
              saveLabel="Save & Use This Address"
              cancelLabel="Cancel"
              compact
            />
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
          {gst > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">GST</span>
              <span>{formatCurrency(gst)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>{t('grandTotal')}</span>
            <span className="text-primary-700">{formatCurrency(totalAmount)}</span>
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
        )}

        <Button
          fullWidth
          size="lg"
          loading={placing}
          onClick={handlePlaceOrder}
          disabled={showAddForm}
        >
          Place Order · {formatCurrency(totalAmount)}
        </Button>
      </div>

      {outOfZoneModal && selectedAddress && (
        <OutOfZoneModal
          address={selectedAddress}
          whatsapp={publicSettings?.business_whatsapp ?? ''}
          onClose={() => setOutOfZoneModal(false)}
        />
      )}
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
      <p className="text-sm font-medium text-gray-800">{address.recipient_name}</p>
      <p className="text-xs text-gray-500">{address.house}, {address.area}, {address.city} - {address.pin_code}</p>
      <p className="text-xs text-gray-400">{address.state}</p>
    </button>
  )
}
