import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, ArrowLeft, SlidersHorizontal, Leaf } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { productService } from '@/services/product.service'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Spinner'

export default function SearchPage() {
  const { t } = useTranslation('home')
  const { t: tp } = useTranslation('product')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const [organicOnly, setOrganicOnly] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', query, organicOnly, page],
    queryFn: () =>
      productService.searchProducts({
        search: query || undefined,
        is_organic: organicOnly || undefined,
        page,
        page_size: 20,
      }),
    enabled: true,
  })

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setQuery(q)
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearchParams(query ? { q: query } : {})
  }

  const products = data?.items ?? []
  const totalCount = data?.total ?? 0
  const hasMore = false

  return (
    <div className="h-dvh flex flex-col bg-gray-50 pb-20 sm:pb-0">
      {/* Sticky search header — replaces the global Header on this page */}
      <header className="flex-shrink-0 sticky top-0 z-50 bg-[#ede8e0] border-b border-[#d4c9bb]">
        <div className="h-[2px] w-full bg-gradient-to-r from-[#d4a84c] via-[#e8c47a] to-[#d4a84c]" />
        <form onSubmit={handleSearch} className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)}
            className="p-2 text-[#0d7a7a] hover:bg-[#0d7a7a]/8 rounded-full transition-colors flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0d7a7a]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 rounded-full border border-[#0d7a7a]/15 bg-white/70 text-sm outline-none focus:bg-white focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15 transition-all"
              autoFocus
            />
          </div>
        </form>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="px-4 sm:px-6 lg:px-10 py-4">

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => { setOrganicOnly(!organicOnly); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              organicOnly
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
            }`}
          >
            <Leaf className="h-3.5 w-3.5" />
            {t('organicOnly')}
          </button>

          {totalCount > 0 && (
            <span className="text-xs text-gray-400 ml-auto">{totalCount} products</span>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <SlidersHorizontal className="h-12 w-12 mb-3" />
            <p className="font-medium">{t('noProductsFound')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isFetching}
                  className="px-6 py-2.5 border border-primary-600 text-primary-700 rounded-xl text-sm font-medium hover:bg-primary-50 transition-colors disabled:opacity-50"
                >
                  {isFetching ? <Spinner className="h-4 w-4" /> : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </div>{/* end scroll wrapper */}

      <BottomNav />
    </div>
  )
}
