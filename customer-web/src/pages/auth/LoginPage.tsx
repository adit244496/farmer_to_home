import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, AlertCircle, Lock, Eye, EyeOff, ShieldCheck, Sprout, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'

type LoginMethod = 'phone' | 'email'
type LoginMode  = 'otp' | 'password'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { language, setLanguage, setUser } = useAuthStore()
  const navigate = useNavigate()

  const [mode,   setMode]   = useState<LoginMode>('otp')
  const [method, setMethod] = useState<LoginMethod>('phone')
  const [value,  setValue]  = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error,   setError]   = useState('')
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(160deg, #f0f8f4 0%, #e8f5ee 50%, #f5f0eb 100%)' }}>

      {/* Language toggle — top right */}
      <div className="absolute top-4 right-4">
        <div className="flex bg-white/80 backdrop-blur-sm rounded-xl p-1 gap-1 shadow-sm border border-white">
          {(['en', 'mr'] as const).map((lang) => (
            <button key={lang} onClick={() => setLanguage(lang)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                language === lang
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-primary-700'
              }`}>
              {lang === 'en' ? 'EN' : 'मर'}
            </button>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header band */}
        <div className="bg-primary-700 px-6 pt-8 pb-6 text-center">
          <img src="/logo.png" alt="Farmer to Home" className="h-20 mx-auto mb-2 drop-shadow-md" />
          <p className="text-wheat font-semibold text-sm tracking-wide">
            Your Trusted Family Farmer
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Heading */}
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'otp' ? 'Welcome Back!' : 'Login with Password'}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">Enter your details to continue</p>
          </div>

          {/* Method tabs: Mobile | Email */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
            {(['phone', 'email'] as const).map((m) => (
              <button key={m} onClick={() => { setMethod(m); setValue(''); setError('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  method === m
                    ? 'bg-primary-700 text-white shadow-md'
                    : 'text-gray-500 hover:text-primary-700'
                }`}>
                {m === 'phone'
                  ? <><span className="text-xs">📱</span> Mobile</>
                  : <><Mail className="h-3.5 w-3.5" /> Email</>}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Phone / Email input */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              {method === 'phone' ? 'Mobile Number' : 'Email Address'}
            </label>
            {method === 'phone' ? (
              <div className="flex rounded-xl overflow-hidden border border-gray-200 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                <div className="bg-primary-50 px-3 flex items-center border-r border-gray-200">
                  <span className="text-primary-700 font-bold text-sm">+91</span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={value}
                  onChange={(e) => { setValue(e.target.value.replace(/\D/g, '')); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && (mode === 'otp' ? handleSendOTP() : handlePasswordLogin())}
                  placeholder="10-digit number"
                  className="flex-1 px-4 py-3 text-sm outline-none bg-white"
                />
              </div>
            ) : (
              <input
                type="email"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && (mode === 'otp' ? handleSendOTP() : handlePasswordLogin())}
                placeholder="your@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
              />
            )}
            {mode === 'otp' && (
              <p className="text-xs text-gray-400 mt-1.5">
                An OTP will be sent to your {method === 'phone' ? 'mobile' : 'email'}
              </p>
            )}
          </div>

          {/* Password field */}
          {mode === 'password' && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{t('forgotPasswordHint')}</p>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={mode === 'otp' ? handleSendOTP : handlePasswordLogin}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            style={{ background: loading ? '#e88a5a' : 'linear-gradient(135deg, #c1440e 0%, #e8712e 100%)', boxShadow: '0 4px 15px rgba(193,68,14,0.35)' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                </svg>
                Please wait...
              </span>
            ) : (
              mode === 'otp'
                ? <>{t('sendOTP')} <span className="text-base">→</span></>
                : <>{t('login')} <span className="text-base">→</span></>
            )}
          </button>

          {/* Toggle mode */}
          <div className="text-center mt-4">
            {mode === 'otp' ? (
              <button onClick={() => switchMode('password')}
                className="flex items-center gap-1.5 mx-auto text-sm text-primary-700 hover:text-primary-900 font-medium transition-colors">
                <Lock className="h-3.5 w-3.5" />
                {t('loginWithPassword')}
              </button>
            ) : (
              <button onClick={() => switchMode('otp')}
                className="text-sm text-primary-700 hover:text-primary-900 font-medium transition-colors">
                ← {t('loginWithOTP')}
              </button>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-3 mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5 text-primary-600" />
              Secure
            </div>
            <span className="text-gray-200">·</span>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Sprout className="h-3.5 w-3.5 text-primary-600" />
              Trusted Farmers
            </div>
            <span className="text-gray-200">·</span>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Truck className="h-3.5 w-3.5 text-primary-600" />
              Fresh Produce
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-sm text-gray-400">
            New here?{' '}
            <Link to="/register" className="text-primary-700 font-bold hover:text-primary-900 transition-colors">
              Register →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
