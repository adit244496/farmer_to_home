import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, AlertCircle, Plus, X, Pencil, Trash2, Check,
  UserCog, ChevronLeft, ChevronRight, Search,
} from 'lucide-react'
import api from '@/lib/api'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FarmerListing {
  id: string
  farmer_id: string
  farmer_name: string
  product_id: string
  product_name_en: string
  product_name_mr: string
  category_slug: string
  category_name: string
  primary_image: string | null
  stock: number
  price_override: number | null
  base_price: number
  unit: string
  status: string
  created_at: string
  updated_at: string
}

interface PaginatedListings {
  items: FarmerListing[]
  total: number
  page: number
  page_size: number
}

interface ApprovedFarmer {
  id: string
  name: string
}

interface AdminProduct {
  id: string
  name_en: string
  name_mr: string
  category_id: string
  category_slug: string
  category_name: string
  price: number
  unit: string
}

interface AdminCategory {
  id: string
  name_en: string
  slug: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23f3f4f6"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'

const PAGE_SIZE = 20

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-500',
    OUT_OF_STOCK: 'bg-red-100 text-red-600',
  }
  return (
    <span className={clsx('inline-block px-2 py-0.5 rounded text-xs font-semibold', map[status] ?? 'bg-gray-100 text-gray-500')}>
      {status === 'OUT_OF_STOCK' ? 'Out of Stock' : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

// ─── AddMappingModal ──────────────────────────────────────────────────────────

function AddMappingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [farmerId, setFarmerId] = useState('')
  const [categorySlug, setCategorySlug] = useState('')
  const [productId, setProductId] = useState('')
  const [stock, setStock] = useState('0')
  const [priceOverride, setPriceOverride] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: farmers } = useQuery<ApprovedFarmer[]>({
    queryKey: ['admin-approved-farmers'],
    queryFn: async () => (await api.get('/admin/farmers/approved')).data,
  })

  const { data: categories } = useQuery<AdminCategory[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => (await api.get('/admin/categories')).data,
  })

  const { data: products } = useQuery<AdminProduct[]>({
    queryKey: ['admin-products-by-category', categorySlug],
    queryFn: async () => {
      const params: Record<string, string | number> = { page_size: 200 }
      if (categorySlug) params.category = categorySlug
      const res = await api.get('/admin/products/all', { params })
      return res.data.items ?? []
    },
  })

  const selectedProduct = products?.find((p) => p.id === productId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!farmerId) { setError('Select a farmer.'); return }
    if (!productId) { setError('Select a product.'); return }
    const stockVal = parseInt(stock)
    if (isNaN(stockVal) || stockVal < 0) { setError('Enter a valid stock quantity.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/admin/farmer-products', {
        farmer_id: farmerId,
        product_id: productId,
        stock: stockVal,
        price_override: priceOverride ? parseFloat(priceOverride) : null,
      })
      onCreated()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Failed to create mapping.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-gray-900">Add Farmer–Product Mapping</h2>
            <p className="text-xs text-gray-400 mt-0.5">Assign a farmer to sell a product with their own stock</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Farmer *</label>
            <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 bg-white">
              <option value="">Select a farmer…</option>
              {farmers?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Category (filter)</label>
            <select value={categorySlug} onChange={(e) => { setCategorySlug(e.target.value); setProductId('') }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 bg-white">
              <option value="">All categories</option>
              {categories?.map((c) => <option key={c.slug} value={c.slug}>{c.name_en}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Product *</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 bg-white">
              <option value="">Select a product…</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>{p.name_en} {p.category_name ? `(${p.category_name})` : ''}</option>
              ))}
            </select>
            {selectedProduct && (
              <p className="text-xs text-gray-500 mt-1">
                Base price: <strong>₹{selectedProduct.price}/{selectedProduct.unit}</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Stock *</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
                {selectedProduct && <span className="text-xs text-gray-400 flex-shrink-0">{selectedProduct.unit}</span>}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">
                Price Override (₹)
                <span className="font-normal text-gray-400 ml-1">optional</span>
              </label>
              <input type="number" min="0" step="0.01" value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)}
                placeholder={selectedProduct ? String(selectedProduct.price) : '—'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Creating…' : 'Add Mapping'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── EditMappingModal ─────────────────────────────────────────────────────────

function EditMappingModal({
  listing,
  onClose,
  onSaved,
}: {
  listing: FarmerListing
  onClose: () => void
  onSaved: () => void
}) {
  const [stock, setStock] = useState(String(listing.stock))
  const [priceOverride, setPriceOverride] = useState(listing.price_override != null ? String(listing.price_override) : '')
  const [status, setStatus] = useState(listing.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const stockVal = parseInt(stock)
    if (isNaN(stockVal) || stockVal < 0) { setError('Enter a valid stock quantity.'); return }
    setSaving(true); setError('')
    try {
      await api.patch(`/admin/farmer-products/${listing.id}`, {
        stock: stockVal,
        price_override: priceOverride ? parseFloat(priceOverride) : null,
        status,
      })
      onSaved()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Failed to update.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-gray-900">Edit Listing</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {listing.farmer_name} · {listing.product_name_en}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Stock *</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
                <span className="text-xs text-gray-400 flex-shrink-0">{listing.unit}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">
                Price Override (₹)
                <span className="font-normal text-gray-400 ml-1">optional</span>
              </label>
              <input type="number" min="0" step="0.01" value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                placeholder={String(listing.base_price)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Status</label>
            <div className="flex gap-2">
              {['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={clsx(
                    'flex-1 py-2 text-xs font-medium rounded-lg border transition-colors',
                    status === s
                      ? s === 'ACTIVE' ? 'bg-green-600 text-white border-green-600'
                        : s === 'INACTIVE' ? 'bg-gray-600 text-white border-gray-600'
                        : 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400',
                  )}
                >
                  {s === 'OUT_OF_STOCK' ? 'Out of Stock' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Base price: <strong>₹{listing.base_price}/{listing.unit}</strong>
            {listing.price_override != null && (
              <> · Current override: <strong>₹{listing.price_override}</strong></>
            )}
          </p>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FarmerProductsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [farmerFilter, setFarmerFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editListing, setEditListing] = useState<FarmerListing | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['farmer-products'] })

  const { data: farmers } = useQuery<ApprovedFarmer[]>({
    queryKey: ['admin-approved-farmers'],
    queryFn: async () => (await api.get('/admin/farmers/approved')).data,
  })

  const { data: allProducts } = useQuery<AdminProduct[]>({
    queryKey: ['admin-all-products-flat'],
    queryFn: async () => {
      const res = await api.get('/admin/products/all', { params: { page_size: 500 } })
      return res.data.items ?? []
    },
  })

  const { data, isLoading, isError } = useQuery<PaginatedListings>({
    queryKey: ['farmer-products', page, farmerFilter, productFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE }
      if (farmerFilter) params.farmer_id = farmerFilter
      if (productFilter) params.product_id = productFilter
      const res = await api.get('/admin/farmer-products', { params })
      return res.data
    },
  })

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this farmer–product mapping?')) return
    setDeletingId(id)
    try {
      await api.delete(`/admin/farmer-products/${id}`)
      invalidate()
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  const filteredItems = data?.items.filter((l) => {
    if (!searchInput.trim()) return true
    const q = searchInput.toLowerCase()
    return l.product_name_en.toLowerCase().includes(q) || l.farmer_name.toLowerCase().includes(q)
  }) ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {/* Farmer filter */}
          <select
            value={farmerFilter}
            onChange={(e) => { setFarmerFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 bg-white"
          >
            <option value="">All Farmers</option>
            {farmers?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>

          {/* Product filter */}
          <select
            value={productFilter}
            onChange={(e) => { setProductFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 bg-white"
          >
            <option value="">All Products</option>
            {allProducts?.map((p) => (
              <option key={p.id} value={p.id}>{p.name_en}</option>
            ))}
          </select>

          {/* Local search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 w-44"
            />
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-farm-green-700 hover:bg-farm-green-800 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Mapping
        </button>
      </div>

      {data && (
        <p className="text-xs text-gray-500">
          {data.total} mapping{data.total !== 1 ? 's' : ''}
          {farmerFilter ? ` · ${farmers?.find((f) => f.id === farmerFilter)?.name ?? ''}` : ''}
          {productFilter ? ` · ${allProducts?.find((p) => p.id === productFilter)?.name_en ?? productFilter}` : ''}
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-farm-green-600" /></div>
      ) : isError ? (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">Failed to load farmer products.</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <UserCog className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No mappings found.</p>
          <button onClick={() => setShowAddModal(true)} className="mt-2 text-sm text-farm-green-700 hover:text-farm-green-900 font-medium">
            + Add first mapping
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Farmer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={l.primary_image ?? PLACEHOLDER}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{l.product_name_en}</p>
                          <p className="text-xs text-gray-400 truncate">{l.product_name_mr}</p>
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-farm-green-50 text-farm-green-700 text-xs rounded font-medium capitalize">
                            {l.category_name || l.category_slug}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{l.farmer_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'font-semibold text-sm',
                        l.stock === 0 ? 'text-red-600' : l.stock < 10 ? 'text-amber-600' : 'text-gray-900',
                      )}>
                        {l.stock}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{l.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      {l.price_override != null ? (
                        <div>
                          <span className="font-semibold text-gray-900">₹{l.price_override}</span>
                          <span className="text-xs text-gray-400 line-through ml-1">₹{l.base_price}</span>
                          <span className="text-xs text-gray-400">/{l.unit}</span>
                        </div>
                      ) : (
                        <span className="text-gray-700">₹{l.base_price}/{l.unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => setEditListing(l)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          disabled={deletingId === l.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove"
                        >
                          {deletingId === l.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {page} of {totalPages} · {data?.total ?? 0} total</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddMappingModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); invalidate() }}
        />
      )}
      {editListing && (
        <EditMappingModal
          listing={editListing}
          onClose={() => setEditListing(null)}
          onSaved={() => { setEditListing(null); invalidate() }}
        />
      )}
    </div>
  )
}

