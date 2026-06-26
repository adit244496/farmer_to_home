import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'

const OTP_LENGTH = 6
const RESEND_DELAY = 30

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

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY)
  const [verified, setVerified] = useState(false)
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

      setVerified(true)
      setUser(result.user, result.access, result.refresh)

      setTimeout(() => {
        if (result.is_new_user) {
          navigate('/register', { state: { phone, email, method, from: 'otp' } })
        } else {
          navigate('/')
        }
      }, 600)
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

  const otpStr = otp.join('')
  const recipient = method === 'phone' ? phone : email

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        {/* Back */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('back')}
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          {verified ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="h-14 w-14 text-green-500" />
              <p className="font-semibold text-gray-800">{tc('success')}</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('verifyOTP')}</h2>
              <p className="text-sm text-gray-500">
                {t('otpSentTo')}{' '}
                <span className="font-semibold text-gray-800">{recipient}</span>
              </p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* OTP boxes */}
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
                digit
                  ? 'border-primary-600 text-primary-700'
                  : 'border-gray-200 text-gray-900'
              } ${error ? 'border-red-400' : ''} focus:border-primary-600`}
            />
          ))}
        </div>

        <Button
          fullWidth
          size="lg"
          loading={loading}
          disabled={otpStr.length < OTP_LENGTH || verified}
          onClick={() => handleVerify(otpStr)}
        >
          {t('verifyOTP')}
        </Button>

        {/* Resend */}
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
