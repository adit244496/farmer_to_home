import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Phone, Mail, Sprout, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type LoginMethod = 'phone' | 'email'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const { language, setLanguage } = useAuthStore()
  const navigate = useNavigate()

  const [method, setMethod] = useState<LoginMethod>('phone')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = (): string => {
    if (method === 'phone') {
      if (!value.trim()) return t('phoneRequired')
      if (!/^\d{10}$/.test(value.trim())) return t('phoneInvalid')
    } else {
      if (!value.trim()) return t('emailInvalid')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return t('emailInvalid')
    }
    return ''
  }

  const handleSendOTP = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      if (method === 'phone') {
        await authService.requestOTP(value.trim())
        navigate('/auth/otp', { state: { phone: value.trim(), method: 'phone' } })
      } else {
        await authService.requestEmailOTP(value.trim())
        navigate('/auth/otp', { state: { email: value.trim(), method: 'email' } })
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } }
      setError(e?.response?.data?.detail || e?.response?.data?.message || tc('serverError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary-700 rounded-2xl p-4 mb-3">
            <Sprout className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{tc('appName')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('customerLogin')}</p>
        </div>

        {/* Language toggle */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {(['en', 'mr'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  language === lang
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {lang === 'en' ? 'English' : 'मराठी'}
              </button>
            ))}
          </div>
        </div>

        {/* Method tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
          <button
            onClick={() => { setMethod('phone'); setValue(''); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              method === 'phone' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Phone className="h-4 w-4" />
            {t('loginViaPhone')}
          </button>
          <button
            onClick={() => { setMethod('email'); setValue(''); setError('') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              method === 'email' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Mail className="h-4 w-4" />
            {t('loginViaEmail')}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Input */}
        <div className="mb-4">
          {method === 'phone' ? (
            <Input
              label={t('phone')}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={value}
              onChange={(e) => { setValue(e.target.value.replace(/\D/g, '')); setError('') }}
              placeholder="10-digit mobile number"
              leftIcon={<Phone className="h-4 w-4" />}
              onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
            />
          ) : (
            <Input
              label={t('email')}
              type="email"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError('') }}
              placeholder="your@email.com"
              leftIcon={<Mail className="h-4 w-4" />}
              onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
            />
          )}
          <p className="text-xs text-gray-400 mt-2">
            {method === 'phone' ? t('otpWillBeSentPhone') : t('otpWillBeSentEmail')}
          </p>
        </div>

        <Button fullWidth size="lg" loading={loading} onClick={handleSendOTP}>
          {t('sendOTP')}
        </Button>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('dontHaveAccount')}{' '}
          <Link to="/register" className="text-primary-700 font-semibold hover:text-primary-800">
            {t('registerHere')}
          </Link>
        </p>
      </div>
    </div>
  )
}
