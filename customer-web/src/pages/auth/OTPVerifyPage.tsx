import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff, Lock, ChevronRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { AuthLayout } from '@/components/layout/AuthLayout'

const OTP_LENGTH = 6
const RESEND_DELAY = 30
type Step = 'otp' | 'password'

const TEAL = '#0d9488'
const TEAL_DARK = '#0f766e'
const TEAL_DEEP = '#115e59'
const ctaStyle = { background: `linear-gradient(135deg, ${TEAL_DEEP} 0%, ${TEAL} 100%)`, boxShadow: `0 4px 14px rgba(13,148,136,0.35)` }

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(13,148,136,0.2)] ring-1 ring-black/5">
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

export default function OTPVerifyPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuthStore()

  const state = location.state as { phone?: string; email?: string; method?: 'phone' | 'email' } | null
  const phone  = state?.phone
  const email  = state?.email
  const method = state?.method ?? 'phone'

  const [step,        setStep]        = useState<Step>('otp')
  const [otp,         setOtp]         = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY)

  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError,   setPasswordError]   = useState('')

  const [pendingResult, setPendingResult] = useState<{
    user: Parameters<typeof setUser>[0]; access: string; refresh: string; is_new_user: boolean
  } | null>(null)

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null))

  useEffect(() => {
    if (!phone && !email) { navigate('/login'); return }
    inputRefs.current[0]?.focus()
  }, [phone, email, navigate])

  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000)
    return () => clearInterval(timer)
  }, [resendTimer])

  const handleChange = (index: number, digit: string) => {
    if (!/^\d?$/.test(digit)) return
    const newOtp = [...otp]; newOtp[index] = digit
    setOtp(newOtp); setError('')
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (digit && index === OTP_LENGTH - 1) {
      const s = newOtp.join('')
      if (s.length === OTP_LENGTH) handleVerify(s)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp]
      if (newOtp[index]) { newOtp[index] = ''; setOtp(newOtp) }
      else if (index > 0) { newOtp[index - 1] = ''; setOtp(newOtp); inputRefs.current[index - 1]?.focus() }
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted.length === OTP_LENGTH) {
      setOtp(pasted.split('')); inputRefs.current[OTP_LENGTH - 1]?.focus()
      handleVerify(pasted)
    }
  }

  const handleVerify = async (otpStr: string) => {
    if (otpStr.length < OTP_LENGTH || loading) return
    setLoading(true); setError('')
    try {
      const result = method === 'email'
        ? await authService.verifyEmailOTP(email!, otpStr)
        : await authService.verifyOTP(phone!, otpStr)
      setPendingResult({ user: result.user, access: result.access, refresh: result.refresh, is_new_user: result.is_new_user })
      setUser(result.user, result.access, result.refresh)
      setStep('password')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } }
      const msg = e?.response?.data?.detail || e?.response?.data?.message || ''
      setError(msg.toLowerCase().includes('expired') ? t('otpExpired') : t('invalidOTP'))
      setOtp(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    try {
      if (method === 'phone') await authService.requestOTP(phone!)
      else await authService.requestEmailOTP(email!)
      setOtp(Array(OTP_LENGTH).fill(''))
      setResendTimer(RESEND_DELAY); setError('')
      inputRefs.current[0]?.focus()
    } catch { setError(tc('serverError')) }
  }

  const finishLogin = (isNewUser: boolean) => {
    if (isNewUser) navigate('/register', { state: { phone, email, method, from: 'otp' } })
    else navigate('/')
  }

  const handleSetPassword = async () => {
    if (password.length < 8) { setPasswordError(t('passwordTooShort')); return }
    if (password !== confirmPassword) { setPasswordError(t('passwordMismatch')); return }
    setPasswordLoading(true); setPasswordError('')
    try { await authService.setPassword(password) } catch { /* non-fatal */ }
    finally { setPasswordLoading(false) }
    finishLogin(pendingResult?.is_new_user ?? false)
  }

  const otpStr    = otp.join('')
  const recipient = method === 'phone' ? phone : email

  // ── Password step ────────────────────────────────────────────────────────────
  if (step === 'password') {
    return (
      <AuthLayout>
        <CardShell>
          <div className="px-7 py-6 flex flex-col gap-4">
            {/* Verified chip */}
            <div className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5">
              <CheckCircle className="h-4 w-4 text-[#0d9488] flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#0f766e]">{t('otpVerified')}</p>
                <p className="text-xs text-[#0d9488]">{recipient}</p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#115e59]">{t('setPassword')}</h2>
              <p className="text-gray-400 text-xs mt-0.5">{t('setPasswordHint')}</p>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-red-600 text-xs">{passwordError}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {(['password', 'confirmPassword'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    {field === 'password' ? 'Password' : 'Confirm Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={field === 'password' ? password : confirmPassword}
                      onChange={(e) => {
                        if (field === 'password') setPassword(e.target.value)
                        else setConfirmPassword(e.target.value)
                        setPasswordError('')
                      }}
                      onKeyDown={(e) => field === 'confirmPassword' && e.key === 'Enter' && handleSetPassword()}
                      placeholder="••••••••"
                      autoFocus={field === 'password'}
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none transition focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15"
                    />
                    {field === 'confirmPassword' && (
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleSetPassword} disabled={passwordLoading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
              style={ctaStyle}>
              {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t('setPasswordContinue')} <ChevronRight className="h-4 w-4" /></>}
            </button>

            <button onClick={() => finishLogin(pendingResult?.is_new_user ?? false)}
              className="text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors text-center">
              {t('skipForNow')} →
            </button>
          </div>
        </CardShell>
      </AuthLayout>
    )
  }

  // ── OTP entry step ───────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <CardShell>
        <div className="px-7 py-6 flex flex-col gap-4">
          <div>
            <button onClick={() => navigate('/login')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> {tc('back')}
            </button>
            <h2 className="text-lg font-bold text-[#115e59]">{t('verifyOTP')}</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {t('otpSentTo')}{' '}
              <span className="font-semibold text-gray-700">{recipient}</span>
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          )}

          {/* OTP boxes */}
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text" inputMode="numeric" maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                  ${digit ? 'border-[#0d9488] bg-teal-50 text-[#0f766e]' : 'border-gray-200 text-gray-900'}
                  ${error ? 'border-red-300 bg-red-50' : ''}
                  focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15`}
              />
            ))}
          </div>

          <button
            onClick={() => handleVerify(otpStr)}
            disabled={otpStr.length < OTP_LENGTH || loading}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            style={ctaStyle}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t('verifyOTP')} <ChevronRight className="h-4 w-4" /></>}
          </button>

          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-xs text-gray-400">
                {t('resendIn')} <span className="font-semibold text-gray-600">{resendTimer}s</span>
              </p>
            ) : (
              <button onClick={handleResend}
                className="text-xs font-semibold transition-colors"
                style={{ color: TEAL_DARK }}>
                {t('resendOTP')} →
              </button>
            )}
          </div>
        </div>
      </CardShell>
    </AuthLayout>
  )
}
