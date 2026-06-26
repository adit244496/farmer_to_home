import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Star, Leaf, Minus, Plus, ShoppingCart, MapPin } from 'lucide-react'
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

  const name = getProductName(product, language)
  const description = getProductDescription(product, language)
  const images = product.images ?? []
  const isOutOfStock = product.stock_quantity < product.min_order_qty

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
          {/* Images */}
          <div>
            <div className="aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100 mb-3">
              {images[activeImg]?.image_url ? (
                <img src={images[activeImg].image_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🌿</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {images.map((img, i) => (
                  <button
                    key={img.id}
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

          {/* Details */}
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
              {product.total_ratings > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-semibold text-gray-800">{product.rating.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">({product.total_ratings} {t('reviews')})</span>
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary-700">{formatCurrency(product.price_per_unit)}</span>
                <span className="text-sm text-gray-400">/{product.unit}</span>
              </div>
            </div>

            {/* Farmer */}
            <Link
              to={`/farmer/${product.farmer.id}`}
              className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                {product.farmer.full_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{product.farmer.full_name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {product.farmer.village}, {product.farmer.district}
                </p>
              </div>
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-gray-600">{product.farmer.rating.toFixed(1)}</span>
            </Link>

            {description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">{t('description')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm">
              <span className={isOutOfStock ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                {isOutOfStock ? t('outOfStock') : `${t('inStock')} (${product.stock_quantity} ${product.unit})`}
              </span>
              <span className="text-gray-400">{t('minOrder')}: {product.min_order_qty} {product.unit}</span>
            </div>

            {!isOutOfStock && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{t('selectQuantity')}:</span>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQty((q) => Math.max(product.min_order_qty, q - 1))}
                      className="p-2.5 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 text-sm font-semibold min-w-[3rem] text-center">{qty}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(product.stock_quantity, q + 1))}
                      className="p-2.5 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-primary-700">{formatCurrency(product.price_per_unit * qty)}</span>
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

        {/* Similar */}
        {(similar ?? []).length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-900 mb-3">{t('similarProducts')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(similar ?? []).slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
