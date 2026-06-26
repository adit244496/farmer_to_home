import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function EditProfilePage() {
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { user, refreshUser } = useAuthStore()

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!fullName.trim()) { setError('Full name is required'); return }
    setLoading(true)
    setError('')
    try {
      await authService.updateProfile({ full_name: fullName.trim(), email: email.trim() || undefined })
      await refreshUser()
      setSaved(true)
      setTimeout(() => navigate('/profile'), 800)
    } catch {
      setError(tc('serverError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-gray-900">Edit Profile</h1>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {saved && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <p className="text-sm text-green-700">{tc('success')}</p>
          </div>
        )}
        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {user?.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <p className="text-sm text-gray-500 px-4 py-3 bg-gray-50 rounded-xl">{user.phone}</p>
            </div>
          )}
        </div>

        <Button fullWidth size="lg" loading={loading} onClick={handleSave}>
          {tc('save')}
        </Button>
      </div>
    </div>
  )
}
