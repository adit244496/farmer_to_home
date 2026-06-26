import { Link } from 'react-router-dom'
import { Star, Leaf, ShoppingCart } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency, getProductName, getPrimaryImage } from '@/utils/formatting'
import type { Product } from '@/types'
import { useState } from 'react'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { t } = useTranslation('product')
  const { language, isAuthenticated } = useAuthStore()
  const addItem = useCartStore((s) => s.addItem)
  const [adding, setAdding] = useState(false)

  const name = getProductName(product, language)
  const image = getPrimaryImage(product.images)
  const isOutOfStock = product.stock_quantity < product.min_order_qty

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated || isOutOfStock || adding) return
    setAdding(true)
    try {
      await addItem(product.id, product.min_order_qty)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Link
      to={`/product/${product.id}`}
      className={clsx(
        'group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col',
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
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-full">
              {t('outOfStock')}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs text-gray-500 mb-0.5 truncate">
          {product.farmer.full_name} · {product.farmer.village}
        </p>
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1 flex-1">{name}</h3>

        {/* Rating */}
        {product.total_ratings > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-gray-600">
              {product.rating.toFixed(1)} ({product.total_ratings})
            </span>
          </div>
        )}

        {/* Price + Cart */}
        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-base font-bold text-primary-700">
              {formatCurrency(product.price_per_unit)}
            </span>
            <span className="text-xs text-gray-400">/{product.unit}</span>
          </div>
          {isAuthenticated && !isOutOfStock && (
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
    </Link>
  )
}
