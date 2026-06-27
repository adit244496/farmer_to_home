import { Heart } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlistStore'
import { ProductCard } from '@/components/product/ProductCard'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'

export default function WishlistPage() {
  const { products, clear } = useWishlistStore()

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <h1 className="text-lg font-bold text-gray-900">Wishlist</h1>
            {products.length > 0 && (
              <span className="text-xs bg-red-50 text-red-500 font-semibold px-2 py-0.5 rounded-full">
                {products.length}
              </span>
            )}
          </div>
          {products.length > 0 && (
            <button
              onClick={clear}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
            <Heart className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">Your wishlist is empty</p>
            <p className="text-xs text-gray-300 mt-1">Tap the ♡ on any product to save it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
