import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Star, MapPin, Package } from 'lucide-react'
import { farmerService } from '@/services/farmer.service'
import { productService } from '@/services/product.service'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Spinner'

export default function FarmerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: farmer, isLoading } = useQuery({
    queryKey: ['farmer', id],
    queryFn: () => farmerService.getPublicProfile(id!),
    enabled: !!id,
  })

  const { data: products } = useQuery({
    queryKey: ['farmerProducts', id],
    queryFn: () => productService.getFarmerProducts(Number(id)),
    enabled: !!id,
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Farmer card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl">
              {farmer.full_name[0]}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{farmer.full_name}</h1>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {farmer.village}, {farmer.district}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-gray-900">{farmer.rating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{farmer.total_ratings} ratings</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-bold text-gray-900">{farmer.total_orders_fulfilled}</p>
              <p className="text-xs text-gray-500 mt-0.5">Orders</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-bold text-gray-900">{farmer.farm_size_acres}</p>
              <p className="text-xs text-gray-500 mt-0.5">acres</p>
            </div>
          </div>

          {farmer.bio && (
            <p className="text-sm text-gray-600 mt-4">{farmer.bio}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {(farmer.produce_types ?? []).map((type) => (
              <span key={type} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Products */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" /> Products by {farmer.full_name}
          </h2>
          {(products?.results ?? []).length === 0 ? (
            <p className="text-center text-gray-400 py-8">No products listed</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(products?.results ?? []).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
