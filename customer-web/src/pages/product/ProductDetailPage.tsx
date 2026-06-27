import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Leaf, MapPin, Minus, Plus, ShoppingCart, Star } from 'lucide-react'
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
    const items = otherListings.items ?? otherListings.results ?? []
    for (const p of items) {
      if (!p.farmer_id || p.id === product.id) continue
      if (p.farmer_id === currentFarmerId) continue
      if (seen.has(p.farmer_id)) continue
      seen.add(p.farmer_id)
      list.push({
        id: p.farmer_id,
        name: p.farmer_name ?? '',
        district: p.farmer_district ?? undefined,
        productId: p.id,
        price: p.price,
        unit: p.unit,
      })
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
      setTimeout(() => setAddedMsg(false), 2000)
    } finally {
      setAdding(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center py-20"><Spinner /></div>
      </div>
    )
  }

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-0">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> {tc('back')}
        </button>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Images ── */}
          <div>
            {/* Main image with prev/next arrows */}
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100 mb-3">
              {images[activeImg]?.image_url ? (
                <img src={images[activeImg].image_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🌿</div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur rounded-full p-1.5 shadow hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => setActiveImg((i) => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur rounded-full p-1.5 shadow hover:bg-white transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-700" />
                  </button>
                  {/* Dot indicators */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          i === activeImg ? 'bg-primary-600' : 'bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {images.map((img, i) => (
                  <button
                    key={img.id ?? i}
                    onClick={() => setActiveImg(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${
                      i === activeImg ? 'border-primary-600' : 'border-gray-200'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Details ── */}
          <div className="space-y-4">
            <div>
              <div className="flex items-start gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900 flex-1">{name}</h1>
                {product.is_organic && (
                  <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
                    <Leaf className="h-3 w-3" /> {t('organic')}
                  </span>
                )}
              </div>

              {reviewCount > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(avgRating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 fill-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 ml-1">{avgRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">({reviewCount} {t('reviews')})</span>
                </div>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary-700">{formatCurrency(product.price)}</span>
                <span className="text-sm text-gray-400">/{product.unit}</span>
              </div>
            </div>

            {/* Farmer */}
            {product.farmer ? (
              <Link
                to={`/farmer/${product.farmer.id}`}
                className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                  {product.farmer.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{product.farmer.name}</p>
                  {product.farmer.district && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {product.farmer.district}
                    </p>
                  )}
                </div>
                {product.farmer.rating != null && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm text-gray-600">{product.farmer.rating.toFixed(1)}</span>
                  </div>
                )}
              </Link>
            ) : product.farmer_name ? (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                  {product.farmer_name[0]}
                </div>
                <p className="text-sm font-semibold text-gray-800">{product.farmer_name}</p>
              </div>
            ) : null}

            {/* Critical Difference */}
            {criticalDiff && (
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
                <h3 className="text-xs font-bold text-primary-700 uppercase tracking-wide mb-1.5">
                  {t('whyDifferent')}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{criticalDiff}</p>
              </div>
            )}

            {/* Highlights / Benefits */}
            {highlights.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('highlights')}</h3>
                <ul className="space-y-1.5">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 font-bold mt-0.5">✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">{t('description')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm">
              <span className={!inStock ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                {!inStock ? t('outOfStock') : `${t('inStock')} (${product.stock} ${product.unit})`}
              </span>
              <span className="text-gray-400">{t('minOrder')}: {minQty} {product.unit}</span>
            </div>

            {inStock && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{t('selectQuantity')}:</span>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQty((q) => Math.max(minQty, q - 1))}
                      className="p-2.5 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 text-sm font-semibold min-w-[3rem] text-center">{qty}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                      className="p-2.5 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
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
                  <ShoppingCart className="h-4 w-4" />
                  {isAuthenticated ? t('addToCart') : 'Login to add to cart'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Other Farmers Selling This ── */}
        {otherFarmers.length > 0 && (
          <section className="mt-8">
            <h2 className="font-bold text-gray-900 mb-3">{t('otherFarmers')}</h2>
            <div className="space-y-2">
              {otherFarmers.map((farmer) => (
                <Link
                  key={farmer.id}
                  to={`/product/${farmer.productId}`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                    {farmer.name[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{farmer.name}</p>
                    {farmer.district && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {farmer.district}
                      </p>
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

        {/* ── Customer Reviews ── */}
        <section id="reviews" className="mt-8 scroll-mt-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">{t('customerReviews')}</h2>
            {reviewCount > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-semibold text-gray-800">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400 ml-1">({reviewCount})</span>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
              <p className="text-gray-400 text-sm">{t('noReviewsYet')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}

              {/* Pagination */}
              {reviewPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                    disabled={reviewPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    {reviewPage} / {reviewPages}
                  </span>
                  <button
                    onClick={() => setReviewPage((p) => Math.min(reviewPages, p + 1))}
                    disabled={reviewPage === reviewPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Similar Products ── */}
        {(similar ?? []).length > 0 && (
          <section className="mt-8">
            <h2 className="font-bold text-gray-900 mb-3">{t('similarProducts')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(similar ?? []).slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const { t } = useTranslation('product')
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0 overflow-hidden">
          {review.customer.profile_photo ? (
            <img src={review.customer.profile_photo} alt="" className="w-full h-full object-cover" />
          ) : (
            review.customer.full_name[0]
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-800 truncate">{review.customer.full_name}</p>
            <time className="text-xs text-gray-400 flex-shrink-0">
              {new Date(review.created_at).toLocaleDateString()}
            </time>
          </div>

          {/* Stars */}
          <div className="flex gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-3.5 w-3.5 ${
                  star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'
                }`}
              />
            ))}
          </div>

          {review.comment && (
            <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
          )}

          {/* Review photos */}
          {review.photos && review.photos.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
              {review.photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 ml-12">
        <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
          {t('verifiedPurchase')}
        </span>
      </div>
    </div>
  )
}
