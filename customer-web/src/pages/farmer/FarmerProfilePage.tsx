import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Star, MapPin, Package, MessageSquare, Calendar, Wheat, ChevronLeft, ChevronRight } from 'lucide-react'
import { farmerService } from '@/services/farmer.service'
import { productService } from '@/services/product.service'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/authStore'
import type { Review } from '@/types'

type Tab = 'products' | 'reviews'

export default function FarmerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { language } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('products')
  const [reviewPage, setReviewPage] = useState(1)

  const { data: farmer, isLoading } = useQuery({
    queryKey: ['farmer', id],
    queryFn: () => farmerService.getPublicProfile(id!),
    enabled: !!id,
  })

  const { data: products } = useQuery({
    queryKey: ['farmerProducts', id],
    queryFn: () => productService.getFarmerProducts(id!),
    enabled: !!id,
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['farmerReviews', id, reviewPage],
    queryFn: () => farmerService.getReviews(id!, reviewPage),
    enabled: !!id && activeTab === 'reviews',
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center py-20"><Spinner /></div>
      </div>
    )
  }

  if (!farmer) return null

  const productList = products?.items ?? products?.results ?? []
  const reviews: Review[] = reviewsData?.items ?? reviewsData?.results ?? []
  const reviewPages = reviewsData?.pages ?? 1
  const totalReviews = reviewsData?.total ?? 0

  const memberSince = farmer.member_since
    ? new Date(farmer.member_since).getFullYear()
    : null

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* ── Farmer profile card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          {/* Green header strip */}
          <div className="h-16 bg-gradient-to-r from-teal-700 to-teal-500" />

          <div className="px-5 pb-5">
            {/* Avatar — overlaps the green strip */}
            <div className="-mt-8 mb-3">
              <div className="w-16 h-16 rounded-full bg-primary-100 border-4 border-white flex items-center justify-center text-primary-700 font-bold text-2xl shadow-sm overflow-hidden">
                {farmer.profile_photo ? (
                  <img src={farmer.profile_photo} alt={farmer.full_name} className="w-full h-full object-cover" />
                ) : (
                  farmer.full_name[0]
                )}
              </div>
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-0.5">{farmer.full_name}</h1>

            <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{[farmer.village, farmer.taluka, farmer.district].filter(Boolean).join(', ')}</span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <StatBox
                icon={<Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
                value={farmer.rating.toFixed(1)}
                label={`${farmer.total_ratings} ratings`}
              />
              <StatBox
                icon={<Package className="h-4 w-4 text-teal-600" />}
                value={String(farmer.total_orders_fulfilled)}
                label="Orders"
              />
              <StatBox
                icon={<Wheat className="h-4 w-4 text-amber-500" />}
                value={String(farmer.farm_size_acres)}
                label="Acres"
              />
              {memberSince && (
                <StatBox
                  icon={<Calendar className="h-4 w-4 text-blue-500" />}
                  value={String(memberSince)}
                  label="Member since"
                />
              )}
            </div>

            {/* Bio */}
            {farmer.bio && (
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{farmer.bio}</p>
            )}

            {/* Farm description */}
            {farmer.farm_description && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">About the Farm</p>
                <p className="text-sm text-gray-700 leading-relaxed">{farmer.farm_description}</p>
              </div>
            )}

            {/* Produce types */}
            {(farmer.produce_types ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {farmer.produce_types.map((type) => (
                  <span key={type} className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-medium">
                    {type}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <TabButton
            active={activeTab === 'products'}
            onClick={() => setActiveTab('products')}
            icon={<Package className="h-4 w-4" />}
            label={`Products${productList.length > 0 ? ` (${productList.length})` : ''}`}
          />
          <TabButton
            active={activeTab === 'reviews'}
            onClick={() => setActiveTab('reviews')}
            icon={<MessageSquare className="h-4 w-4" />}
            label="Reviews"
          />
        </div>

        {/* ── Products tab ── */}
        {activeTab === 'products' && (
          productList.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No products listed yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {productList.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )
        )}

        {/* ── Reviews tab ── */}
        {activeTab === 'reviews' && (
          <div>
            {/* Summary */}
            {totalReviews > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3 flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{farmer.rating.toFixed(1)}</p>
                  <div className="flex justify-center gap-0.5 my-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(farmer.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{totalReviews} reviews</p>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
                <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <FarmerReviewCard key={review.id} review={review} language={language} />
                ))}

                {reviewPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                      disabled={reviewPage === 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-600">{reviewPage} / {reviewPages}</span>
                    <button
                      onClick={() => setReviewPage((p) => Math.min(reviewPages, p + 1))}
                      disabled={reviewPage === reviewPages}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

// ── Small helper components ───────────────────────────────────────────────────

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">{icon}
        <span className="font-bold text-gray-900 text-sm">{value}</span>
      </div>
      <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
        active
          ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50'
          : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function FarmerReviewCard({ review, language }: { review: Review; language: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
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
              {new Date(review.created_at).toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN')}
            </time>
          </div>

          <div className="flex gap-0.5 mb-2">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
            ))}
          </div>

          {review.comment && (
            <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
          )}

          {/* Link to the reviewed product */}
          {review.product && (
            <Link
              to={`/product/${review.product}`}
              className="mt-1.5 inline-block text-[11px] text-teal-600 hover:underline"
            >
              View product →
            </Link>
          )}

          {review.photos && review.photos.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
              {review.photos.map((photo, i) => (
                <img key={i} src={photo} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
