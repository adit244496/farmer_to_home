import { useNavigate } from 'react-router-dom'
import { User, MapPin, ClipboardList, ChevronRight, LogOut, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'

export default function ProfilePage() {
  const { t: tc } = useTranslation('common')
  const { user, logout, language, setLanguage } = useAuthStore()
  const navigate = useNavigate()

  const menuItems = [
    { icon: User, label: 'Edit Profile', onClick: () => navigate('/profile/edit') },
    { icon: MapPin, label: 'Manage Addresses', onClick: () => navigate('/profile/addresses') },
    { icon: ClipboardList, label: 'My Orders', onClick: () => navigate('/orders') },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Header />
      <div className="max-w-xl mx-auto px-4 py-4">
        {/* User card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
            {user?.full_name?.[0] ?? 'U'}
          </div>
          <div>
            <p className="font-bold text-gray-900">{user?.full_name}</p>
            <p className="text-sm text-gray-500">{user?.phone ?? user?.email}</p>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 mb-4">
          {menuItems.map(({ icon: Icon, label, onClick }) => (
            <button key={label} onClick={onClick} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left">
              <Icon className="h-5 w-5 text-gray-400" />
              <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          ))}
        </div>

        {/* Language */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Globe className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{tc('language')}</span>
          </div>
          <div className="flex gap-2">
            {(['en', 'mr'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                  language === lang
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {lang === 'en' ? 'English' : 'मराठी'}
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium">{tc('logout')}</span>
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
