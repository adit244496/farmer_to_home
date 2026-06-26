import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Package, AlertCircle, ChevronLeft, ChevronRight, Leaf } from 'lucide-react'
import api from '@/lib/api'
import type { Product, PaginatedResponse } from '@/types'
import clsx from 'clsx'

const PAGE_SIZE = 10

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const fetchProducts = async (p = page) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<PaginatedResponse<Product>>('/farmers/me/products/', {
        params: { page: p, page_size: PAGE_SIZE },
      })
      setProducts(res.data.items ?? [])
      setTotal(res.data.total ?? 0)
    } catch {
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts(page) }, [page])

  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id)
    try {
      const fd = new FormData()
      fd.append('is_active', String(!product.is_active))
      await api.patch(`/farmers/me/products/${product.id}/`, fd)
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_active: !p.is_active } : p))
    } catch {
      // ignore
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (deleteId === null) return
    try {
      await api.delete(`/farmers/me/products/${deleteId}/`)
      setDeleteId(null)
      fetchProducts(page)
    } catch {
      setError('Failed to delete product')
      setDeleteId(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} products listed</p>
        </div>
        <Link
          to="/products/add"
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Product
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No products yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first product to get started</p>
            <Link
              to="/products/add"
              className="inline-flex items-center gap-2 mt-4 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Add Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Price</th>
                  <th className="text-left px-4 py-3 font-medium">Stock</th>
                  <th className="text-left px-4 py-3 font-medium">Organic</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((product) => {
                  const primaryImage = product.images?.find((i) => i.is_primary) ?? product.images?.[0]
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {primaryImage ? (
                            <img
                              src={primaryImage.image_url}
                              alt={product.name_en}
                              className="h-10 w-10 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{product.name_en}</p>
                            <p className="text-gray-400 text-xs">{product.name_mr}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{product.category}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        ₹{product.price_per_unit}/{product.unit}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{product.stock_quantity}</td>
                      <td className="px-4 py-3">
                        {product.is_organic ? (
                          <span className="flex items-center gap-1 text-green-700 text-xs font-medium">
                            <Leaf className="h-3.5 w-3.5" /> Organic
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        )}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/products/${product.id}/edit`}
                            state={{ product }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleToggleActive(product)}
                            disabled={togglingId === product.id}
                            className={clsx(
                              'p-1.5 rounded-lg transition-colors',
                              product.is_active
                                ? 'text-gray-500 hover:bg-gray-50'
                                : 'text-green-600 hover:bg-green-50'
                            )}
                            title={product.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {product.is_active
                              ? <ToggleRight className="h-4 w-4" />
                              : <ToggleLeft className="h-4 w-4" />
                            }
                          </button>
                          <button
                            onClick={() => setDeleteId(product.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete Product?</h3>
            <p className="text-gray-500 text-sm mb-5">
              This action cannot be undone. The product will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
