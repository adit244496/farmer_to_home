import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Leaf, ShoppingCart, Star, X } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency, getProductName, getPrimaryImage } from '@/utils/formatting'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { t } = useTranslation('product')
  const navigate = useNavigate()
  const { language, isAuthenticated } = useAuthStore()
  const addItem = useCartStore((s) => s.addItem)
  const [adding, setAdding] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const name    = getProductName(product, language)
  const image   = product.primary_image ?? getPrimaryImage(product.images)
  const minQty  = product.min_order_qty ?? 1
  const inStock = product.stock >= minQty

  const criticalDiff = language === 'mr'
    ? (product.critical_difference_mr || product.critical_difference)
    : product.critical_difference

  const highlights = (
    language === 'mr'
      ? (product.highlights_mr ?? product.highlights ?? product.benefits_mr ?? product.benefits)
      : (product.highlights ?? product.benefits)
  ) ?? []

  const hasInfo     = !!(criticalDiff || highlights.length > 0)
  const productRating = product.avg_rating ?? product.rating
  const farmerRating  = product.farmer_rating ?? product.farmer?.rating

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated || !inStock || adding) return
    setAdding(true)
    try { await addItem(product.id, minQty) }
    finally { setAdding(false) }
  }

  const goToProduct = () => navigate(`/product/${product.id}`)

  return (
    <>
      <article
        onClick={goToProduct}
        onKeyDown={(e) => e.key === 'Enter' && goToProduct()}
        role="button"
        tabIndex={0}
        className={clsx(
          'group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer',
          className
        )}
      >
        {/* Image */}
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🌿</div>
          )}

          {product.is_organic && (
            <span className="absolute top-2 left-2 flex items-center gap-0.5 bg-green-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              <Leaf className="h-2.5 w-2.5" />
              {t('organic')}
            </span>
          )}

          {/* Italic "i" — no border, no fill, bottom-right corner */}
          {hasInfo && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfo(true) }}
              aria-label={t('productInfo')}
              className="absolute bottom-1.5 right-2 z-10 italic font-serif text-white text-[15px] font-bold leading-none select-none hover:text-yellow-200 transition-colors"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.75)' }}
            >
              i
            </button>
          )}

          {!inStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-full">
                {t('outOfStock')}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col flex-1">
          {/* Farmer name + product rating — only rendered when farmer_name is present */}
          {product.farmer_name ? (
            <div className="flex items-center gap-1 mb-1">
              {product.farmer_id ? (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/farmer/${product.farmer_id}`) }}
                  className="text-xs text-teal-600 hover:underline truncate text-left leading-tight flex-1 min-w-0"
                >
                  {product.farmer_name}
                  {farmerRating != null && (
                    <span className="text-gray-400 font-normal ml-1">
                      ({farmerRating.toFixed(1)})
                    </span>
                  )}
                </button>
              ) : (
                <span className="text-xs text-gray-500 truncate leading-tight flex-1 min-w-0">
                  {product.farmer_name}
                  {farmerRating != null && (
                    <span className="text-gray-400 ml-1">({farmerRating.toFixed(1)})</span>
                  )}
                </span>
              )}

              {productRating != null && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}#reviews`) }}
                  className="flex items-center gap-0.5 flex-shrink-0 hover:opacity-75 transition-opacity"
                >
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-semibold text-gray-700">{productRating.toFixed(1)}</span>
                </button>
              )}
            </div>
          ) : productRating != null ? (
            /* No farmer name but has a rating — show rating aligned right */
            <div className="flex justify-end mb-1">
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}#reviews`) }}
                className="flex items-center gap-0.5 hover:opacity-75 transition-opacity"
              >
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-semibold text-gray-700">{productRating.toFixed(1)}</span>
              </button>
            </div>
          ) : null}

          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1 flex-1">{name}</h3>

          {/* Price + Cart */}
          <div className="flex items-center justify-between mt-auto">
            <div>
              <span className="text-base font-bold text-primary-700">
                {formatCurrency(product.price)}
              </span>
              <span className="text-xs text-gray-400">/{product.unit}</span>
            </div>
            {isAuthenticated && inStock && (
              <button
                onClick={handleAddToCart}
                disabled={adding}
                className="p-2 bg-primary-700 text-white rounded-xl hover:bg-primary-800 transition-colors disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Info popup — bottom-sheet on mobile, centered modal on desktop */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-3 pb-0 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-3 sm:pt-4 sm:border-b sm:border-gray-100">
              <h3 className="font-bold text-gray-900 text-[15px] pr-2 leading-snug">{name}</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 pb-6 pt-1 space-y-4 max-h-[72vh] overflow-y-auto">
              {/* Critical difference — amber callout */}
              {criticalDiff && (
                <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                  <span className="text-[18px] leading-none flex-shrink-0 mt-0.5">⭐</span>
                  <div>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">
                      {t('whyDifferent')}
                    </p>
                    <p className="text-sm text-amber-900 leading-relaxed">{criticalDiff}</p>
                  </div>
                </div>
              )}

              {/* Highlights — green circle checks */}
              {highlights.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    {t('highlights')}
                  </p>
                  <ul className="space-y-3">
                    {highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0 w-[22px] h-[22px] rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                        <span className="text-sm text-gray-700 leading-snug">{h}</span>
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
