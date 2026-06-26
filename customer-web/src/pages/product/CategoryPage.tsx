import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { productService } from '@/services/product.service'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import { useState } from 'react'

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('home')
  const [organicOnly, setOrganicOnly] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['category', id, organicOnly],
    queryFn: () =>
      productService.searchProducts({
        category: id,
        is_organic: organicOnly || undefined,
        page_size: 30,
      }),
  })

  const products = data?.results ?? []

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 capitalize">{id}</h1>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setOrganicOnly(!organicOnly)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              organicOnly
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
            }`}
          >
            🌿 {t('organicOnly')}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : products.length === 0 ? (
          <p className="text-center text-gray-400 py-16">{t('noProductsFound')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
