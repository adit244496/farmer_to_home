import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronDown, Leaf } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { productService, getCategoryEmoji } from '@/services/product.service'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/authStore'
import { useState, useRef, useEffect } from 'react'

type SortKey = '' | 'price' | '-price' | '-created_at' | '-avg_rating'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: '',            label: 'Relevance' },
  { value: '-avg_rating', label: 'Rating' },
  { value: 'price',       label: 'Price: Low to High' },
  { value: '-price',      label: 'Price: High to Low' },
  { value: '-created_at', label: 'Newest First' },
]

export default function CategoryPage() {
  const { id: slug } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('home')
  const { language } = useAuthStore()

  const [sortBy, setSortBy]           = useState<SortKey>('')
  const [sortOpen, setSortOpen]       = useState(false)
  const [organicOnly, setOrganicOnly] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: productService.getCategories,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['category-products', slug, organicOnly, sortBy],
    queryFn: () =>
      productService.searchProducts({
        category: slug,
        is_organic: organicOnly || undefined,
        ordering: sortBy || undefined,
        page_size: 40,
      }),
    enabled: !!slug,
  })

  const products = data?.items ?? []
  const currentCat = categories.find((c) => c.slug === slug)
  const catName = currentCat
    ? (language === 'mr' ? currentCat.name_mr : currentCat.name_en)
    : (slug ?? '')

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort By'

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <Header />

      {/* Breadcrumb */}
      <div className="flex-shrink-0 flex items-center gap-2 bg-white border-b border-gray-100 px-2 py-1.5">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-bold text-gray-800 capitalize">{catName}</h1>
        {data?.total != null && (
          <span className="text-[11px] text-gray-400 ml-1">({data.total})</span>
        )}
      </div>

      {/* Body = sidebar + main */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Category sidebar ── */}
        <aside className="w-[76px] flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto">
          {categories.map((cat) => {
            const isActive = cat.slug === slug
            const emoji = getCategoryEmoji(cat.slug)
            const label = language === 'mr' ? cat.name_mr : cat.name_en

            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/category/${cat.slug}`)}
                className={`relative w-full flex flex-col items-center gap-1.5 py-3 px-1.5 transition-colors ${
                  isActive ? 'bg-teal-50' : 'hover:bg-gray-50'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 bg-[#0d9488] rounded-r" />
                )}
                <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center border-2 transition-colors ${
                  isActive ? 'border-[#0d9488]' : 'border-transparent bg-gray-100'
                }`}>
                  {cat.icon_url
                    ? <img src={cat.icon_url} alt={label} className="w-full h-full object-cover" />
                    : <span className="text-2xl leading-none">{emoji}</span>}
                </div>
                <span className={`text-[10px] leading-tight text-center line-clamp-2 w-full ${
                  isActive ? 'font-bold text-[#0d9488]' : 'text-gray-500 font-medium'
                }`}>
                  {label}
                </span>
              </button>
            )
          })}
        </aside>

        {/* ── Filter bar + Product grid ── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Filter bar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100">

            {/* Sort dropdown */}
            <div ref={sortRef} className="relative flex-shrink-0">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                  sortBy ? 'bg-[#0d9488] text-white border-[#0d9488]' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {sortLabel} <ChevronDown className="h-3 w-3" />
              </button>
              {sortOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-30 min-w-[180px] py-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setSortOpen(false) }}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-medium text-left transition-colors hover:bg-gray-50 ${
                        sortBy === opt.value ? 'text-[#0d9488] font-semibold' : 'text-gray-700'
                      }`}
                    >
                      {opt.label}
                      {sortBy === opt.value && <Check className="h-3.5 w-3.5 text-[#0d9488] flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Organic toggle */}
            <button
              onClick={() => setOrganicOnly((v) => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold flex-shrink-0 transition-colors ${
                organicOnly
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-green-700 border-green-200 hover:border-green-400'
              }`}
            >
              <Leaf className="h-3 w-3" />
              Organic
            </button>
          </div>

          {/* Product grid — uses the same ProductCard as home page */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <span className="text-4xl mb-3">🛒</span>
                <p className="text-sm font-medium">{t('noProductsFound')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Free delivery strip */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 py-2.5 text-center">
        <p className="text-[11px] font-bold text-gray-700 tracking-widest uppercase">
          🚚 FREE DELIVERY on orders above ₹299
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
