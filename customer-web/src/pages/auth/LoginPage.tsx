import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, AlertCircle, Lock, Eye, EyeOff, ShieldCheck, Sprout, Truck, Smartphone, Loader2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { AuthLayout } from '@/components/layout/AuthLayout'

type LoginMethod = 'phone' | 'email'
type LoginMode   = 'otp'   | 'password'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  const [mode, setMode] = useState<LoginMode>('otp')
  const [method, setMethod] = useState<LoginMethod>('phone')
  const [value, setValue] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = (m: LoginMode) => { setMode(m); setValue(''); setPassword(''); setError('') }

  const validateIdentifier = (): string => {
    if (method === 'phone') {
      if (!value.trim()) return t('phoneRequired')
      if (!/^\d{10}$/.test(value.trim())) return t('phoneInvalid')
    } else {
      if (!value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return t('emailInvalid')
    }
    return ''
  }

  const handleSendOTP = async () => {
    const err = validateIdentifier()
    if (err) { setError(err); return }
    setError(''); setLoading(true)
    try {
      if (method === 'phone') {
        await authService.requestOTP(value.trim())
        navigate('/auth/otp', { state: { phone: value.trim(), method: 'phone' } })
      } else {
        await authService.requestEmailOTP(value.trim())
        navigate('/auth/otp', { state: { email: value.trim(), method: 'email' } })
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail || tc('serverError'))
    } finally { setLoading(false) }
  }

  const handlePasswordLogin = async () => {
    const err = validateIdentifier()
    if (err) { setError(err); return }
    if (!password) { setError(t('passwordRequired')); return }
    setError(''); setLoading(true)
    try {
      const id = method === 'phone' ? { phone: value.trim() } : { email: value.trim() }
      const result = await authService.loginWithPassword(id, password)
      setUser(result.user, result.access, result.refresh)
      navigate('/')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail || tc('serverError'))
    } finally { setLoading(false) }
  }

  const submit = () => (mode === 'otp' ? handleSendOTP() : handlePasswordLogin())

  return (
    <AuthLayout>
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-8 bg-gradient-to-br from-[#f0fdfa] via-white to-[#f0fdfa]">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#0d9488]/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-[#d4a23a]/15 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Card */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-15px_rgba(13,148,136,0.2)] ring-1 ring-black/5">
            {/* Logo header */}
            <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-b from-[#f0fdfa] to-white px-6 pt-8 pb-6 text-center">
              <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 w-40 -translate-y-8 rounded-full bg-[#0d9488]/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 right-0 h-32 w-32 rounded-full bg-[#d4a23a]/15 blur-3xl" />

              <img
                src="/logo_new.png"
                alt="Farmer to Home"
                className="relative mx-auto h-28 w-28 object-contain drop-shadow-[0_8px_20px_rgba(15,107,107,0.25)]"
              />

              <p className="relative mt-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#0d9488]/70">
                Fresh · Direct · Trusted
              </p>

              <h1 className="relative mt-4 text-2xl font-bold text-[#115e59]">
                Welcome back <span className="inline-block">👋</span>
              </h1>
              <p className="relative mt-1 text-sm text-[#115e59]/60">
                Fresh harvests, delivered to your home.
              </p>
            </div>

            {/* Body */}
            <div className="px-8 py-7">
              {/* Method tabs */}
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
                {(['phone', 'email'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMethod(m); setValue(''); setError('') }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                      method === m
                        ? 'bg-white text-[#0f766e] shadow-sm ring-1 ring-black/5'
                        : 'text-gray-400 hover:text-[#0f766e]'
                    }`}
                  >
                    {m === 'phone' ? <><Smartphone className="h-4 w-4" /> Mobile</> : <><Mail className="h-4 w-4" /> Email</>}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-xs font-medium text-red-700">{error}</p>
                </div>
              )}

              {/* Identifier */}
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                {method === 'phone' ? 'Mobile Number' : 'Email Address'}
              </label>
              {method === 'phone' ? (
                <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-[#0d9488] focus-within:ring-2 focus-within:ring-[#0d9488]/15 transition">
                  <span className="flex items-center bg-teal-50 px-3 text-sm font-semibold text-[#0d9488]">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={value}
                    onChange={(e) => { setValue(e.target.value.replace(/\D/g, '')); setError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="10-digit number"
                    className="flex-1 bg-white px-3 py-2.5 text-sm outline-none"
                  />
                </div>
              ) : (
                <input
                  type="email"
                  value={value}
                  onChange={(e) => { setValue(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15"
                />
              )}
              {mode === 'otp' && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  We'll send a one-time code to your {method === 'phone' ? 'mobile' : 'email'}.
                </p>
              )}

              {/* Password */}
              {mode === 'password' && (
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a293]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-10 py-2.5 text-sm outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a293] hover:text-gray-500"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">{t('forgotPasswordHint')}</p>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={submit}
                disabled={loading}
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f766e] to-[#0d9488] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0d9488]/25 transition-all hover:shadow-xl hover:shadow-[#0d9488]/35 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'otp' ? t('sendOTP') : t('login')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              {/* Toggle mode */}
              <div className="mt-4 text-center">
                {mode === 'otp' ? (
                  <button
                    onClick={() => switchMode('password')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0d9488] hover:text-[#0f766e]"
                  >
                    <Lock className="h-3.5 w-3.5" /> Login with Password
                  </button>
                ) : (
                  <button
                    onClick={() => switchMode('otp')}
                    className="text-xs font-semibold text-[#0d9488] hover:text-[#0f766e]"
                  >
                    ← {t('loginWithOTP')}
                  </button>
                )}
              </div>
            </div>

            {/* Trust footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-8 py-4">
              <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-gray-400">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#0d9488]" /> Secure</span>
                <span className="h-1 w-1 rounded-full bg-[#d4a23a]" />
                <span className="inline-flex items-center gap-1.5"><Sprout className="h-3.5 w-3.5 text-[#0d9488]" /> Trusted Farmers</span>
                <span className="h-1 w-1 rounded-full bg-[#d4a23a]" />
                <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-[#0d9488]" /> Fresh Daily</span>
              </div>
            </div>
          </div>

          {/* Register link */}
          <p className="mt-5 text-center text-sm text-gray-500">
            New to our farm family?{' '}
            <Link to="/auth/register" className="font-semibold text-[#0d9488] underline-offset-4 hover:underline">
              Create an account →
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
