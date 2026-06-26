import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { User, AlertCircle, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser, language } = useAuthStore()

  const state = location.state as { phone?: string; email?: string; method?: string; from?: string } | null
  const isFromOTP = state?.from === 'otp'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(state?.email ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) { setError(t('nameRequired')); return }
    setError('')
    setLoading(true)
    try {
      const result = await authService.registerCustomer({
        full_name: fullName.trim(),
        phone: state?.phone,
        email: email.trim() || state?.email,
        language_preference: language,
      })
      setDone(true)
      setUser(result.user, result.access, result.refresh)
      setTimeout(() => navigate('/'), 800)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } }
      setError(e?.response?.data?.detail || e?.response?.data?.message || tc('serverError'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{tc('success')}!</h2>
          <p className="text-gray-500 text-sm">Welcome to Farmer to Home</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary-100 rounded-2xl p-4 mb-3">
            <User className="h-10 w-10 text-primary-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('customerRegister')}</h1>
          {isFromOTP && (
            <p className="text-gray-400 text-sm mt-1">{t('completeProfile')}</p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('fullName')}
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); setError('') }}
            placeholder="Your full name"
            autoFocus
          />

          {!state?.phone && (
            <Input
              label={t('phone')}
              type="tel"
              value={state?.phone ?? ''}
              disabled
              placeholder="Mobile number"
            />
          )}

          {!state?.email && (
            <Input
              label={t('email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional"
            />
          )}

          {(state?.phone || state?.email) && (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">Logging in as</p>
              <p className="text-sm font-semibold text-gray-800">{state?.phone ?? state?.email}</p>
            </div>
          )}

          <Button type="submit" fullWidth size="lg" loading={loading}>
            {t('createAccount')}
          </Button>
        </form>
      </div>
    </div>
  )
}
