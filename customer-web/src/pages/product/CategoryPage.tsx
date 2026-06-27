import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, Loader2, ChevronDown, Check, Leaf, Star, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { productService, getCategoryEmoji } from '@/services/product.service'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useState, useRef, useEffect } from 'react'
import type { Product } from '@/types'

type SortKey = '' | 'price' | '-price' | '-created_at' | '-avg_rating'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: '',           label: 'Relevance' },
  { value: '-avg_rating', label: 'Rating'   },
  { value: 'price',      label: 'Price: Low to High' },
  { value: '-price',     label: 'Price: High to Low' },
  { value: '-created_at', label: 'Newest First' },
]

export default function CategoryPage() {
  const { id: slug } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('home')
  const { language } = useAuthStore()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)

  const [sortBy, setSortBy]         = useState<SortKey>('')
  const [sortOpen, setSortOpen]     = useState(false)
  const [organicOnly, setOrganicOnly] = useState(false)
  const [addingId, setAddingId]     = useState<string | null>(null)
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

  const handleAdd = async (productId: string) => {
    setAddingId(productId)
    try { await addItem(productId, 1) }
    finally { setAddingId(null) }
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort By'

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* Full home-screen header */}
      <Header />

      {/* Slim breadcrumb bar */}
      <div className="flex-shrink-0 flex items-center gap-2 bg-white border-b border-gray-100 px-2 py-1.5">
        <button onClick={() => navigate(-1)}
          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-bold text-gray-800 capitalize">{catName}</h1>
        {data?.total != null && (
          <span className="text-[11px] text-gray-400 ml-1">({data.total})</span>
        )}
      </div>

      {/* Body = sidebar + main */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: Category sidebar ──────────────────────────────────────────── */}
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
                  {cat.icon_url ? (
                    <img src={cat.icon_url} alt={label} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl leading-none">{emoji}</span>
                  )}
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

        {/* ── Right: Filter + Product grid ───────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Filter bar — no overflow-x-auto so dropdown isn't clipped */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100">

            {/* Sort By dropdown */}
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

            {/* Organic toggle — matches ProductCard badge style */}
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

          {/* Product grid */}
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
                  <CategoryProductCard
                    key={p.id}
                    product={p}
                    language={language}
                    inCart={cartItems.some((ci) => ci.product_id === p.id)}
                    adding={addingId === p.id}
                    onAdd={() => handleAdd(p.id)}
                    onClick={() => navigate(`/product/${p.id}`)}
                  />
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

// ── Category product card ─────────────────────────────────────────────────────
interface CardProps {
  product: Product
  language: 'en' | 'mr'
  inCart: boolean
  adding: boolean
  onAdd: () => void
  onClick: () => void
}

function CategoryProductCard({ product, language, inCart, adding, onAdd, onClick }: CardProps) {
  const navigate = useNavigate()
  const [showInfo, setShowInfo] = useState(false)

  const name  = language === 'mr' ? product.name_mr : product.name_en
  const image = product.primary_image ?? product.images?.[0]?.image_url
  const discount = product.discount?.discount_percent
  const originalPrice = discount ? Math.round(product.price / (1 - discount / 100)) : null

  const criticalDiff = language === 'mr'
    ? (product.critical_difference_mr || product.critical_difference)
    : product.critical_difference
  const highlights = (
    language === 'mr'
      ? (product.highlights_mr ?? product.highlights ?? product.benefits_mr ?? product.benefits)
      : (product.highlights ?? product.benefits)
  ) ?? []
  const hasInfo = !!(criticalDiff || highlights.length > 0)

  const productRating = product.avg_rating ?? product.rating
  const farmerRating  = product.farmer_rating ?? product.farmer?.rating

  return (
    <>
      <div
        onClick={onClick}
        className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
      >
        {/* Image — fixed height so images don't dominate the card */}
        <div className="relative h-[100px] bg-gray-50 overflow-hidden">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🥬</div>
          )}

          {/* Discount badge */}
          {discount && (
            <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">
              {discount}% OFF
            </span>
          )}

          {/* Organic badge */}
          {product.is_organic && (
            <span className="absolute bottom-1 left-1 bg-green-600 text-white text-[9px] font-bold px-1 py-0.5 rounded-full flex items-center gap-0.5">
              <Leaf className="h-2 w-2" /> Organic
            </span>
          )}

          {/* Product rating — top-right of image */}
          {productRating != null && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}#reviews`) }}
              className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/55 px-1.5 py-0.5 rounded hover:bg-black/75 transition-colors"
            >
              <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-bold text-white">{productRating.toFixed(1)}</span>
            </button>
          )}

          {/* Italic "i" — bottom-right, no border/fill */}
          {hasInfo && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfo(true) }}
              className="absolute bottom-1 right-1.5 z-10 italic font-serif text-white text-[13px] font-bold leading-none select-none hover:text-yellow-200 transition-colors"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.75)' }}
              aria-label="Product info"
            >
              i
            </button>
          )}
        </div>

        {/* Info */}
        <div className="p-1.5">
          {/* Farmer name + farmer rating */}
          {product.farmer_name && (
            <div className="mb-0.5">
              {product.farmer_id ? (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/farmer/${product.farmer_id}`) }}
                  className="text-xs text-teal-600 hover:underline truncate block text-left w-full leading-tight"
                >
                  {product.farmer_name}
                  {farmerRating != null && (
                    <span className="text-gray-400 font-normal ml-1">({farmerRating.toFixed(1)})</span>
                  )}
                </button>
              ) : (
                <span className="text-xs text-gray-500 block truncate leading-tight">
                  {product.farmer_name}
                  {farmerRating != null && (
                    <span className="text-gray-400 ml-1">({farmerRating.toFixed(1)})</span>
                  )}
                </span>
              )}
            </div>
          )}

          <p className="text-[11px] font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">
            {name}
          </p>

          {/* Price row */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-[12px] font-bold text-gray-900">₹{product.price}</span>
              {originalPrice && (
                <span className="text-[10px] text-gray-400 line-through">₹{originalPrice}</span>
              )}
              <span className="text-[9px] text-gray-400 truncate">/{product.unit}</span>
            </div>

            {/* Add button */}
            <button
              onClick={(e) => { e.stopPropagation(); onAdd() }}
              disabled={adding}
              className={`flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 transition-colors ${
                inCart ? 'bg-[#0d9488] text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {adding
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Plus className="h-3.5 w-3.5" />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Info popup */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-base line-clamp-1">{name}</h3>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600 ml-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {criticalDiff && (
                <div>
                  <p className="text-xs font-bold text-primary-700 uppercase tracking-wide mb-1.5">
                    Why It's Different
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{criticalDiff}</p>
                </div>
              )}
              {highlights.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-primary-700 uppercase tracking-wide mb-1.5">
                    Highlights
                  </p>
                  <ul className="space-y-1.5">
                    {highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-primary-500 font-bold mt-0.5">✓</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
