import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Leaf, Sparkles } from 'lucide-react'
import { productService, getCategoryEmoji } from '@/services/product.service'
import { useAuthStore } from '@/store/authStore'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import type { Product } from '@/types'

// ─── Brand palette ────────────────────────────────────────────────────────────
// Deep teal: #0d7a7a  ·  Gold: #d4a84c  ·  Cream bg: #faf7f0

const BANNERS = [
  {
    bg: ['#0a5c5c', '#0f8a8a'],
    accent: '#d4a84c',
    titleKey: 'bannerTitle1',
    subtitleKey: 'bannerSubtitle1',
    emoji: '🌾',
    bullets: ['No chemicals', 'Farm fresh', 'Daily harvest'],
  },
  {
    bg: ['#b8862e', '#d4a84c'],
    accent: '#0d7a7a',
    titleKey: 'bannerTitle2',
    subtitleKey: 'bannerSubtitle2',
    emoji: '🤝',
    bullets: ['Fair price', 'Direct from farmers', 'Trusted quality'],
  },
  {
    bg: ['#0d7a7a', '#1aa39a'],
    accent: '#e8c47a',
    titleKey: 'bannerTitle3',
    subtitleKey: 'bannerSubtitle3',
    emoji: '🌿',
    bullets: ['100% natural', 'Certified organic', 'No preservatives'],
  },
] as const

export default function HomePage() {
  const { t } = useTranslation('home')
  const { user, language } = useAuthStore()
  const navigate = useNavigate()

  const [filter, setFilter] = useState<'all' | 'organic'>('all')
  const [bannerIdx, setBannerIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 4500)
    return () => clearInterval(id)
  }, [])

  const isOrganic = filter === 'organic'
  const banner = BANNERS[bannerIdx]
  const [from] = banner.bg

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

  return (
    <div className="h-dvh flex flex-col bg-[#faf7f0] pb-20 sm:pb-0">
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

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pt-4 pb-6 space-y-5">

        {/* Welcome */}
        {user?.full_name && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#0d7a7a]/70">{t('welcomeBack')}</span>
            <span className="font-semibold text-[#0a5c5c]">{user.full_name}</span>
            <span>👋</span>
          </div>
        )}

        {/* ── Hero Banner ───────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl shadow-[0_10px_30px_-12px_rgba(13,122,122,0.35)] ring-1 ring-black/5">
          {/* Animated gradient backgrounds */}
          {BANNERS.map((b, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{
                background: `linear-gradient(135deg, ${b.bg[0]} 0%, ${b.bg[1]} 100%)`,
                opacity: i === bannerIdx ? 1 : 0,
              }}
            />
          ))}

          {/* Decorative blobs */}
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl opacity-40 transition-colors duration-1000"
            style={{ background: banner.accent }}
          />
          <div aria-hidden className="absolute -left-12 -bottom-10 h-40 w-40 rounded-full blur-3xl opacity-20 bg-white" />
          {/* Subtle grid pattern overlay */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 20px), repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 20px)',
            }}
          />

          {/* ── Content ── */}
          <div className="relative px-5 pt-5 pb-4">

            {/* Row 1: title + large emoji */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-[18px] sm:text-xl font-extrabold text-white leading-tight tracking-tight drop-shadow-sm">
                  {t(banner.titleKey as never)}
                </h2>
                <p className="text-white/75 text-[11px] sm:text-xs mt-0.5 leading-snug">
                  {t(banner.subtitleKey as never)}
                </p>
              </div>
              <span
                className="text-5xl sm:text-6xl leading-none drop-shadow-lg flex-shrink-0 -mt-1"
                style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))' }}
              >
                {banner.emoji}
              </span>
            </div>

            {/* Row 2: bullet pills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {banner.bullets.map((b, i) => (
                <span
                  key={i}
                  className="text-[11px] font-medium text-white/95 rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)' }}
                >
                  {b}
                </span>
              ))}
            </div>

            {/* Slide dots */}
            <div className="flex justify-center gap-1.5 mt-3.5">
              {BANNERS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIdx(i)}
                  aria-label={`Slide ${i + 1}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === bannerIdx ? 20 : 6,
                    background: i === bannerIdx ? '#fff' : 'rgba(255,255,255,0.40)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Row 3: full-width All / Organic toggle strip */}
          <div
            className="relative flex gap-2 px-4 py-3"
            style={{ background: 'rgba(0,0,0,0.12)', backdropFilter: 'blur(4px)', borderTop: '1px solid rgba(255,255,255,0.12)' }}
          >
            <button
              onClick={() => setFilter('all')}
              className="flex-1 flex items-center justify-center py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                filter === 'all'
                  ? { background: '#fff', color: from, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }
                  : { background: 'rgba(255,255,255,0.15)', color: '#fff' }
              }
            >
              {t('allProducts')}
            </button>
            <button
              onClick={() => setFilter('organic')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                filter === 'organic'
                  ? { background: '#fff', color: '#0a5c5c', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }
                  : { background: 'rgba(255,255,255,0.15)', color: '#fff' }
              }
            >
              <Leaf className="h-3 w-3" />
              {t('organicOnly')}
            </button>
          </div>
        </div>

        {/* ── Shop by category ─────────────────────────────────────────────── */}
        <SectionHeading title="Shop by category" icon={<Sparkles className="h-3.5 w-3.5" />} />
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

        {/* ── Organic Picks ─────────────────────────────────────────────────── */}
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

  const catButtons = categories.map((cat) => {
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
            boxShadow: '0 1px 0 0 rgba(255,255,255,0.9) inset, 0 4px 12px -4px rgba(13,122,122,0.20), 0 0 0 1px rgba(13,122,122,0.08)',
          }}
        >
          {cat.icon_url
            ? <img src={cat.icon_url} alt={label} className="w-full h-full object-cover" />
            : <span className="text-[30px] leading-none">{emoji}</span>}
        </div>
        <span className="text-[11px] font-semibold text-[#0a5c5c] text-center w-[68px] line-clamp-2 leading-tight group-hover:text-[#b8862e] transition-colors">
          {label}
        </span>
      </button>
    )
  })

  return (
    <>
      {/* Mobile: horizontal scroll */}
      <div className="relative sm:hidden">
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#faf7f0] to-transparent z-10 pointer-events-none" />
        <div ref={ref} className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {catButtons}
        </div>
      </div>
      {/* Desktop: flex-wrap so all categories show */}
      <div className="hidden sm:flex flex-wrap gap-4">
        {catButtons}
      </div>
    </>
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

function HorizontalSection({ title, products, loading, onSeeAll, accentColor = 'teal' }: HorizontalSectionProps) {
  const { t } = useTranslation('home')
  const seeAllCls = accentColor === 'gold' ? 'text-[#b8862e] hover:text-[#8a6420]' : 'text-[#0d7a7a] hover:text-[#0a5c5c]'

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-5 w-1 rounded-full shrink-0" style={{ background: accentColor === 'gold' ? '#d4a84c' : '#0d7a7a' }} />
          <h3 className="font-bold text-[#0a5c5c] tracking-tight truncate">{title}</h3>
        </div>
        <button onClick={onSeeAll} className={`flex items-center gap-0.5 text-sm font-semibold ${seeAllCls} shrink-0`}>
          {t('seeAll')} <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : products.length === 0 ? (
        <p className="text-sm text-[#0d7a7a]/50 py-4">{t('noProductsFound')}</p>
      ) : (
        <>
          {/* Mobile: horizontal scroll */}
          <div className="relative sm:hidden">
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#faf7f0] to-transparent z-10 pointer-events-none" />
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {products.map((p) => (
                <div key={p.id} className="flex-shrink-0 w-44">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
          {/* Desktop: responsive grid */}
          <div className="hidden sm:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

