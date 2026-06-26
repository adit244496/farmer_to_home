import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, User, Globe } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useTranslation } from 'react-i18next'

export function Header() {
  const { isAuthenticated, language, setLanguage } = useAuthStore()
  const items = useCartStore((s) => s.items)
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center mr-2 flex-shrink-0">
          <img src="/icon.png" alt="Farmer to Home" className="h-9 w-auto" />
        </Link>

        {/* Search bar */}
        <button
          onClick={() => navigate('/search')}
          className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-400 hover:bg-gray-200 transition-colors text-left"
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{t('search')} fresh produce...</span>
        </button>

        <div className="flex items-center gap-1">
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            title="Switch language"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:block">{language === 'en' ? 'मराठी' : 'EN'}</span>
          </button>

          {/* Cart */}
          {isAuthenticated && (
            <Link
              to="/cart"
              className="relative p-2 text-gray-600 hover:text-primary-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {items.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {items.length > 9 ? '9+' : items.length}
                </span>
              )}
            </Link>
          )}

          {/* Profile */}
          <Link
            to={isAuthenticated ? '/profile' : '/login'}
            className="p-2 text-gray-600 hover:text-primary-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
