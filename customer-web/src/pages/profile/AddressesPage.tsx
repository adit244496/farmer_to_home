import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, MapPin } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { orderService } from '@/services/order.service'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import type { Address } from '@/types'

export default function AddressesPage() {
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: orderService.getAddresses,
  })

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this address?')) return
    await orderService.deleteAddress(id)
    queryClient.invalidateQueries({ queryKey: ['addresses'] })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-gray-900 flex-1">Manage Addresses</h1>
        <button
          onClick={() => setShowForm(true)}
          className="text-primary-700 hover:text-primary-800"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (addresses ?? []).length === 0 && !showForm ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <MapPin className="h-12 w-12 mb-3" />
            <p className="font-medium text-gray-600">No saved addresses</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Add Address
            </Button>
          </div>
        ) : (
          <>
            {(addresses ?? []).map((addr) => (
              <div key={addr.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">{addr.label}</span>
                    {addr.is_default && (
                      <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Default</span>
                    )}
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{addr.full_name}</p>
                    <p className="text-xs text-gray-500">{addr.line1}, {addr.area}, {addr.city} - {addr.pin_code}</p>
                    <p className="text-xs text-gray-400">{addr.phone}</p>
                  </div>
                  <button onClick={() => handleDelete(addr.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {showForm && (
          <AddAddressForm
            onSave={() => {
              queryClient.invalidateQueries({ queryKey: ['addresses'] })
              setShowForm(false)
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {!showForm && (addresses ?? []).length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add new address
          </button>
        )}
      </div>
    </div>
  )
}

function AddAddressForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const { t: tc } = useTranslation('common')
  const [form, setForm] = useState<Omit<Address, 'id'>>({
    label: 'Home',
    full_name: '',
    phone: '',
    line1: '',
    area: '',
    city: '',
    state: 'Maharashtra',
    pin_code: '',
    is_default: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!form.full_name || !form.phone || !form.line1 || !form.city || !form.pin_code) {
      setError('Please fill all required fields')
      return
    }
    setLoading(true)
    try {
      await orderService.createAddress(form)
      onSave()
    } catch {
      setError(tc('serverError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <h3 className="font-semibold text-gray-800">New Address</h3>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        {['Home', 'Work', 'Other'].map((l) => (
          <button
            key={l}
            onClick={() => set('label', l)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors ${
              form.label === l ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <Input label="Full Name *" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
      <Input label="Phone *" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      <Input label="Address Line 1 *" value={form.line1} onChange={(e) => set('line1', e.target.value)} />
      <Input label="Area" value={form.area} onChange={(e) => set('area', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="City *" value={form.city} onChange={(e) => set('city', e.target.value)} />
        <Input label="PIN Code *" type="tel" maxLength={6} value={form.pin_code} onChange={(e) => set('pin_code', e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={form.is_default} onChange={(e) => set('is_default', e.target.checked)} className="rounded" />
        Set as default address
      </label>

      <div className="flex gap-3">
        <Button variant="outline" fullWidth onClick={onCancel}>{tc('cancel')}</Button>
        <Button fullWidth loading={loading} onClick={handleSave}>{tc('save')}</Button>
      </div>
    </div>
  )
}
