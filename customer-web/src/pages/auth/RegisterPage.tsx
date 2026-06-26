import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { AlertCircle, CheckCircle, User, Mail, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { AuthLayout } from '@/components/layout/AuthLayout'

export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()
  const { language, refreshUser } = useAuthStore()

  const state = location.state as { phone?: string; email?: string; from?: string } | null
  const isFromOTP = state?.from === 'otp'

  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState(state?.email ?? '')
  const [phone,    setPhone]    = useState(state?.phone ?? '')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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
      setDone(true)
      await refreshUser()
      setTimeout(() => navigate('/'), 1000)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } }
      setError(e?.response?.data?.detail || e?.response?.data?.message || tc('serverError'))
    } finally { setLoading(false) }
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden" style={{ borderTop: '5px solid #1a5c3a' }}>
          <div className="px-5 pt-5 pb-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #e8712e55)' }} />
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase italic" style={{ color: '#e8712e' }}>
                ✦ Your Trusted Family Farmer ✦
              </p>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #e8712e55)' }} />
            </div>
          </div>
          <div className="p-8 text-center">
            <div className="bg-green-50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome aboard!</h2>
            <p className="text-gray-400 text-sm">Your account has been created successfully.</p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden" style={{ borderTop: '5px solid #1a5c3a' }}>

        {/* Tagline strip */}
        <div className="px-5 pt-5 pb-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #e8712e55)' }} />
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase italic" style={{ color: '#e8712e' }}>
              ✦ Your Trusted Family Farmer ✦
            </p>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #e8712e55)' }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-3 pb-2 flex flex-col gap-3">
          {/* Heading */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">
              {isFromOTP ? 'Complete Your Profile' : 'Create Account'}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {isFromOTP ? 'Just a few details to get started' : 'Join thousands of happy customers'}
            </p>
          </div>

          {/* Verified identifier chip */}
          {(state?.phone || state?.email) && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-600 font-bold">Verified</p>
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
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                type="text" value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError('') }}
                placeholder="Your full name"
                autoFocus
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
              />
            </div>
          </div>

          {/* Phone (only if not already verified) */}
          {!state?.phone && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mobile Number</label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                <div className="bg-primary-50 px-3 flex items-center border-r border-gray-200 flex-shrink-0">
                  <span className="text-primary-700 font-bold text-sm">+91</span>
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
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Email <span className="normal-case font-normal text-gray-300">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input
                  type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="your@email.com"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 mt-1"
            style={{ background: 'linear-gradient(135deg, #c1440e 0%, #e8712e 100%)', boxShadow: '0 4px 14px rgba(193,68,14,0.4)' }}
          >
            {loading
              ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" /></svg>
              : <>{isFromOTP ? 'Complete Registration' : 'Create Account'} <ChevronRight className="h-4 w-4" /></>
            }
          </button>
        </form>

        {/* Footer */}
        <div className="px-5 pt-2 pb-5 text-center">
          <p className="text-xs text-gray-400">
            {t('alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-primary-700 font-bold hover:text-primary-900 transition-colors">
              {t('loginHere')}
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
