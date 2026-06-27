import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight,
  Leaf, MapPin, Minus, Plus, ShoppingCart, Star,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { productService } from '@/services/product.service'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ProductCard } from '@/components/product/ProductCard'
import { formatCurrency, getProductName, getProductDescription } from '@/utils/formatting'
import type { Review } from '@/types'

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days < 1) return 'Today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('product')
  const { t: tc } = useTranslation('common')
  const { language, isAuthenticated } = useAuthStore()
  const addItem = useCartStore((s) => s.addItem)

  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [adding, setAdding] = useState(false)
  const [addedMsg, setAddedMsg] = useState(false)
  const [reviewPage, setReviewPage] = useState(1)
  const [filterStar, setFilterStar] = useState<number | null>(null)
  const [sortOrder, setSortOrder] = useState<'recent' | 'high' | 'low'>('recent')

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getProductDetail(id!),
    enabled: !!id,
  })
  const { data: similar } = useQuery({
    queryKey: ['similar', id],
    queryFn: () => productService.getSimilarProducts(id!),
    enabled: !!id,
  })
  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', id, reviewPage],
    queryFn: () => productService.getProductReviews(id!, reviewPage),
    enabled: !!id,
  })
  const { data: otherListings } = useQuery({
    queryKey: ['other-farmers', product?.name_en, id],
    queryFn: () => productService.searchProducts({ q: product!.name_en, page_size: 20 }),
    enabled: !!product?.name_en,
  })

  // Sync initial qty to min_order_qty once product data loads
  useEffect(() => {
    if (product?.min_order_qty) setQty(product.min_order_qty)
  }, [product?.min_order_qty])

  const otherFarmers = useMemo(() => {
    if (!otherListings || !product) return []
    const currentFarmerId = product.farmer?.id ?? product.farmer_id
    const seen = new Set<string>()
    const list: { id: string; name: string; district?: string; productId: string; price: number; unit: string }[] = []
    for (const p of otherListings.items ?? otherListings.results ?? []) {
      if (!p.farmer_id || p.id === product.id || p.farmer_id === currentFarmerId || seen.has(p.farmer_id)) continue
      seen.add(p.farmer_id)
      list.push({ id: p.farmer_id, name: p.farmer_name ?? '', district: p.farmer_district ?? undefined, productId: p.id, price: p.price, unit: p.unit })
    }
    return list
  }, [otherListings, product])

  // Must be before any early returns — hooks cannot be conditional
  const reviews: Review[] = reviewsData?.items ?? reviewsData?.results ?? []
  const reviewPages: number = reviewsData?.pages ?? 1

  const starCounts = useMemo(() =>
    [5,4,3,2,1].reduce<Record<number,number>>((acc, s) => {
      acc[s] = reviews.filter(r => Math.round(r.rating) === s).length
      return acc
    }, {}),
  [reviews])

  const displayedReviews = useMemo(() => {
    let r = filterStar ? reviews.filter(rv => Math.round(rv.rating) === filterStar) : [...reviews]
    if (sortOrder === 'high') r = [...r].sort((a, b) => b.rating - a.rating)
    if (sortOrder === 'low')  r = [...r].sort((a, b) => a.rating - b.rating)
    return r
  }, [reviews, filterStar, sortOrder])

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (!product) return
    setAdding(true)
    try {
      await addItem(product.id, qty)
      setAddedMsg(true)
      setTimeout(() => setAddedMsg(false), 2500)
    } finally { setAdding(false) }
  }

  if (isLoading) return (
    <div className="h-dvh flex flex-col bg-gray-50"><Header /><div className="flex-1 flex justify-center items-center"><Spinner /></div></div>
  )
  if (!product) return null

  const name        = getProductName(product, language)
  const description = getProductDescription(product, language)
  const images      = product.images ?? []
  const minQty      = product.min_order_qty ?? 1
  const inStock     = product.stock >= minQty
  const avgRating   = product.avg_rating ?? product.rating ?? 0
  const reviewCount = product.review_count ?? 0

  const criticalDiff = language === 'mr'
    ? (product.critical_difference_mr || product.critical_difference)
    : product.critical_difference

  const highlights = (
    language === 'mr'
      ? (product.highlights_mr ?? product.highlights ?? product.benefits_mr ?? product.benefits)
      : (product.highlights ?? product.benefits)
  ) ?? []

  return (
    <div className="h-dvh flex flex-col bg-gray-50 pb-24 lg:pb-0">
      <Header />

      {/* Scrollable content area fills remaining height */}
      <div className="flex-1 overflow-y-auto">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-5">

        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 mb-5 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> {tc('back')}
        </button>

        {/* ═══ MOBILE: key fact above image ═══ */}
        {criticalDiff && (
          <div className="lg:hidden mb-4 flex gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5">
            <span className="text-xl leading-none flex-shrink-0 mt-0.5">⭐</span>
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">{t('whyDifferent')}</p>
              <p className="text-sm text-amber-900 leading-relaxed">{criticalDiff}</p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            DESKTOP LAYOUT: Flexbox row
            Left  — sticky image panel  (40% on lg, 38% on xl)
            Right — scrollable details  (remaining width)
            ═══════════════════════════════════════════════════════════ */}
        <div className="lg:flex lg:gap-10 xl:gap-14 items-start">

          {/* ── LEFT: Image column ───────────────────────────────────── */}
          <div className="lg:w-[35%] xl:w-[30%] flex-shrink-0 lg:sticky lg:top-20">

            {/* Main image */}
            <div className="relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-3 aspect-[4/3] lg:aspect-square">
              {images[activeImg]?.image_url
                ? <img src={images[activeImg].image_url} alt={name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-6xl">🌿</div>}
              {product.is_organic && (
                <span className="absolute top-3 left-3 flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                  <Leaf className="h-3 w-3" /> {t('organic')}
                </span>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur rounded-full p-1.5 shadow hover:bg-white transition-colors">
                    <ChevronLeft className="h-4 w-4 text-gray-700" />
                  </button>
                  <button onClick={() => setActiveImg(i => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur rounded-full p-1.5 shadow hover:bg-white transition-colors">
                    <ChevronRight className="h-4 w-4 text-gray-700" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setActiveImg(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeImg ? 'bg-primary-600' : 'bg-white/70'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
                {images.map((img, i) => (
                  <button key={img.id ?? i} onClick={() => setActiveImg(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-primary-600' : 'border-gray-200'}`}>
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Mobile: highlights right after image */}
            {highlights.length > 0 && (
              <div className="lg:hidden mt-1">
                <HighlightsList highlights={highlights} t={t} />
              </div>
            )}
          </div>

          {/* ── RIGHT: Details column ─────────────────────────────────── */}
          <div className="flex-1 min-w-0 mt-4 lg:mt-0 space-y-4">

            {/* Row 1: Name (left) + Price (right) */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 leading-tight">{name}</h1>
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">({reviewCount})</span>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-2xl lg:text-3xl font-bold text-primary-700">{formatCurrency(product.price)}</span>
                  <span className="text-xs text-gray-400">/{product.unit}</span>
                </div>
              </div>
            </div>

            {/* Row 2: Qty stepper + Add to Cart */}
            {inStock ? (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center border border-gray-200 bg-white rounded-xl overflow-hidden shadow-sm">
                  <button onClick={() => setQty(q => Math.max(minQty, q - 1))} className="p-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 text-sm font-semibold min-w-[2.5rem] text-center">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="p-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm font-bold text-primary-600 min-w-[4rem]">{formatCurrency(product.price * qty)}</span>
                <Button className="flex-1 min-w-[140px]" loading={adding} onClick={handleAddToCart}>
                  <ShoppingCart className="h-4 w-4" />
                  {isAuthenticated ? t('addToCart') : 'Login to buy'}
                </Button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm text-red-600 font-medium">
                {t('outOfStock')}
              </div>
            )}

            {/* Farmer card */}
            <FarmerCard product={product} />

            {/* Key fact — desktop only (mobile shows it above image) */}
            {criticalDiff && (
              <div className="hidden lg:flex gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5">
                <span className="text-xl leading-none flex-shrink-0 mt-0.5">⭐</span>
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">{t('whyDifferent')}</p>
                  <p className="text-sm text-amber-900 leading-relaxed">{criticalDiff}</p>
                </div>
              </div>
            )}

            {/* Highlights — desktop only (mobile shows after image) */}
            {highlights.length > 0 && (
              <div className="hidden lg:block">
                <HighlightsList highlights={highlights} t={t} />
              </div>
            )}

            {/* Description */}
            {description && <ExpandableDescription text={description} label={t('description')} />}

            {/* Bottom section: stock + qty + Add to Cart */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-4 text-sm">
                <span className={inStock ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                  {inStock ? `${t('inStock')} (${product.stock} ${product.unit})` : t('outOfStock')}
                </span>
                <span className="text-gray-400">{t('minOrder')}: {minQty} {product.unit}</span>
              </div>
              {inStock && (
                <>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-gray-600">{t('selectQuantity')}:</span>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <button onClick={() => setQty(q => Math.max(minQty, q - 1))} className="p-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-4 py-2 text-sm font-semibold min-w-[3rem] text-center">{qty}</span>
                      <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="p-2.5 text-gray-600 hover:bg-gray-50 transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-primary-700">{formatCurrency(product.price * qty)}</span>
                  </div>
                  {addedMsg && (
                    <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-xl">
                      ✓ {t('addedToCart')}
                    </div>
                  )}
                  <Button fullWidth size="lg" loading={adding} onClick={handleAddToCart}>
                    <ShoppingCart className="h-5 w-5" />
                    {isAuthenticated ? t('addToCart') : 'Login to add to cart'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>{/* end desktop flex row */}

        {/* ═══ SECTIONS BELOW THE FOLD ═══ */}
        <div className="mt-10 space-y-10">

          {/* Other farmers */}
          {otherFarmers.length > 0 && (
            <section>
              <h2 className="font-bold text-gray-900 mb-3 text-base">{t('otherFarmers')}</h2>
              <div className="space-y-2">
                {otherFarmers.map(farmer => (
                  <Link key={farmer.id} to={`/product/${farmer.productId}`}
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-shadow">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                      {farmer.name[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{farmer.name}</p>
                      {farmer.district && (
                        <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{farmer.district}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-primary-700">{formatCurrency(farmer.price)}</p>
                      <p className="text-xs text-gray-400">/{farmer.unit}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Customer reviews */}
          <section id="reviews" className="scroll-mt-20">

            {/* Header row: title + sort */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-base">{t('customerReviews')}</h2>
              {reviews.length > 0 && (
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as 'recent' | 'high' | 'low')}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300"
                >
                  <option value="recent">Most Recent</option>
                  <option value="high">Highest First</option>
                  <option value="low">Lowest First</option>
                </select>
              )}
            </div>

            {/* Summary card */}
            {reviewCount > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">

                  {/* Overall score */}
                  <div className="text-center flex-shrink-0 sm:w-28">
                    <div className="text-6xl font-bold text-gray-900 leading-none">{avgRating.toFixed(1)}</div>
                    <div className="flex justify-center gap-0.5 mt-2">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">{reviewCount} {t('reviews')}</p>
                  </div>

                  <div className="hidden sm:block w-px self-stretch bg-gray-100 flex-shrink-0" />

                  {/* Clickable star bars */}
                  <div className="flex-1 space-y-1.5">
                    {[5,4,3,2,1].map(star => {
                      const cnt = starCounts[star] ?? 0
                      const pct = reviews.length > 0 ? (cnt / reviews.length) * 100 : 0
                      const active = filterStar === star
                      return (
                        <button
                          key={star}
                          onClick={() => setFilterStar(active ? null : star)}
                          className={`w-full flex items-center gap-2 rounded-lg px-2 py-0.5 transition-colors ${active ? 'bg-yellow-50 ring-1 ring-yellow-300' : 'hover:bg-gray-50'}`}
                        >
                          <span className="text-xs text-gray-500 w-3 text-right flex-shrink-0">{star}</span>
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{cnt}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Filter pills (Amazon style) */}
            {reviewCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <button
                  onClick={() => setFilterStar(null)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    filterStar === null
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  All
                </button>
                {[5,4,3,2,1].map(star => {
                  const cnt = starCounts[star] ?? 0
                  if (cnt === 0) return null
                  const active = filterStar === star
                  return (
                    <button
                      key={star}
                      onClick={() => setFilterStar(active ? null : star)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-yellow-400 text-gray-900 border-yellow-400'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
                      }`}
                    >
                      <Star className={`h-2.5 w-2.5 ${active ? 'fill-gray-900 text-gray-900' : 'fill-yellow-400 text-yellow-400'}`} />
                      {star} <span className={`font-normal ${active ? 'text-gray-700' : 'text-gray-400'}`}>({cnt})</span>
                    </button>
                  )
                })}
                {filterStar !== null && (
                  <span className="text-xs text-gray-400 ml-1">
                    {displayedReviews.length} result{displayedReviews.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {/* Review cards */}
            {displayedReviews.length === 0 ? (
              reviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                  <Star className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">{t('noReviewsYet')}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                  <p className="text-gray-400 text-sm">No {filterStar}-star reviews on this page</p>
                  <button onClick={() => setFilterStar(null)} className="text-xs text-primary-600 mt-2 hover:underline">
                    Show all reviews
                  </button>
                </div>
              )
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden lg:grid lg:grid-cols-2 lg:divide-x lg:divide-gray-100">
                  {displayedReviews.map((review, idx) => (
                    <ReviewCard key={review.id} review={review} isLast={idx === displayedReviews.length - 1} />
                  ))}
                </div>
                {reviewPages > 1 && !filterStar && (
                  <div className="flex items-center justify-center gap-2 pt-3">
                    <button onClick={() => setReviewPage(p => Math.max(1, p - 1))} disabled={reviewPage === 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-600">{reviewPage} / {reviewPages}</span>
                    <button onClick={() => setReviewPage(p => Math.min(reviewPages, p + 1))} disabled={reviewPage === reviewPages}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Similar products */}
          {(similar ?? []).length > 0 && (
            <section>
              <h2 className="font-bold text-gray-900 mb-3 text-base">{t('similarProducts')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {(similar ?? []).slice(0, 5).map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      </div>{/* end scroll wrapper */}

      <BottomNav />
    </div>
  )
}

// ── Highlights list ────────────────────────────────────────────────────────────
function HighlightsList({ highlights, t }: { highlights: string[]; t: (k: string) => string }) {
  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-green-50 border-b border-green-100">
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </div>
        <h3 className="text-sm font-bold text-green-800">{t('highlights')}</h3>
      </div>
      <ul className="divide-y divide-gray-50">
        {highlights.map((h, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-2">
            <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-2.5 w-2.5 text-green-600" strokeWidth={2.5} />
            </div>
            <span className="text-sm text-gray-700 leading-snug">{h}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Farmer card ────────────────────────────────────────────────────────────────
function FarmerCard({ product }: { product: { farmer?: { id: string; name: string; district?: string | null; rating?: number } | null; farmer_name?: string | null; farmer_id?: string | null } }) {
  if (product.farmer) {
    return (
      <Link to={`/farmer/${product.farmer.id}`}
        className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
          {product.farmer.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{product.farmer.name}</p>
          {product.farmer.district && (
            <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{product.farmer.district}</p>
          )}
        </div>
        {product.farmer.rating != null && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-sm text-gray-600">{product.farmer.rating.toFixed(1)}</span>
          </div>
        )}
      </Link>
    )
  }
  if (product.farmer_name) {
    return (
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
          {product.farmer_name[0]}
        </div>
        <p className="text-sm font-semibold text-gray-800">{product.farmer_name}</p>
      </div>
    )
  }
  return null
}

// ── Expandable description ─────────────────────────────────────────────────────
function ExpandableDescription({ text, label }: { text: string; label: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 200
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800">{label}</h3>
      </div>
      <div className="px-4 py-3">
        <p className={`text-sm text-gray-600 leading-relaxed ${!expanded && isLong ? 'line-clamp-4' : ''}`}>{text}</p>
        {isLong && (
          <button onClick={() => setExpanded(v => !v)} className="mt-2 text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors">
            {expanded ? 'Show less ↑' : 'Read more ↓'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Google Maps-style review card ─────────────────────────────────────────────
function ReviewCard({ review, isLast }: { review: Review; isLast: boolean }) {
  const customerName = review.customer?.full_name ?? 'Customer'
  const customerPhoto = review.customer?.profile_photo ?? null
  const photos = review.photos ?? []

  return (
    <div className={`p-4 ${!isLast ? 'border-b border-gray-50' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0 overflow-hidden">
          {customerPhoto ? <img src={customerPhoto} alt="" className="w-full h-full object-cover" /> : customerName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{customerName}</p>
            <time className="text-xs text-gray-400 flex-shrink-0">{timeAgo(review.created_at)}</time>
          </div>
          <div className="flex gap-0.5 mb-2">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
            ))}
          </div>
          {review.comment && <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>}
          {photos.length > 0 && (
            <div className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar">
              {photos.map((photo, i) => (
                <img key={i} src={photo} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
