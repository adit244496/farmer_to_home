import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import useAuthStore from '@/store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }

    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } } }
      const msg =
        axiosErr?.response?.data?.detail ??
        axiosErr?.response?.data?.message ??
        'Invalid credentials. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-farm-green-900 px-8 py-8 flex flex-col items-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-farm-green-700 mb-4">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Admin Portal</h1>
            <p className="text-farm-green-300 text-sm mt-1">Farmer to Home — Management Console</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@farmertohome.in"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-farm-green-500 focus:border-transparent placeholder-gray-400"
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-farm-green-500 focus:border-transparent placeholder-gray-400"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Login to Dashboard'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Restricted to authorized administrators only.
        </p>
      </div>
    </div>
  )
}
