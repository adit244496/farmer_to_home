import { useMemo, useState } from 'react'
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
    <div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-20"><Spinner /></div></div>
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

  const reviews: Review[] = reviewsData?.items ?? reviewsData?.results ?? []
  const reviewPages: number = reviewsData?.pages ?? 1

  // ── Shared sub-pieces ─────────────────────────────────────────────────────

  const QtyControls = () => (
    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button onClick={() => setQty(q => Math.max(minQty, q - 1))} className="p-2.5 text-gray-600 hover:bg-gray-100 transition-colors">
        <Minus className="h-4 w-4" />
      </button>
      <span className="px-4 py-2 text-sm font-semibold min-w-[3rem] text-center">{qty}</span>
      <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="p-2.5 text-gray-600 hover:bg-gray-100 transition-colors">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )

  const FarmerCard = ({ compact = false }: { compact?: boolean }) =>
    product.farmer ? (
      <Link
        to={`/farmer/${product.farmer.id}`}
        className={`flex items-center gap-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors ${compact ? 'p-3' : 'p-3'}`}
      >
        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
          {product.farmer.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{product.farmer.name}</p>
          {product.farmer.district && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" />{product.farmer.district}
            </p>
          )}
        </div>
        {product.farmer.rating != null && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-sm text-gray-600">{product.farmer.rating.toFixed(1)}</span>
          </div>
        )}
      </Link>
    ) : product.farmer_name ? (
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
          {product.farmer_name[0]}
        </div>
        <p className="text-sm font-semibold text-gray-800">{product.farmer_name}</p>
      </div>
    ) : null

  const KeyFact = () => criticalDiff ? (
    <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5">
      <span className="text-xl leading-none flex-shrink-0 mt-0.5">⭐</span>
      <div>
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">{t('whyDifferent')}</p>
        <p className="text-sm text-amber-900 leading-relaxed">{criticalDiff}</p>
      </div>
    </div>
  ) : null

  const HighlightsList = () => highlights.length > 0 ? (
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
  ) : null

  // ── Image gallery ──────────────────────────────────────────────────────────
  const ImageGallery = () => (
    <div>
      <div className="relative bg-white rounded-2xl overflow-hidden border border-gray-100 mb-3 aspect-[4/3] lg:aspect-square">
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
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button key={img.id ?? i} onClick={() => setActiveImg(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-primary-600' : 'border-gray-200'}`}>
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )

  // ── Name + rating block ────────────────────────────────────────────────────
  const NameBlock = () => (
    <div>
      <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 leading-tight mb-1">{name}</h1>
      {reviewCount > 0 && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
            ))}
          </div>
          <span className="text-sm font-semibold text-gray-800">{avgRating.toFixed(1)}</span>
          <span className="text-sm text-gray-400">({reviewCount} {t('reviews')})</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <Header />

      {/* ── Full-width page wrapper ── */}
      <div className="px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-4 max-w-[1440px] mx-auto">

        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-5 text-sm">
          <ArrowLeft className="h-4 w-4" /> {tc('back')}
        </button>

        {/* ── Mobile: key fact before image ── */}
        {criticalDiff && (
          <div className="lg:hidden mb-4"><KeyFact /></div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            3-COLUMN GRID
            mobile     : single column (stacked)
            lg (1024px): 2-column — image | details+cart
            xl (1280px): 3-column — image | details | purchase card
            ═══════════════════════════════════════════════════════════════ */}
        <div className="grid lg:grid-cols-5 xl:grid-cols-[2fr_3fr_2fr] gap-6 lg:gap-8 xl:gap-10 items-start">

          {/* ── COL 1: Image (sticky on desktop) ── */}
          <div className="lg:col-span-2 xl:col-span-1 lg:sticky lg:top-20">
            <ImageGallery />

            {/* Mobile only: highlights right after image */}
            {highlights.length > 0 && (
              <div className="lg:hidden mt-4"><HighlightsList /></div>
            )}
          </div>

          {/* ── COL 2: Product details ── */}
          <div className="lg:col-span-3 xl:col-span-1 space-y-5">
            <NameBlock />

            {/* Price + top cart — visible on lg, hidden on xl (price lives in purchase card) */}
            <div className="xl:hidden space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl lg:text-3xl font-bold text-primary-700">{formatCurrency(product.price)}</span>
                <span className="text-sm text-gray-400">/{product.unit}</span>
              </div>

              {inStock ? (
                <div className="bg-gray-50 rounded-xl p-3 flex flex-wrap items-center gap-3">
                  <QtyControls />
                  <span className="text-sm font-bold text-primary-700 flex-shrink-0">{formatCurrency(product.price * qty)}</span>
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
            </div>

            {/* Farmer card — lg only (xl shows in purchase card) */}
            <div className="xl:hidden"><FarmerCard /></div>

            {/* Key fact — desktop right column (lg), desktop center column (xl) */}
            <div className="hidden lg:block"><KeyFact /></div>

            {/* Highlights — desktop only */}
            <div className="hidden lg:block"><HighlightsList /></div>

            {/* Description — always visible on desktop */}
            {description && (
              <div className="hidden lg:block">
                <ExpandableDescription text={description} label={t('description')} />
              </div>
            )}
            {/* Description — mobile */}
            {description && (
              <div className="lg:hidden">
                <ExpandableDescription text={description} label={t('description')} />
              </div>
            )}

            {/* Bottom stock + cart — lg only (xl purchase card handles this) */}
            <div className="xl:hidden space-y-3 pt-1 border-t border-gray-100">
              <div className="flex items-center gap-3 text-sm pt-3">
                <span className={inStock ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                  {inStock ? `${t('inStock')} (${product.stock} ${product.unit})` : t('outOfStock')}
                </span>
                <span className="text-gray-400">{t('minOrder')}: {minQty} {product.unit}</span>
              </div>
              {inStock && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{t('selectQuantity')}:</span>
                    <QtyControls />
                    <span className="text-sm font-bold text-primary-700">{formatCurrency(product.price * qty)}</span>
                  </div>
                  {addedMsg && (
                    <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-xl">
                      ✓ {t('addedToCart')}
                    </div>
                  )}
                  <Button fullWidth size="lg" loading={adding} onClick={handleAddToCart}>
                    <ShoppingCart className="h-4 w-4" /> {isAuthenticated ? t('addToCart') : 'Login to add to cart'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ── COL 3: Sticky purchase card (xl only) ── */}
          <div className="hidden xl:block xl:col-span-1 xl:sticky xl:top-20">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Price banner */}
              <div className="bg-primary-50 border-b border-primary-100 px-5 py-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-primary-700">{formatCurrency(product.price)}</span>
                  <span className="text-sm text-gray-500">/{product.unit}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className={inStock ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                    {inStock ? `● ${t('inStock')} (${product.stock} ${product.unit})` : `○ ${t('outOfStock')}`}
                  </span>
                  {inStock && <span className="text-gray-400">{t('minOrder')}: {minQty} {product.unit}</span>}
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Quantity */}
                {inStock && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-600 flex-shrink-0">{t('selectQuantity')}:</span>
                      <div className="flex items-center gap-2">
                        <QtyControls />
                        <span className="text-sm font-bold text-primary-700 whitespace-nowrap">{formatCurrency(product.price * qty)}</span>
                      </div>
                    </div>

                    {addedMsg && (
                      <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-xl text-center">
                        ✓ {t('addedToCart')}
                      </div>
                    )}

                    <Button fullWidth size="lg" loading={adding} onClick={handleAddToCart}>
                      <ShoppingCart className="h-5 w-5" />
                      {isAuthenticated ? t('addToCart') : 'Login to buy'}
                    </Button>
                  </div>
                )}

                {/* Farmer */}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">{t('soldBy')}</p>
                  <FarmerCard compact />
                </div>
              </div>
            </div>
          </div>

        </div>{/* end 3-col grid */}

        {/* ── Sections below the grid ── */}
        <div className="mt-8 space-y-8 max-w-5xl">

          {/* Other farmers */}
          {otherFarmers.length > 0 && (
            <section>
              <h2 className="font-bold text-gray-900 mb-3">{t('otherFarmers')}</h2>
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

          {/* Customer reviews — Google Maps style */}
          <section id="reviews" className="scroll-mt-20">
            <h2 className="font-bold text-gray-900 mb-4">{t('customerReviews')}</h2>

            {reviewCount > 0 && (
              <div className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
                <div className="flex items-start gap-6">
                  <div className="text-center flex-shrink-0 w-20">
                    <div className="text-5xl font-bold text-gray-900 leading-none">{avgRating.toFixed(1)}</div>
                    <div className="flex justify-center gap-0.5 mt-2">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{reviewCount} {t('reviews')}</p>
                  </div>
                  <div className="flex-1 space-y-1.5 pt-1">
                    {[5,4,3,2,1].map(star => {
                      const cnt = reviews.filter(r => Math.round(r.rating) === star).length
                      const pct = reviews.length > 0 ? (cnt / reviews.length) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-3 text-right">{star}</span>
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <Star className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">{t('noReviewsYet')}</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {reviews.map((review, idx) => (
                    <ReviewCard key={review.id} review={review} isLast={idx === reviews.length - 1} />
                  ))}
                </div>
                {reviewPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-3">
                    <button onClick={() => setReviewPage(p => Math.max(1, p - 1))} disabled={reviewPage === 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-600">{reviewPage} / {reviewPages}</span>
                    <button onClick={() => setReviewPage(p => Math.min(reviewPages, p + 1))} disabled={reviewPage === reviewPages}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
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
              <h2 className="font-bold text-gray-900 mb-3">{t('similarProducts')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {(similar ?? []).slice(0, 5).map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      <BottomNav />
    </div>
  )
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
  const initial = customerName[0]?.toUpperCase() ?? '?'

  return (
    <div className={`p-4 ${!isLast ? 'border-b border-gray-50' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0 overflow-hidden">
          {customerPhoto ? <img src={customerPhoto} alt="" className="w-full h-full object-cover" /> : initial}
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
