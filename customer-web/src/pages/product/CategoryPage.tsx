import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Search, Bookmark, Plus, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { productService, getCategoryEmoji } from '@/services/product.service'
import { BottomNav } from '@/components/layout/BottomNav'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useState } from 'react'
import type { Product } from '@/types'

type SortKey = '' | 'price' | '-price' | '-created_at'

export default function CategoryPage() {
  const { id: slug } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('home')
  const { language } = useAuthStore()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)

  const [sortBy, setSortBy]       = useState<SortKey>('')
  const [organicOnly, setOrganicOnly] = useState(false)
  const [addingId, setAddingId]   = useState<string | null>(null)

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

  const products = data?.results ?? []
  const currentCat = categories.find((c) => c.slug === slug)
  const catName = currentCat
    ? (language === 'mr' ? currentCat.name_mr : currentCat.name_en)
    : (slug ?? '')

  const handleAdd = async (productId: string) => {
    setAddingId(productId)
    try { await addItem(productId, 1) }
    finally { setAddingId(null) }
  }

  const sortLabel: Record<SortKey, string> = {
    '': 'Sort By', price: 'Price ↑', '-price': 'Price ↓', '-created_at': 'Newest',
  }
  const sortCycle: SortKey[] = ['', 'price', '-price', '-created_at']

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="flex-shrink-0 bg-white border-b border-gray-100 shadow-sm z-10">
        <div className="flex items-center h-14 px-2 gap-2">
          <button onClick={() => navigate(-1)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-base font-bold text-gray-900 capitalize">{catName}</h1>
          <button onClick={() => navigate('/search')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <Search className="h-5 w-5" />
          </button>
        </div>
      </header>

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
          {/* Filter chips */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 overflow-x-auto no-scrollbar">
            {/* Sort */}
            <button
              onClick={() => {
                const idx = sortCycle.indexOf(sortBy)
                setSortBy(sortCycle[(idx + 1) % sortCycle.length])
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold flex-shrink-0 transition-colors ${
                sortBy ? 'bg-[#0d9488] text-white border-[#0d9488]' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {sortLabel[sortBy]} <span className="text-[10px]">▾</span>
            </button>

            {/* Organic */}
            <button
              onClick={() => setOrganicOnly((v) => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold flex-shrink-0 transition-colors ${
                organicOnly ? 'bg-[#0d9488] text-white border-[#0d9488]' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              🌿 Organic
            </button>

            {/* Result count */}
            {data?.count != null && (
              <span className="ml-auto text-[11px] text-gray-400 flex-shrink-0">
                {data.count} items
              </span>
            )}
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
  const name = language === 'mr' ? product.name_mr : product.name_en
  const image = product.primary_image ?? product.images?.[0]?.image_url
  const discount = product.discount?.discount_percent
  const originalPrice = discount ? Math.round(product.price / (1 - discount / 100)) : null

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-50">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🥬
          </div>
        )}
        {/* Bookmark */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 p-1 bg-white/80 rounded-full"
        >
          <Bookmark className="h-3.5 w-3.5 text-gray-400" />
        </button>
        {/* Organic dot */}
        {product.is_organic && (
          <div className="absolute bottom-2 left-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Info */}
      <div className="p-2 relative">
        <p className="text-[12px] font-semibold text-gray-900 leading-tight line-clamp-2 mb-1.5">
          {name}
        </p>

        {/* Unit pill */}
        <span className="inline-block bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded mb-1.5">
          {product.unit}
        </span>

        {/* Discount */}
        {discount && (
          <p className="text-[11px] font-bold text-green-600 mb-0.5">
            {discount}% OFF
          </p>
        )}

        {/* Price row */}
        <div className="flex items-end justify-between gap-1">
          <div>
            <span className="text-[13px] font-bold text-gray-900">₹{product.price}</span>
            {originalPrice && (
              <span className="ml-1 text-[11px] text-gray-400 line-through">₹{originalPrice}</span>
            )}
          </div>

          {/* Add button */}
          <button
            onClick={(e) => { e.stopPropagation(); onAdd() }}
            disabled={adding}
            className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-colors ${
              inCart
                ? 'bg-[#0d9488] text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {adding
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Plus className="h-4 w-4" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
