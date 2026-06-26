import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { productService } from '@/services/product.service'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Spinner'

const CATEGORIES = [
  { id: 'Vegetables', emoji: '🥦', key: 'vegetables' },
  { id: 'Fruits', emoji: '🍎', key: 'fruits' },
  { id: 'Grains', emoji: '🌾', key: 'grains' },
  { id: 'Dairy', emoji: '🥛', key: 'dairy' },
  { id: 'Spices', emoji: '🌶️', key: 'spices' },
  { id: 'Organic', emoji: '🌿', key: 'organic' },
]

export default function HomePage() {
  const { t } = useTranslation('home')
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const fetchCart = useCartStore((s) => s.fetchCart)

  useEffect(() => { fetchCart() }, [fetchCart])

  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: productService.getTrendingProducts,
  })

  const { data: todayPicks, isLoading: picksLoading } = useQuery({
    queryKey: ['todayPicks'],
    queryFn: productService.getTodayPicks,
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-8">
        {/* Welcome */}
        {user && (
          <p className="text-gray-600 text-sm">
            {t('welcomeBack')} <span className="font-semibold text-gray-800">{user.full_name}</span> 👋
          </p>
        )}

        {/* Hero banner */}
        <div className="bg-gradient-to-r from-primary-700 to-primary-600 rounded-3xl p-6 text-white">
          <h2 className="text-xl font-bold mb-1">{t('bannerTitle1')}</h2>
          <p className="text-primary-100 text-sm mb-4">{t('bannerSubtitle1')}</p>
          <button
            onClick={() => navigate('/search')}
            className="bg-white text-primary-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors"
          >
            {t('shopNow')}
          </button>
        </div>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">{t('categories')}</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.id}`}
                className="flex flex-col items-center gap-2 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 hover:border-primary-300 hover:shadow-md transition-all"
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-medium text-gray-700">{t(cat.key as keyof typeof t)}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Today's Picks */}
        <section>
          <SectionHeader title={t('todaysPicks')} onSeeAll={() => navigate('/search?sort=new')} />
          {picksLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(todayPicks ?? []).slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>

        {/* Trending */}
        <section>
          <SectionHeader title={t('trending')} onSeeAll={() => navigate('/search?sort=trending')} />
          {trendingLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(trending ?? []).slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  const { t } = useTranslation('home')
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-bold text-gray-900">{title}</h3>
      <button
        onClick={onSeeAll}
        className="flex items-center gap-0.5 text-sm text-primary-700 font-medium hover:text-primary-800"
      >
        {t('seeAll')} <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
