import { useState, useEffect, FormEvent } from 'react'
import { User, MapPin, Wheat, Star, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

const PRODUCE_TYPES = ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Spices', 'Pulses', 'Other']

const statusConfig: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  pending: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  suspended: { label: 'Suspended', color: 'bg-gray-100 text-gray-700' },
}

export default function ProfilePage() {
  const { farmerProfile, refreshProfile } = useAuthStore()

  const [form, setForm] = useState({
    full_name: '',
    bio: '',
    farm_description: '',
    district: '',
    taluka: '',
    village: '',
    farm_size_acres: '',
    produce_types: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (farmerProfile) {
      setForm({
        full_name: farmerProfile.full_name ?? '',
        bio: farmerProfile.bio ?? '',
        farm_description: farmerProfile.farm_description ?? '',
        district: farmerProfile.district ?? '',
        taluka: farmerProfile.taluka ?? '',
        village: farmerProfile.village ?? '',
        farm_size_acres: String(farmerProfile.farm_size_acres ?? ''),
        produce_types: farmerProfile.produce_types ?? [],
      })
    }
  }, [farmerProfile])

  const set = (field: keyof typeof form, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleProduce = (type: string) => {
    setForm((prev) => ({
      ...prev,
      produce_types: prev.produce_types.includes(type)
        ? prev.produce_types.filter((t) => t !== type)
        : [...prev.produce_types, type],
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!form.full_name.trim()) { setError('Full name is required'); return }

    setLoading(true)
    try {
      await api.patch('/farmers/me/', {
        full_name: form.full_name.trim(),
        bio: form.bio.trim(),
        farm_description: form.farm_description.trim(),
        district: form.district.trim(),
        taluka: form.taluka.trim(),
        village: form.village.trim(),
        farm_size_acres: parseFloat(form.farm_size_acres) || 0,
        produce_types: form.produce_types,
      })
      setSuccess(true)
      await refreshProfile()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(axiosErr?.response?.data?.detail || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const status = farmerProfile?.approval_status ?? 'pending'
  const sc = statusConfig[status] ?? statusConfig.pending

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your farmer profile</p>
      </div>

      {/* Status + stats overview */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 rounded-full h-14 w-14 flex items-center justify-center flex-shrink-0">
              <span className="text-green-700 font-bold text-xl">
                {farmerProfile?.full_name?.charAt(0)?.toUpperCase() ?? 'F'}
              </span>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{farmerProfile?.full_name}</h2>
              <p className="text-gray-500 text-sm">{farmerProfile?.phone}</p>
              <span className={clsx('inline-flex mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', sc.color)}>
                {sc.label}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <StatItem
              icon={<Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
              value={farmerProfile?.rating?.toFixed(1) ?? '—'}
              label="Rating"
            />
            <StatItem
              icon={<Wheat className="h-4 w-4 text-green-600" />}
              value={farmerProfile?.total_orders_fulfilled ?? 0}
              label="Orders"
            />
            <StatItem
              icon={<Calendar className="h-4 w-4 text-blue-500" />}
              value={farmerProfile?.member_since ? new Date(farmerProfile.member_since).getFullYear() : '—'}
              label="Since"
            />
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" /> Profile updated successfully!
          </div>
        )}

        {/* Personal */}
        <Section icon={<User className="h-4 w-4 text-gray-500" />} title="Personal Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Phone (read-only)">
              <input
                type="tel"
                value={farmerProfile?.phone ?? ''}
                readOnly
                className={clsx(inputCls, 'bg-gray-50 text-gray-500 cursor-not-allowed')}
              />
            </Field>
          </div>
          <Field label="Bio">
            <textarea
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              placeholder="A short bio about yourself..."
              rows={2}
              className={inputCls}
            />
          </Field>
          <Field label="Farm Description">
            <textarea
              value={form.farm_description}
              onChange={(e) => set('farm_description', e.target.value)}
              placeholder="Describe your farm..."
              rows={3}
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Location */}
        <Section icon={<MapPin className="h-4 w-4 text-gray-500" />} title="Location">
          <div className="grid grid-cols-2 gap-4">
            <Field label="District">
              <input type="text" value={form.district} onChange={(e) => set('district', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Taluka">
              <input type="text" value={form.taluka} onChange={(e) => set('taluka', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Village">
              <input type="text" value={form.village} onChange={(e) => set('village', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Farm Size (acres)">
              <input
                type="number"
                value={form.farm_size_acres}
                onChange={(e) => set('farm_size_acres', e.target.value)}
                min="0"
                step="0.1"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* Produce types */}
        <Section icon={<Wheat className="h-4 w-4 text-gray-500" />} title="Produce Types">
          <div className="grid grid-cols-2 gap-2">
            {PRODUCE_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.produce_types.includes(type)}
                  onChange={() => toggleProduce(type)}
                  className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">{type}</span>
              </label>
            ))}
          </div>
        </Section>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Saving...
            </span>
          ) : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {icon}
        <span className="font-bold text-gray-800 text-sm">{value}</span>
      </div>
      <p className="text-gray-500 text-xs">{label}</p>
    </div>
  )
}
