import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2, Navigation } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type { AddressCreateData } from '@/services/order.service'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

const EMPTY: AddressCreateData = {
  label: 'Home',
  recipient_name: '',
  phone: '',
  house: '',
  area: '',
  city: '',
  state: 'Maharashtra',
  pin_code: '',
  is_default: true,
}

interface Props {
  initial?: Partial<AddressCreateData>
  onSave: (data: AddressCreateData) => Promise<void>
  onCancel?: () => void
  saveLabel?: string
  cancelLabel?: string
  compact?: boolean
}

export function AddressForm({ initial, onSave, onCancel, saveLabel = 'Save Address', cancelLabel = 'Cancel', compact = false }: Props) {
  const [form, setForm] = useState<AddressCreateData>({ ...EMPTY, ...initial })
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [pinLookup, setPinLookup] = useState(false)
  const [error, setError] = useState('')
  const pinLookupRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const set = (k: keyof AddressCreateData, v: string | boolean | number) =>
    setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (form.pin_code.length !== 6) return
    if (pinLookupRef.current) clearTimeout(pinLookupRef.current)
    pinLookupRef.current = setTimeout(async () => {
      setPinLookup(true)
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${form.pin_code}`)
        const data = await res.json()
        if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0]
          setForm((p) => ({
            ...p,
            city: po.Division || po.District || po.Name || p.city,
            state: INDIAN_STATES.find((s) => s.toLowerCase() === (po.State || '').toLowerCase()) || po.State || p.state,
          }))
        }
      } catch {
        // silent — user can fill manually
      } finally {
        setPinLookup(false)
      }
    }, 400)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pin_code])

  const useMyLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const a = data.address ?? {}
          const city = a.city || a.town || a.village || a.county || ''
          const state = a.state || ''
          const pincode = a.postcode || ''
          const area = a.suburb || a.neighbourhood || a.road || ''
          setForm((p) => ({
            ...p,
            city,
            state: INDIAN_STATES.find((s) => s.toLowerCase() === state.toLowerCase()) || state,
            pin_code: pincode.replace(/\s/g, '').slice(0, 6),
            area: area || p.area,
            lat,
            lng,
          }))
        } catch {
          setError('Could not fetch location details. Please fill manually.')
        } finally {
          setLocating(false)
        }
      },
      () => {
        setError('Location access denied. Please fill address manually.')
        setLocating(false)
      }
    )
  }

  const handleSave = async () => {
    if (!form.recipient_name.trim()) { setError('Full name is required'); return }
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone.trim())) { setError('Enter a valid 10-digit mobile number'); return }
    if (!form.house.trim()) { setError('House / Flat number is required'); return }
    if (!form.city.trim()) { setError('City is required'); return }
    if (!form.pin_code.trim() || !/^\d{6}$/.test(form.pin_code.trim())) { setError('Enter a valid 6-digit PIN code'); return }
    setError('')
    setLoading(true)
    try {
      await onSave(form)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail || 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15'
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5'

  return (
    <div className="space-y-4">
      {/* Label chips */}
      <div>
        <p className={labelCls}>Address Label</p>
        <div className="flex gap-2">
          {['Home', 'Work', 'Other'].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => set('label', l)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                form.label === l
                  ? 'border-[#0d9488] bg-teal-50 text-[#0d9488]'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Use my location */}
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-[#0d9488]/40 rounded-xl text-sm font-medium text-[#0d9488] hover:bg-teal-50 transition-colors disabled:opacity-60"
      >
        {locating
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Detecting location…</>
          : <><Navigation className="h-4 w-4" /> Use My Location</>
        }
      </button>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {/* Fields */}
      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        <div className={compact ? 'grid grid-cols-2 gap-3' : ''}>
          <div>
            <label className={labelCls}>Full Name *</label>
            <input className={inputCls} placeholder="Recipient's full name" value={form.recipient_name}
              onChange={(e) => { set('recipient_name', e.target.value); setError('') }} />
          </div>
          <div>
            <label className={labelCls}>Mobile Number *</label>
            <div className="flex rounded-xl overflow-hidden border border-gray-200 focus-within:border-[#0d9488] focus-within:ring-2 focus-within:ring-[#0d9488]/15 transition">
              <span className="flex items-center bg-teal-50 px-3 text-sm font-semibold text-[#0d9488] border-r border-gray-200">+91</span>
              <input
                type="tel" inputMode="numeric" maxLength={10}
                className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                placeholder="10-digit number"
                value={form.phone}
                onChange={(e) => { set('phone', e.target.value.replace(/\D/g, '')); setError('') }}
              />
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>House / Flat / Building *</label>
          <input className={inputCls} placeholder="e.g. Flat 4B, Shreeji Apartments" value={form.house}
            onChange={(e) => { set('house', e.target.value); setError('') }} />
        </div>

        <div>
          <label className={labelCls}>Area / Street / Locality</label>
          <input className={inputCls} placeholder="e.g. Baner Road" value={form.area}
            onChange={(e) => set('area', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>PIN Code *</label>
            <div className="relative">
              <input className={inputCls} placeholder="6-digit PIN" inputMode="numeric" maxLength={6}
                value={form.pin_code}
                onChange={(e) => { set('pin_code', e.target.value.replace(/\D/g, '')); setError('') }} />
              {pinLookup && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[#0d9488]" />
              )}
            </div>
          </div>
          <div>
            <label className={labelCls}>City *</label>
            <input className={inputCls} placeholder="e.g. Pune" value={form.city}
              onChange={(e) => { set('city', e.target.value); setError('') }} />
          </div>
        </div>

        <div>
          <label className={labelCls}>State *</label>
          <SearchableSelect
            options={INDIAN_STATES}
            value={form.state}
            onChange={(v) => set('state', v)}
            placeholder="Select state…"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="rounded accent-[#0d9488]"
            checked={form.is_default}
            onChange={(e) => set('is_default', e.target.checked)} />
          Set as default address
        </label>
      </div>

      {/* Map pin hint if location was auto-filled */}
      {form.lat && form.lng && (
        <p className="flex items-center gap-1 text-xs text-[#0d9488]">
          <MapPin className="h-3.5 w-3.5" />
          Location pinned ({form.lat.toFixed(4)}, {form.lng.toFixed(4)})
        </p>
      )}

      {/* Actions */}
      <div className={`flex gap-3 pt-1 ${compact ? '' : 'pt-2'}`}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #115e59 0%, #0d9488 100%)' }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : saveLabel}
        </button>
      </div>
    </div>
  )
}
