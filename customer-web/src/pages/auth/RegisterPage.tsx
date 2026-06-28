import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { AlertCircle, CheckCircle, User, Mail, ChevronRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { orderService } from '@/services/order.service'
import { useAuthStore } from '@/store/authStore'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AddressForm } from '@/components/address/AddressForm'
import type { AddressCreateData } from '@/services/order.service'

const ctaStyle = {
  background: 'linear-gradient(135deg, #115e59 0%, #0d9488 100%)',
  boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(13,148,136,0.2)] ring-1 ring-black/5 border border-gray-100">
      {/* Logo header */}
      <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-b from-[#f0fdfa] to-white px-6 pt-6 pb-4 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[#0d9488]/5 blur-2xl" />
        <img src="/logo_new.png" alt="Farmer to Home" className="relative mx-auto h-20 w-20 object-contain drop-shadow-[0_4px_12px_rgba(13,148,136,0.2)]" />
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-[#0d9488]/15 to-transparent" />
      {children}
    </div>
  )
}

type Step = 'profile' | 'address' | 'done'

export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()
  const { language, refreshUser } = useAuthStore()

  const state = location.state as { phone?: string; email?: string; from?: string } | null
  const isFromOTP = state?.from === 'otp'

  const [step, setStep] = useState<Step>('profile')
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState(state?.email ?? '')
  const [phone,    setPhone]    = useState(state?.phone ?? '')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) { setError(t('nameRequired')); return }
    setError(''); setLoading(true)
    try {
      await authService.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        language_preference: language,
      })
      await refreshUser()
      setStep('address')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } }
      setError(e?.response?.data?.detail || e?.response?.data?.message || tc('serverError'))
    } finally { setLoading(false) }
  }

  const handleAddressSkip = () => navigate('/')

  const handleAddressSave = async (data: AddressCreateData) => {
    await orderService.createAddress(data)
    setStep('done')
    setTimeout(() => navigate('/'), 1000)
  }

  if (step === 'done') {
    return (
      <AuthLayout>
        <CardShell>
          <div className="px-8 py-8 text-center">
            <div className="bg-teal-50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-[#0d9488]" />
            </div>
            <h2 className="text-xl font-bold text-[#115e59] mb-1">Welcome aboard!</h2>
            <p className="text-gray-400 text-sm">Your account has been set up successfully.</p>
          </div>
        </CardShell>
      </AuthLayout>
    )
  }

  if (step === 'address') {
    return (
      <AuthLayout>
        <div className="overflow-hidden rounded-3xl bg-white w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(13,148,136,0.2)] ring-1 ring-black/5 border border-gray-100">
          <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-b from-[#f0fdfa] to-white px-6 pt-5 pb-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[#0d9488]/5 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0d9488] text-white text-[10px] font-bold">2</span>
                <p className="text-xs font-semibold text-[#0d9488] uppercase tracking-wide">Step 2 of 2</p>
              </div>
              <h2 className="text-lg font-bold text-[#115e59]">Add Delivery Address</h2>
              <p className="text-xs text-gray-400 mt-0.5">So we know where to deliver your fresh produce</p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-[#0d9488]/15 to-transparent" />
          <div className="px-6 py-5">
            <AddressForm
              onSave={handleAddressSave}
              onCancel={handleAddressSkip}
              saveLabel="Save & Continue"
              cancelLabel="Skip for Now"
              compact
            />
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <CardShell>
        <form onSubmit={handleProfileSubmit} className="px-6 pt-5 pb-2 flex flex-col gap-3">
          {/* Heading */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0d9488] text-white text-[10px] font-bold">1</span>
              <p className="text-xs font-semibold text-[#0d9488] uppercase tracking-wide">Step 1 of 2</p>
            </div>
            <h2 className="text-lg font-bold text-[#115e59] leading-tight">
              {isFromOTP ? 'Complete Your Profile' : 'Create Account'}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {isFromOTP ? 'Just a few details to get started' : 'Join thousands of happy customers'}
            </p>
          </div>

          {/* Verified identifier chip */}
          {(state?.phone || state?.email) && (
            <div className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5">
              <CheckCircle className="h-4 w-4 text-[#0d9488] flex-shrink-0" />
              <div>
                <p className="text-xs text-[#0f766e] font-bold">Verified</p>
                <p className="text-sm font-bold text-gray-800">{state?.phone ?? state?.email}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                type="text" value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError('') }}
                placeholder="Your full name"
                autoFocus
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15"
              />
            </div>
          </div>

          {/* Phone (only if not already verified) */}
          {!state?.phone && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Mobile Number</label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 focus-within:border-[#0d9488] focus-within:ring-2 focus-within:ring-[#0d9488]/15 transition">
                <div className="bg-teal-50 px-3 flex items-center border-r border-gray-200 flex-shrink-0">
                  <span className="text-[#0d9488] font-bold text-sm">+91</span>
                </div>
                <input
                  type="tel" inputMode="numeric" maxLength={10}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
                  placeholder="10-digit number"
                  className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                />
              </div>
            </div>
          )}

          {/* Email (only if not already verified) */}
          {!state?.email && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Email <span className="normal-case font-normal text-gray-300">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input
                  type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="your@email.com"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 mt-1"
            style={ctaStyle}
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <>Next: Add Address <ChevronRight className="h-4 w-4" /></>
            }
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 pt-3 pb-5 text-center">
          <p className="text-xs text-gray-400">
            {t('alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-[#0d9488] font-semibold hover:text-[#0f766e] transition-colors">
              {t('loginHere')}
            </Link>
          </p>
        </div>
      </CardShell>
    </AuthLayout>
  )
}
