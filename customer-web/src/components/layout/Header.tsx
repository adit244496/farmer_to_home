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
    <header className="sticky top-0 z-50 bg-[#ede8e0] border-b border-[#d4c9bb] shadow-[0_1px_0_0_rgba(212,168,76,0.2)]">
      {/* Thin gold accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#d4a84c] via-[#e8c47a] to-[#d4a84c]" />

      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-1 flex-shrink-0 group">
          <div className="relative">
            <img
              src="/logo_new.png"
              alt="Farmer to Home"
              className="h-10 w-auto drop-shadow-sm transition-transform group-hover:scale-105"
            />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[13px] font-bold tracking-wide text-[#0d7a7a] font-serif">
              Farmer
            </span>
            <span className="text-[10px] font-semibold tracking-[0.18em] text-[#d4a84c] -mt-0.5">
              TO HOME
            </span>
          </div>
        </Link>

        {/* Search bar */}
        <button
          onClick={() => navigate('/search')}
          className="flex-1 flex items-center gap-2 bg-white/70 hover:bg-white border border-[#0d7a7a]/15 hover:border-[#0d7a7a]/30 rounded-full px-4 py-2.5 text-sm text-[#0d7a7a]/60 transition-all shadow-sm hover:shadow text-left"
        >
          <Search className="h-4 w-4 flex-shrink-0 text-[#0d7a7a]" />
          <span className="truncate">{t('search')} fresh produce…</span>
        </button>

        <div className="flex items-center gap-0.5">
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
            className="flex items-center gap-1 px-2.5 py-2 rounded-full text-xs font-semibold text-[#0d7a7a] hover:bg-[#0d7a7a]/8 transition-colors"
            title="Switch language"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:block">{language === 'en' ? 'मराठी' : 'EN'}</span>
          </button>

          {/* Cart */}
          {isAuthenticated && (
            <Link
              to="/cart"
              className="relative p-2 text-[#0d7a7a] hover:bg-[#0d7a7a]/8 rounded-full transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {items.length > 0 && (
                <span className="absolute top-0 right-0 h-[18px] min-w-[18px] px-1 bg-gradient-to-br from-[#d4a84c] to-[#b8862e] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-[#faf7f0]">
                  {items.length > 9 ? '9+' : items.length}
                </span>
              )}
            </Link>
          )}

          {/* Profile */}
          <Link
            to={isAuthenticated ? '/profile' : '/login'}
            className="p-2 text-[#0d7a7a] hover:bg-[#0d7a7a]/8 rounded-full transition-colors"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
