import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Leaf } from 'lucide-react'
import { productService, getCategoryEmoji } from '@/services/product.service'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import type { Product } from '@/types'

// ─── Banner slides — admin will control via /home/config/ in future ───────────
const BANNERS = [
  { bg: ['#1a5c3a', '#2e8f4e'], titleKey: 'bannerTitle1', subtitleKey: 'bannerSubtitle1', emoji: '🌾' },
  { bg: ['#b45309', '#f59e0b'], titleKey: 'bannerTitle2', subtitleKey: 'bannerSubtitle2', emoji: '🤝' },
  { bg: ['#065f46', '#10b981'], titleKey: 'bannerTitle3', subtitleKey: 'bannerSubtitle3', emoji: '🌿' },
]

export default function HomePage() {
  const { t } = useTranslation('home')
  const { user, language } = useAuthStore()
  const navigate = useNavigate()
  const fetchCart = useCartStore((s) => s.fetchCart)

  const [filter, setFilter]     = useState<'all' | 'organic'>('all')
  const [bannerIdx, setBannerIdx] = useState(0)

  useEffect(() => { fetchCart() }, [fetchCart])

  useEffect(() => {
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 4000)
    return () => clearInterval(id)
  }, [])

  const isOrganic = filter === 'organic'

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: productService.getCategories,
    staleTime: 5 * 60 * 1000,
  })

  const { data: todayPicks = [], isLoading: picksLoading } = useQuery({
    queryKey: ['todayPicks', filter],
    queryFn: () => productService.getTodayPicks(isOrganic),
  })

  const { data: trending = [], isLoading: trendingLoading } = useQuery({
    queryKey: ['trending', filter],
    queryFn: () => productService.getTrendingProducts(isOrganic),
  })

  const { data: organicProducts = [], isLoading: organicLoading } = useQuery({
    queryKey: ['organic'],
    queryFn: productService.getOrganicProducts,
    enabled: filter === 'all',
  })

  const banner = BANNERS[bannerIdx]
  const [from, to] = banner.bg

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-3 pb-6 space-y-4">

        {/* Welcome */}
        {user?.full_name && (
          <p className="text-gray-500 text-sm">
            {t('welcomeBack')}
            <span className="font-semibold text-gray-800"> {user.full_name}</span> 👋
          </p>
        )}

        {/* ── Compact Banner + All/Organic toggle ────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl">
          {/* Animated background */}
          {BANNERS.map((b, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700"
              style={{
                background: `linear-gradient(120deg, ${b.bg[0]}, ${b.bg[1]})`,
                opacity: i === bannerIdx ? 1 : 0,
              }}
            />
          ))}

          {/* Content row */}
          <div className="relative flex items-center justify-between gap-3 px-4 py-3">
            {/* Left — title + subtitle */}
            <div className="flex-1 min-w-0 text-white">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-base leading-none">{banner.emoji}</span>
                <h2 className="text-sm font-bold leading-tight">{t(banner.titleKey as never)}</h2>
              </div>
              <p className="text-white/75 text-xs leading-snug">{t(banner.subtitleKey as never)}</p>
            </div>

            {/* Right — All | Organic side-by-side toggle */}
            <div className="flex items-center gap-1 flex-shrink-0 bg-white/15 rounded-full p-0.5">
              <button
                onClick={() => setFilter('all')}
                className="flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={
                  filter === 'all'
                    ? { background: 'rgba(255,255,255,1)', color: from }
                    : { color: '#fff' }
                }
              >
                {t('allProducts')}
              </button>
              <button
                onClick={() => setFilter('organic')}
                className="flex items-center justify-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={
                  filter === 'organic'
                    ? { background: 'rgba(255,255,255,1)', color: '#065f46' }
                    : { color: '#fff' }
                }
              >
                <Leaf className="h-3 w-3" />
                {t('organicOnly')}
              </button>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setBannerIdx(i)}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === bannerIdx ? 16 : 6,
                  background: i === bannerIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Category Slider — icons set by admin via /categories/ ─────────── */}
        <GlossySlider categories={categories} language={language} />

        {/* ── Today's Picks ─────────────────────────────────────────────────── */}
        <HorizontalSection
          title={t('todaysPicks')}
          products={todayPicks}
          loading={picksLoading}
          onSeeAll={() => navigate(`/search?sort=new${isOrganic ? '&is_organic=true' : ''}`)}
        />

        {/* ── Trending ──────────────────────────────────────────────────────── */}
        <HorizontalSection
          title={t('trending')}
          products={trending}
          loading={trendingLoading}
          onSeeAll={() => navigate(`/search?sort=trending${isOrganic ? '&is_organic=true' : ''}`)}
        />

        {/* ── Organic Picks (only in All mode) ──────────────────────────────── */}
        {filter === 'all' && (
          <HorizontalSection
            title="🌿 Organic Picks"
            products={organicProducts}
            loading={organicLoading}
            onSeeAll={() => navigate('/search?is_organic=true')}
            accentColor="green"
          />
        )}
      </main>

      <BottomNav />
    </div>
  )
}

// ─── Glossy Category Slider ───────────────────────────────────────────────────
type CategoryList = Awaited<ReturnType<typeof productService.getCategories>>

function GlossySlider({ categories, language }: { categories: CategoryList; language: 'en' | 'mr' }) {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div className="relative">
      <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
      <div ref={ref} className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const emoji = getCategoryEmoji(cat.slug)
          const label = language === 'mr' ? cat.name_mr : cat.name_en

          return (
            <button
              key={cat.id}
              onClick={() => navigate(`/category/${cat.slug}`)}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
            >
              <div className="w-[64px] h-[64px] rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100 group-hover:shadow-md transition-shadow flex items-center justify-center">
                {cat.icon_url ? (
                  <img src={cat.icon_url} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[28px] leading-none">{emoji}</span>
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-600 text-center w-[64px] line-clamp-2 leading-tight group-hover:text-primary-700 transition-colors">
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Horizontal scroll product section ───────────────────────────────────────
interface HorizontalSectionProps {
  title: string
  products: Product[]
  loading: boolean
  onSeeAll: () => void
  accentColor?: 'teal' | 'green'
}

function HorizontalSection({ title, products, loading, onSeeAll, accentColor = 'teal' }: HorizontalSectionProps) {
  const { t } = useTranslation('home')
  const seeAllCls = accentColor === 'green'
    ? 'text-green-600 hover:text-green-700'
    : 'text-primary-700 hover:text-primary-800'

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <button onClick={onSeeAll} className={`flex items-center gap-0.5 text-sm font-medium ${seeAllCls}`}>
          {t('seeAll')} <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">{t('noProductsFound')}</p>
      ) : (
        <div className="relative">
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {products.map((p) => (
              <div key={p.id} className="flex-shrink-0 w-44">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
