import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Leaf, Sparkles } from 'lucide-react'
import { productService, getCategoryEmoji } from '@/services/product.service'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import type { Product } from '@/types'

// ─── Brand palette (from logo) ────────────────────────────────────────────────
// Deep teal: #0d7a7a · Teal mid: #0f8a8a · Deep teal dark: #0a5c5c
// Gold:      #d4a84c · Gold light: #e8c47a · Gold dark: #b8862e
// Cream bg:  #faf7f0 · Cream warm: #f5efe0

// ─── Banner slides — admin will control via /home/config/ in future ───────────
const BANNERS = [
  {
    bg: ['#0a5c5c', '#0f8a8a'],
    accent: '#d4a84c',
    titleKey: 'bannerTitle1',
    subtitleKey: 'bannerSubtitle1',
    emoji: '🌾',
  },
  {
    bg: ['#b8862e', '#d4a84c'],
    accent: '#0d7a7a',
    titleKey: 'bannerTitle2',
    subtitleKey: 'bannerSubtitle2',
    emoji: '🤝',
  },
  {
    bg: ['#0d7a7a', '#1aa39a'],
    accent: '#e8c47a',
    titleKey: 'bannerTitle3',
    subtitleKey: 'bannerSubtitle3',
    emoji: '🌿',
  },
]

export default function HomePage() {
  const { t } = useTranslation('home')
  const { user, language } = useAuthStore()
  const navigate = useNavigate()
  const fetchCart = useCartStore((s) => s.fetchCart)

  const [filter, setFilter] = useState<'all' | 'organic'>('all')
  const [bannerIdx, setBannerIdx] = useState(0)

  useEffect(() => { fetchCart() }, [fetchCart])

  useEffect(() => {
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 4500)
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
    <div className="min-h-screen bg-[#faf7f0] pb-20 sm:pb-0">
      {/* Soft decorative background wash */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(60% 40% at 10% 0%, rgba(13,122,122,0.08), transparent 70%), radial-gradient(50% 35% at 95% 20%, rgba(212,168,76,0.10), transparent 70%)',
        }}
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-4 pb-6 space-y-5">

        {/* Welcome */}
        {user?.full_name && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#0d7a7a]/70">{t('welcomeBack')}</span>
            <span className="font-semibold text-[#0a5c5c]">{user.full_name}</span>
            <span>👋</span>
          </div>
        )}

        {/* ── Hero Banner + All/Organic toggle ─────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl shadow-[0_10px_30px_-12px_rgba(13,122,122,0.35)] ring-1 ring-black/5">
          {/* Animated gradient backgrounds */}
          {BANNERS.map((b, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{
                background: `linear-gradient(120deg, ${b.bg[0]} 0%, ${b.bg[1]} 100%)`,
                opacity: i === bannerIdx ? 1 : 0,
              }}
            />
          ))}

          {/* Decorative wheat-glow */}
          <div
            aria-hidden
            className="absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl opacity-40 transition-colors duration-1000"
            style={{ background: banner.accent }}
          />
          <div
            aria-hidden
            className="absolute -left-12 -bottom-16 h-48 w-48 rounded-full blur-3xl opacity-25 bg-white"
          />

          {/* Content row */}
          <div className="relative flex items-center justify-between gap-3 px-5 py-5 sm:py-6 min-h-[110px]">
            {/* Left — title + subtitle */}
            <div className="flex-1 min-w-0 text-white">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="grid place-items-center h-7 w-7 rounded-full text-base shadow-md"
                  style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)' }}
                >
                  {banner.emoji}
                </span>
                <h2 className="text-base sm:text-lg font-bold leading-tight tracking-tight drop-shadow-sm">
                  {t(banner.titleKey as never)}
                </h2>
              </div>
              <p className="text-white/85 text-xs sm:text-sm leading-snug max-w-md">
                {t(banner.subtitleKey as never)}
              </p>
            </div>

            {/* Right — All | Organic toggle */}
            <div
              className="flex items-center gap-0.5 flex-shrink-0 rounded-full p-1 ring-1 ring-white/25"
              style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(6px)' }}
            >
              <button
                onClick={() => setFilter('all')}
                className="flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={
                  filter === 'all'
                    ? { background: '#fff', color: from, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                    : { color: '#fff' }
                }
              >
                {t('allProducts')}
              </button>
              <button
                onClick={() => setFilter('organic')}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={
                  filter === 'organic'
                    ? { background: '#fff', color: '#0a5c5c', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                    : { color: '#fff' }
                }
              >
                <Leaf className="h-3 w-3" />
                {t('organicOnly')}
              </button>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setBannerIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === bannerIdx ? 20 : 6,
                  background: i === bannerIdx ? '#fff' : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </div>
        </div>


        {/* ── Section heading ──────────────────────────────────────────────── */}
        <SectionHeading title="Shop by category" icon={<Sparkles className="h-3.5 w-3.5" />} />

        {/* ── Category Slider ──────────────────────────────────────────────── */}
        <GlossySlider categories={categories} language={language} />

        {/* ── Today's Picks ────────────────────────────────────────────────── */}
        <HorizontalSection
          title={t('todaysPicks')}
          products={todayPicks}
          loading={picksLoading}
          onSeeAll={() => navigate(`/search?sort=new${isOrganic ? '&is_organic=true' : ''}`)}
        />

        {/* ── Trending ─────────────────────────────────────────────────────── */}
        <HorizontalSection
          title={t('trending')}
          products={trending}
          loading={trendingLoading}
          onSeeAll={() => navigate(`/search?sort=trending${isOrganic ? '&is_organic=true' : ''}`)}
        />

        {/* ── Organic Picks (only in All mode) ─────────────────────────────── */}
        {filter === 'all' && (
          <HorizontalSection
            title="🌿 Organic Picks"
            products={organicProducts}
            loading={organicLoading}
            onSeeAll={() => navigate('/search?is_organic=true')}
            accentColor="gold"
          />
        )}
      </main>

      <BottomNav />
    </div>
  )
}

// ─── Section heading with gold underline ─────────────────────────────────────
function SectionHeading({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      {icon && (
        <span className="grid place-items-center h-6 w-6 rounded-full bg-[#d4a84c]/15 text-[#b8862e]">
          {icon}
        </span>
      )}
      <h3 className="text-[15px] font-bold text-[#0a5c5c] tracking-tight">{title}</h3>
      <span className="flex-1 h-px bg-gradient-to-r from-[#d4a84c]/40 to-transparent" />
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
      <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#faf7f0] to-transparent z-10 pointer-events-none" />
      <div ref={ref} className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => {
          const emoji = getCategoryEmoji(cat.slug)
          const label = language === 'mr' ? cat.name_mr : cat.name_en

          return (
            <button
              key={cat.id}
              onClick={() => navigate(`/category/${cat.slug}`)}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-[68px] h-[68px] rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-200 group-hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(145deg, #ffffff 0%, #f5efe0 100%)',
                  boxShadow:
                    '0 1px 0 0 rgba(255,255,255,0.9) inset, 0 4px 12px -4px rgba(13,122,122,0.20), 0 0 0 1px rgba(13,122,122,0.08)',
                }}
              >
                {cat.icon_url ? (
                  <img src={cat.icon_url} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[30px] leading-none">{emoji}</span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-[#0a5c5c] text-center w-[68px] line-clamp-2 leading-tight group-hover:text-[#b8862e] transition-colors">
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
  accentColor?: 'teal' | 'gold'
}

function HorizontalSection({
  title,
  products,
  loading,
  onSeeAll,
  accentColor = 'teal',
}: HorizontalSectionProps) {
  const { t } = useTranslation('home')
  const seeAllCls =
    accentColor === 'gold'
      ? 'text-[#b8862e] hover:text-[#8a6420]'
      : 'text-[#0d7a7a] hover:text-[#0a5c5c]'

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-5 w-1 rounded-full shrink-0"
            style={{ background: accentColor === 'gold' ? '#d4a84c' : '#0d7a7a' }}
          />
          <h3 className="font-bold text-[#0a5c5c] tracking-tight truncate">{title}</h3>
        </div>
        <button
          onClick={onSeeAll}
          className={`flex items-center gap-0.5 text-sm font-semibold ${seeAllCls} shrink-0`}
        >
          {t('seeAll')} <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : products.length === 0 ? (
        <p className="text-sm text-[#0d7a7a]/50 py-4">{t('noProductsFound')}</p>
      ) : (
        <div className="relative">
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#faf7f0] to-transparent z-10 pointer-events-none" />
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
