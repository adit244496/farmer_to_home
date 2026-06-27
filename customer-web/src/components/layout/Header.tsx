import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, User, Globe, X, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/utils/formatting'
import { useCartStore } from '@/store/cartStore'
import { useTranslation } from 'react-i18next'
import { productService, getCategoryEmoji } from '@/services/product.service'

export function Header() {
  const { isAuthenticated, language, setLanguage } = useAuthStore()
  const items = useCartStore((s) => s.items)
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  const [searchOpen,    setSearchOpen]    = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 300 ms debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Cached categories — reuses existing query, no extra fetch
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: productService.getCategories,
    staleTime: 5 * 60 * 1000,
  })

  // Live product suggestions
  const { data: productData, isFetching } = useQuery({
    queryKey: ['header-search', debouncedQuery],
    queryFn: () => productService.searchProducts({ q: debouncedQuery, page_size: 6 }),
    enabled: debouncedQuery.length >= 1,
    staleTime: 15_000,
  })

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
    setDebouncedQuery('')
  }

  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSearch() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  const q = searchQuery.trim()

  // Filter categories client-side by name_en or name_mr
  const catSuggestions = q
    ? categories.filter(
        (c) =>
          c.name_en.toLowerCase().includes(q.toLowerCase()) ||
          c.name_mr.includes(q)
      ).slice(0, 4)
    : categories.slice(0, 6)          // show all when no query

  const products = productData?.results ?? []
  const totalCount = productData?.total ?? 0
  const showProducts = debouncedQuery.length >= 1 && !isFetching && products.length > 0

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#ede8e0] border-b border-[#d4c9bb] shadow-[0_1px_0_0_rgba(212,168,76,0.2)]">
        <div className="h-[2px] w-full bg-gradient-to-r from-[#d4a84c] via-[#e8c47a] to-[#d4a84c]" />

        <div className="px-4 sm:px-6 lg:px-10 h-16 flex items-center gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mr-1 flex-shrink-0 group">
            <img src="/logo_new.png" alt="Farmer to Home"
              className="h-10 w-auto drop-shadow-sm transition-transform group-hover:scale-105" />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-[13px] font-bold tracking-wide text-[#0d7a7a]">Farmer</span>
              <span className="text-[10px] font-semibold tracking-[0.18em] text-[#d4a84c] -mt-0.5">TO HOME</span>
            </div>
          </Link>

          {/* Search trigger */}
          <button
            onClick={openSearch}
            className="flex-1 flex items-center gap-2 bg-white/70 hover:bg-white border border-[#0d7a7a]/15 hover:border-[#0d7a7a]/30 rounded-full px-4 py-2.5 text-sm text-[#0d7a7a]/60 transition-all shadow-sm hover:shadow text-left"
          >
            <Search className="h-4 w-4 flex-shrink-0 text-[#0d7a7a]" />
            <span className="truncate">{t('search')} fresh produce…</span>
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
              className="flex items-center gap-1 px-2.5 py-2 rounded-full text-xs font-semibold text-[#0d7a7a] hover:bg-[#0d7a7a]/8 transition-colors"
              title="Switch language"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:block">{language === 'en' ? 'मराठी' : 'EN'}</span>
            </button>

            {isAuthenticated && (
              <Link to="/cart" className="relative p-2 text-[#0d7a7a] hover:bg-[#0d7a7a]/8 rounded-full transition-colors">
                <ShoppingCart className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute top-0 right-0 h-[18px] min-w-[18px] px-1 bg-gradient-to-br from-[#d4a84c] to-[#b8862e] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-[#ede8e0]">
                    {items.length > 9 ? '9+' : items.length}
                  </span>
                )}
              </Link>
            )}

            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className="p-2 text-[#0d7a7a] hover:bg-[#0d7a7a]/8 rounded-full transition-colors"
            >
              <User className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Search overlay ─────────────────────────────────────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={closeSearch} />

          {/* Panel */}
          <div className="relative bg-[#ede8e0] shadow-xl">
            <div className="h-[2px] w-full bg-gradient-to-r from-[#d4a84c] via-[#e8c47a] to-[#d4a84c]" />

            {/* Input row */}
            <div className="px-4 sm:px-6 lg:px-10 h-16 flex items-center gap-3">
              <button onClick={closeSearch}
                className="p-2 text-[#0d7a7a] hover:bg-[#0d7a7a]/8 rounded-full transition-colors flex-shrink-0">
                <X className="h-5 w-5" />
              </button>

              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0d7a7a]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && q) {
                      closeSearch()
                      navigate(`/search?q=${encodeURIComponent(q)}`)
                    }
                  }}
                  placeholder="Search in English, मराठी or हिंदी…"
                  className="w-full pl-9 pr-10 py-2.5 rounded-full border border-[#0d7a7a]/15 bg-white text-sm outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15 transition-all"
                />
                {isFetching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0d9488] animate-spin" />
                )}
                {searchQuery && !isFetching && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions panel */}
            <div className="px-4 sm:px-6 lg:px-10 pb-4 max-h-[70vh] overflow-y-auto">

              {/* Categories row */}
              {catSuggestions.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    {q ? 'Categories' : 'Browse by category'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {catSuggestions.map((cat) => {
                      const label = language === 'mr' ? cat.name_mr : cat.name_en
                      const emoji = getCategoryEmoji(cat.slug)
                      return (
                        <button
                          key={cat.id}
                          onClick={() => { closeSearch(); navigate(`/category/${cat.slug}`) }}
                          className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#0d9488] hover:text-[#0d9488] transition-colors shadow-sm"
                        >
                          {cat.icon_url
                            ? <img src={cat.icon_url} alt={label} className="w-4 h-4 rounded-full object-cover" />
                            : <span>{emoji}</span>
                          }
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Product results */}
              {showProducts && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Products</p>
                  <div className="flex flex-col gap-1">
                    {products.map((p) => {
                      const name = language === 'mr' ? p.name_mr : p.name_en
                      const image = p.primary_image ?? p.images?.[0]?.image_url
                      return (
                        <button
                          key={p.id}
                          onClick={() => { closeSearch(); navigate(`/product/${p.id}`) }}
                          className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 text-left hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                        >
                          {image
                            ? <img src={image} alt={name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            : <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                            <p className="text-xs text-gray-400">{p.unit}</p>
                          </div>
                          <p className="text-sm font-bold text-[#0d9488] flex-shrink-0">{formatCurrency(p.price)}</p>
                        </button>
                      )
                    })}
                  </div>

                  {totalCount > 6 && (
                    <button
                      onClick={() => { closeSearch(); navigate(`/search?q=${encodeURIComponent(q)}`) }}
                      className="mt-2 w-full text-center text-xs font-semibold text-[#0d9488] hover:text-[#0f766e] py-2.5 border-t border-gray-100 transition-colors"
                    >
                      See all {totalCount} results for "{q}" →
                    </button>
                  )}
                </div>
              )}

              {/* No results */}
              {debouncedQuery.length >= 1 && !isFetching && products.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">
                  No products found for "<span className="font-medium text-gray-600">{debouncedQuery}</span>"
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
