import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'

const OTP_LENGTH = 6
const RESEND_DELAY = 30

type Step = 'otp' | 'password'

export default function OTPVerifyPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuthStore()

  const state = location.state as { phone?: string; email?: string; method?: 'phone' | 'email' } | null
  const phone = state?.phone
  const email = state?.email
  const method = state?.method ?? 'phone'

  const [step, setStep] = useState<Step>('otp')
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY)

  // password step state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // stored after OTP verify
  const [pendingResult, setPendingResult] = useState<{
    user: Parameters<typeof setUser>[0]
    access: string
    refresh: string
    is_new_user: boolean
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
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    setError('')

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    if (digit && index === OTP_LENGTH - 1) {
      const otpStr = newOtp.join('')
      if (otpStr.length === OTP_LENGTH) handleVerify(otpStr)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp]
      if (newOtp[index]) {
        newOtp[index] = ''
        setOtp(newOtp)
      } else if (index > 0) {
        newOtp[index - 1] = ''
        setOtp(newOtp)
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted.length === OTP_LENGTH) {
      const newOtp = pasted.split('')
      setOtp(newOtp)
      inputRefs.current[OTP_LENGTH - 1]?.focus()
      handleVerify(pasted)
    }
  }

  const handleVerify = async (otpStr: string) => {
    if (otpStr.length < OTP_LENGTH || loading) return
    setLoading(true)
    setError('')
    try {
      const result =
        method === 'email'
          ? await authService.verifyEmailOTP(email!, otpStr)
          : await authService.verifyOTP(phone!, otpStr)

      // Store result and show password step
      setPendingResult({ user: result.user, access: result.access, refresh: result.refresh, is_new_user: result.is_new_user })
      setUser(result.user, result.access, result.refresh)
      setStep('password')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } }
      const msg = e?.response?.data?.detail || e?.response?.data?.message || ''
      setError(msg.toLowerCase().includes('expired') ? t('otpExpired') : t('invalidOTP'))
      setOtp(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    try {
      if (method === 'phone') await authService.requestOTP(phone!)
      else await authService.requestEmailOTP(email!)
      setOtp(Array(OTP_LENGTH).fill(''))
      setResendTimer(RESEND_DELAY)
      setError('')
      inputRefs.current[0]?.focus()
    } catch {
      setError(tc('serverError'))
    }
  }

  const finishLogin = (isNewUser: boolean) => {
    if (isNewUser) {
      navigate('/register', { state: { phone, email, method, from: 'otp' } })
    } else {
      navigate('/')
    }
  }

  const handleSetPassword = async () => {
    if (password.length < 8) {
      setPasswordError(t('passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setPasswordError(t('passwordMismatch'))
      return
    }
    setPasswordLoading(true)
    setPasswordError('')
    try {
      await authService.setPassword(password)
    } catch {
      // non-fatal — user is already logged in
    } finally {
      setPasswordLoading(false)
    }
    finishLogin(pendingResult?.is_new_user ?? false)
  }

  const handleSkip = () => {
    finishLogin(pendingResult?.is_new_user ?? false)
  }

  const otpStr = otp.join('')
  const recipient = method === 'phone' ? phone : email

  if (step === 'password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t('otpVerified')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('setPasswordHint')}</p>
          </div>

          <div className="bg-primary-50 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-4 w-4 text-primary-700" />
              <p className="text-sm font-semibold text-primary-800">{t('setPassword')}</p>
            </div>

            {passwordError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-600 text-xs">{passwordError}</p>
              </div>
            )}

            <div className="relative mb-3">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError('') }}
                placeholder={t('passwordPlaceholder')}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:border-primary-500 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError('') }}
              placeholder={t('confirmPasswordPlaceholder')}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500 bg-white"
              onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
            />
          </div>

          <Button fullWidth size="lg" loading={passwordLoading} onClick={handleSetPassword}>
            {t('setPasswordContinue')}
          </Button>

          <button
            onClick={handleSkip}
            className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
          >
            {t('skipForNow')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('back')}
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('verifyOTP')}</h2>
          <p className="text-sm text-gray-500">
            {t('otpSentTo')}{' '}
            <span className="font-semibold text-gray-800">{recipient}</span>
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl outline-none transition-colors ${
                digit ? 'border-primary-600 text-primary-700' : 'border-gray-200 text-gray-900'
              } ${error ? 'border-red-400' : ''} focus:border-primary-600`}
            />
          ))}
        </div>

        <Button
          fullWidth
          size="lg"
          loading={loading}
          disabled={otpStr.length < OTP_LENGTH}
          onClick={() => handleVerify(otpStr)}
        >
          {t('verifyOTP')}
        </Button>

        <div className="text-center mt-5">
          {resendTimer > 0 ? (
            <p className="text-sm text-gray-400">
              {t('resendIn')} {resendTimer} {t('seconds')}
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="text-sm text-primary-700 font-semibold hover:text-primary-800 transition-colors"
            >
              {t('resendOTP')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
