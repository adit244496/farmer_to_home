import React, { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Loader2, AlertCircle, Search, Tag, X,
  Leaf, Package, Plus, Trash2, Percent, Calendar, ImagePlus, ImageOff,
  ToggleLeft, ToggleRight, Star, Upload, Link, Pencil, Check,
  ChevronDown, ChevronUp, Sparkles, ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react'
import api from '@/lib/api'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductImage {
  id: string
  url: string
  is_primary: boolean
  display_order: number
}

interface ProductDiscountInfo {
  id: string
  discount_percent: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
}

interface AdminProduct {
  id: string
  name_en: string
  name_mr: string
  description_en: string
  description_mr: string
  price: number
  unit: string
  min_order_qty: number
  stock: number
  status: string
  is_organic: boolean
  harvest_date: string | null
  best_before_date: string | null
  tags: string[]
  benefits: string[]
  category_id: string
  category_slug: string
  category_name: string
  farmer_id?: string | null
  farmer_name?: string
  images: ProductImage[]
  discount: ProductDiscountInfo | null
  created_at: string
  updated_at: string
}

interface PaginatedProducts {
  items: AdminProduct[]
  total: number
  page: number
  page_size: number
}

interface AdminCategory {
  id: string
  name_en: string
  name_mr: string
  slug: string
  icon_url: string | null
  is_active: boolean
  display_order: number
  product_count: number
}

type AdminCategoryOption = Pick<AdminCategory, 'id' | 'name_en' | 'name_mr' | 'slug' | 'product_count'>

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'
interface FileQueueItem {
  id: string
  file: File
  preview: string
  status: FileStatus
  error?: string
}

// ─── Constants & helpers ──────────────────────────────────────────────────────

const UNITS = ['kg', 'piece', 'dozen', 'liter', 'bundle', 'gram', 'quintal'] as const

const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23f3f4f6"%3E%3Crect width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'


function discountedPrice(price: number, percent: number) {
  return price - (price * percent) / 100
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-500',
    OUT_OF_STOCK: 'bg-red-100 text-red-600',
  }
  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    OUT_OF_STOCK: 'Out of Stock',
  }
  return (
    <span className={clsx('inline-block px-2 py-0.5 rounded text-xs font-semibold', map[status] ?? 'bg-gray-100 text-gray-500')}>
      {labels[status] ?? status}
    </span>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({ product, onSelect }: { product: AdminProduct; onSelect: () => void }) {
  const primary = product.images.find((i) => i.is_primary) ?? product.images[0]
  const hasDiscount = !!product.discount

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onSelect}
    >
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        <img
          src={primary?.url ?? PLACEHOLDER}
          alt={product.name_en}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_organic && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-600/90 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
              <Leaf className="h-3 w-3" /> Organic
            </span>
          )}
          {hasDiscount && (
            <span className="px-2 py-0.5 bg-red-500/90 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
              {product.discount!.discount_percent}% off
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <StatusBadge status={product.status} />
        </div>
        {product.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            +{product.images.length - 1} more
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{product.name_en}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{product.name_mr}</p>
        </div>
        {product.farmer_name && <p className="text-xs text-gray-500 truncate">by {product.farmer_name}</p>}
        <div className="flex items-center gap-1.5">
          <span className="inline-block px-2 py-0.5 bg-farm-green-50 text-farm-green-700 rounded text-xs font-medium capitalize">
            {product.category_name || product.category_slug}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          {hasDiscount ? (
            <>
              <span className="text-base font-bold text-red-600">
                ₹{discountedPrice(product.price, product.discount!.discount_percent).toFixed(2)}
              </span>
              <span className="text-xs text-gray-400 line-through">₹{product.price}</span>
            </>
          ) : (
            <span className="text-base font-bold text-gray-900">₹{product.price}/{product.unit}</span>
          )}
          {hasDiscount && <span className="text-xs text-gray-500">/{product.unit}</span>}
        </div>
        {product.benefits && product.benefits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.benefits.slice(0, 2).map((b) => (
              <span
                key={b}
                className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-full font-medium"
              >
                <Sparkles className="h-2.5 w-2.5 flex-shrink-0" />
                {b}
              </span>
            ))}
            {product.benefits.length > 2 && (
              <span className="text-xs text-amber-600 font-medium">+{product.benefits.length - 2}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className={clsx('text-xs font-medium', product.stock < 10 ? 'text-red-600' : 'text-gray-600')}>
            {product.stock} {product.unit} in stock
          </span>
          <span className="text-xs text-gray-400">
            {product.images.length} image{product.images.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── ProductDetailModal ────────────────────────────────────────────────────────

function ProductDetailModal({
  product, onClose, onRefresh, setSelected,
}: {
  product: AdminProduct
  onClose: () => void
  onRefresh: () => void
  setSelected: (p: AdminProduct) => void
}) {
  // ── Image state ──
  const [activeImg, setActiveImg] = useState(0)
  const [uploadTab, setUploadTab] = useState<'file' | 'url'>('file')
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Edit state ──
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name_en: product.name_en,
    name_mr: product.name_mr,
    description_en: product.description_en,
    description_mr: product.description_mr,
    price: String(product.price),
    unit: product.unit,
    min_order_qty: String(product.min_order_qty),
    is_organic: product.is_organic,
    harvest_date: product.harvest_date?.slice(0, 10) ?? '',
    best_before_date: product.best_before_date?.slice(0, 10) ?? '',
    category_id: product.category_id,
  })
  const [editTags, setEditTags] = useState<string[]>(product.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [editBenefits, setEditBenefits] = useState<string[]>(product.benefits ?? [])
  const [benefitInput, setBenefitInput] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // ── Discount state ──
  const [discountPercent, setDiscountPercent] = useState(
    product.discount ? String(product.discount.discount_percent) : ''
  )
  const [validFrom, setValidFrom] = useState(
    product.discount?.valid_from ? product.discount.valid_from.slice(0, 10) : ''
  )
  const [validUntil, setValidUntil] = useState(
    product.discount?.valid_until ? product.discount.valid_until.slice(0, 10) : ''
  )
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountMsg, setDiscountMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Stock/status state ──
  const [statusLoading, setStatusLoading] = useState(false)
  const [stockInput, setStockInput] = useState(String(product.stock))
  const [stockLoading, setStockLoading] = useState(false)
  const [stockMsg, setStockMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Categories for edit dropdown (fetched lazily when editing opens)
  const { data: categories } = useQuery<AdminCategoryOption[]>({
    queryKey: ['admin-categories-list'],
    queryFn: async () => {
      const res = await api.get('/admin/categories')
      return res.data
    },
    enabled: editing,
  })

  const images = product.images.length > 0 ? product.images : []
  const currentImg = images[activeImg]

  // ── File upload handlers ──

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    const items: FileQueueItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}-${file.name}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
    }))
    setFileQueue((prev) => [...prev, ...items])
    setUploadError('')
    // Reset file input so the same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeQueued = (id: string) => {
    setFileQueue((prev) => {
      const item = prev.find((f) => f.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((f) => f.id !== id)
    })
  }

  const handleUploadFiles = async () => {
    const pending = fileQueue.filter((f) => f.status === 'pending')
    if (!pending.length) return
    setUploading(true)
    setUploadError('')

    for (const item of pending) {
      setFileQueue((prev) =>
        prev.map((f) => f.id === item.id ? { ...f, status: 'uploading' } : f)
      )
      try {
        // Step 1: get presigned PUT URL from backend
        const { data: { upload_url, file_url } } = await api.post('/admin/upload/presign', {
          filename: item.file.name,
          content_type: item.file.type || 'image/jpeg',
        })

        // Step 2: PUT directly to S3 — use plain fetch, NOT axios (no Authorization header)
        const s3Res = await fetch(upload_url, {
          method: 'PUT',
          body: item.file,
          headers: { 'Content-Type': item.file.type || 'image/jpeg' },
        })
        if (!s3Res.ok) throw new Error(`S3 upload failed (${s3Res.status})`)

        // Step 3: register the S3 URL with the product
        await api.post(`/admin/products/${product.id}/images`, { url: file_url })

        setFileQueue((prev) =>
          prev.map((f) => f.id === item.id ? { ...f, status: 'done' } : f)
        )
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (err as { message?: string })?.message ??
          'Upload failed'
        setFileQueue((prev) =>
          prev.map((f) => f.id === item.id ? { ...f, status: 'error', error: msg } : f)
        )
      }
    }

    setUploading(false)
    onRefresh()
  }

  const clearDoneFromQueue = () => {
    setFileQueue((prev) => {
      prev.filter((f) => f.status === 'done').forEach((f) => URL.revokeObjectURL(f.preview))
      return prev.filter((f) => f.status !== 'done')
    })
  }

  const handleAddImageUrl = async () => {
    const url = newImageUrl.trim()
    if (!url) return
    setUrlLoading(true)
    setUrlError('')
    try {
      await api.post(`/admin/products/${product.id}/images`, { url })
      setNewImageUrl('')
      onRefresh()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setUrlError(e?.response?.data?.detail ?? 'Failed to add image')
    } finally {
      setUrlLoading(false)
    }
  }

  const handleRemoveImage = async (imageId: string) => {
    try {
      await api.delete(`/admin/products/${product.id}/images/${imageId}`)
      setActiveImg(0)
      onRefresh()
    } catch {
      // silent
    }
  }

  // ── Edit product handlers ──

  const field = (key: keyof typeof editForm, value: string | boolean) =>
    setEditForm((prev) => ({ ...prev, [key]: value }))

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !editTags.includes(t)) setEditTags((prev) => [...prev, t])
    setTagInput('')
  }

  const handleAddBenefit = () => {
    const b = benefitInput.trim()
    if (b && !editBenefits.includes(b)) setEditBenefits((prev) => [...prev, b])
    setBenefitInput('')
  }

  const handleSaveEdit = async () => {
    if (!editForm.name_en.trim()) {
      setEditError('Product name (English) is required.')
      return
    }
    const price = parseFloat(editForm.price)
    if (isNaN(price) || price <= 0) {
      setEditError('Enter a valid price.')
      return
    }
    setEditSaving(true)
    setEditError('')
    try {
      const res = await api.patch(`/admin/products/${product.id}`, {
        name_en: editForm.name_en.trim(),
        name_mr: editForm.name_mr.trim(),
        description_en: editForm.description_en,
        description_mr: editForm.description_mr,
        price,
        unit: editForm.unit,
        min_order_qty: parseInt(editForm.min_order_qty) || 1,
        is_organic: editForm.is_organic,
        harvest_date: editForm.harvest_date || null,
        best_before_date: editForm.best_before_date || null,
        tags: editTags,
        benefits: editBenefits,
        category_id: editForm.category_id,
      })
      setEditing(false)
      setSelected(res.data)
      onRefresh()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setEditError(e?.response?.data?.detail ?? 'Failed to save changes.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditForm({
      name_en: product.name_en,
      name_mr: product.name_mr,
      description_en: product.description_en,
      description_mr: product.description_mr,
      price: String(product.price),
      unit: product.unit,
      min_order_qty: String(product.min_order_qty),
      is_organic: product.is_organic,
      harvest_date: product.harvest_date?.slice(0, 10) ?? '',
      best_before_date: product.best_before_date?.slice(0, 10) ?? '',
      category_id: product.category_id,
    })
    setEditTags(product.tags ?? [])
    setEditBenefits(product.benefits ?? [])
    setEditError('')
    setEditing(false)
  }

  // ── Discount handlers ──

  const handleSetDiscount = async () => {
    const pct = parseFloat(discountPercent)
    if (!discountPercent || isNaN(pct) || pct <= 0 || pct > 100) {
      setDiscountMsg({ type: 'error', text: 'Enter a valid percentage (1–100).' })
      return
    }
    setDiscountLoading(true)
    setDiscountMsg(null)
    try {
      await api.post(`/admin/products/${product.id}/discount`, {
        discount_percent: pct,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
      })
      setDiscountMsg({ type: 'success', text: 'Discount saved successfully.' })
      onRefresh()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setDiscountMsg({ type: 'error', text: e?.response?.data?.detail ?? 'Failed to save discount.' })
    } finally {
      setDiscountLoading(false)
    }
  }

  const handleRemoveDiscount = async () => {
    setDiscountLoading(true)
    setDiscountMsg(null)
    try {
      await api.delete(`/admin/products/${product.id}/discount`)
      setDiscountPercent('')
      setValidFrom('')
      setValidUntil('')
      setDiscountMsg({ type: 'success', text: 'Discount removed.' })
      onRefresh()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setDiscountMsg({ type: 'error', text: e?.response?.data?.detail ?? 'Failed to remove discount.' })
    } finally {
      setDiscountLoading(false)
    }
  }

  // ── Stock/status handlers ──

  const handleUpdateStock = async () => {
    const val = parseInt(stockInput)
    if (isNaN(val) || val < 0) {
      setStockMsg({ type: 'error', text: 'Enter a valid non-negative number.' })
      return
    }
    setStockLoading(true)
    setStockMsg(null)
    try {
      const res = await api.patch(`/admin/products/${product.id}/stock`, { stock: val })
      setStockMsg({
        type: 'success',
        text: val === 0 ? 'Stock set to 0 — product marked Out of Stock.' : `Stock updated to ${val}.`,
      })
      onRefresh()
      if (res.data) setSelected(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setStockMsg({ type: 'error', text: e?.response?.data?.detail ?? 'Failed to update stock.' })
    } finally {
      setStockLoading(false)
    }
  }

  const handleToggleStatus = async () => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setStatusLoading(true)
    try {
      await api.patch(`/admin/products/${product.id}/status`, { status: newStatus })
      onRefresh()
    } catch {
      // silent
    } finally {
      setStatusLoading(false)
    }
  }

  const pendingFiles = fileQueue.filter((f) => f.status === 'pending')
  const doneFiles = fileQueue.filter((f) => f.status === 'done')

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative bg-white h-full w-full max-w-2xl overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-base">{product.name_en}</h2>
            <p className="text-xs text-gray-400">{product.name_mr}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Image Gallery ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ImagePlus className="h-4 w-4" /> Images
            </h3>

            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-gray-100 h-56">
                  <img
                    src={currentImg?.url ?? PLACEHOLDER}
                    alt="product"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
                  />
                  {currentImg?.is_primary && (
                    <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="h-3 w-3" /> Primary
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveImage(currentImg.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors"
                    title="Remove this image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImg(idx)}
                      className={clsx(
                        'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                        idx === activeImg
                          ? 'border-farm-green-500'
                          : 'border-transparent opacity-70 hover:opacity-100',
                      )}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                <ImageOff className="h-8 w-8 mb-1" />
                <p className="text-xs">No images yet</p>
              </div>
            )}

            {/* Upload tabs */}
            <div className="mt-4">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-3">
                <button
                  onClick={() => setUploadTab('file')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    uploadTab === 'file'
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload File
                </button>
                <button
                  onClick={() => setUploadTab('url')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    uploadTab === 'url'
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Link className="h-3.5 w-3.5" /> From URL
                </button>
              </div>

              {uploadTab === 'file' ? (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 hover:border-farm-green-400 bg-gray-50 hover:bg-farm-green-50 text-gray-600 hover:text-farm-green-700 text-sm font-medium rounded-xl w-full justify-center transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Choose images (multiple allowed)
                  </button>

                  {fileQueue.length > 0 && (
                    <div className="space-y-2">
                      {fileQueue.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                          <img
                            src={item.preview}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{item.file.name}</p>
                            <p className="text-xs text-gray-400">{(item.file.size / 1024).toFixed(0)} KB</p>
                            {item.status === 'error' && (
                              <p className="text-xs text-red-600 mt-0.5">{item.error}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {item.status === 'pending' && (
                              <button
                                onClick={() => removeQueued(item.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                            {item.status === 'uploading' && (
                              <Loader2 className="h-4 w-4 animate-spin text-farm-green-600" />
                            )}
                            {item.status === 'done' && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                            {item.status === 'error' && (
                              <span className="text-red-500 font-bold text-sm">✕</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

                      <div className="flex gap-2">
                        {pendingFiles.length > 0 && (
                          <button
                            onClick={handleUploadFiles}
                            disabled={uploading}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            {uploading
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Upload className="h-4 w-4" />}
                            Upload {pendingFiles.length} image{pendingFiles.length !== 1 ? 's' : ''}
                          </button>
                        )}
                        {doneFiles.length > 0 && (
                          <button
                            onClick={clearDoneFromQueue}
                            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg transition-colors"
                          >
                            Clear done
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddImageUrl()}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                    />
                    <button
                      onClick={handleAddImageUrl}
                      disabled={urlLoading || !newImageUrl.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {urlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add
                    </button>
                  </div>
                  {urlError && <p className="text-xs text-red-600">{urlError}</p>}
                </div>
              )}
            </div>
          </section>

          {/* ── Product Details (editable) ── */}
          <section className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Package className="h-4 w-4" /> Product Details
              </h3>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-farm-green-700 bg-farm-green-50 hover:bg-farm-green-100 rounded-lg transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {editSaving
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Check className="h-3.5 w-3.5" />}
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                {editError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" /> {editError}
                  </div>
                )}

                {/* Names */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name (English) *</label>
                    <input
                      value={editForm.name_en}
                      onChange={(e) => field('name_en', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name (Marathi)</label>
                    <input
                      value={editForm.name_mr}
                      onChange={(e) => field('name_mr', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                    />
                  </div>
                </div>

                {/* Price, Unit, Min Order */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => field('price', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Unit *</label>
                    <select
                      value={editForm.unit}
                      onChange={(e) => field('unit', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 bg-white"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min Order</label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.min_order_qty}
                      onChange={(e) => field('min_order_qty', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                    />
                  </div>
                </div>

                {/* Category + Organic */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Category</label>
                    <select
                      value={editForm.category_id}
                      onChange={(e) => field('category_id', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 bg-white"
                    >
                      {categories
                        ? categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name_en}</option>
                          ))
                        : <option value={editForm.category_id}>{product.category_name}</option>}
                    </select>
                  </div>
                  <div className="flex flex-col justify-end pb-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.is_organic}
                        onChange={(e) => field('is_organic', e.target.checked)}
                        className="h-4 w-4 rounded text-farm-green-600 focus:ring-farm-green-500"
                      />
                      <span className="text-sm text-gray-700 flex items-center gap-1">
                        <Leaf className="h-3.5 w-3.5 text-green-600" /> Organic
                      </span>
                    </label>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Harvest Date
                    </label>
                    <input
                      type="date"
                      value={editForm.harvest_date}
                      onChange={(e) => field('harvest_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Best Before
                    </label>
                    <input
                      type="date"
                      value={editForm.best_before_date}
                      onChange={(e) => field('best_before_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                    />
                  </div>
                </div>

                {/* Descriptions */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description (English)</label>
                  <textarea
                    rows={3}
                    value={editForm.description_en}
                    onChange={(e) => field('description_en', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description (Marathi)</label>
                  <textarea
                    rows={3}
                    value={editForm.description_mr}
                    onChange={(e) => field('description_mr', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 resize-none"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Tags
                  </label>
                  {editTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {editTags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 bg-farm-green-50 border border-farm-green-200 text-farm-green-700 text-xs rounded-full"
                        >
                          {tag}
                          <button
                            onClick={() => setEditTags((prev) => prev.filter((t) => t !== tag))}
                            className="hover:text-red-500 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddTag() }
                      }}
                      placeholder="Type tag and press Enter"
                      className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                  <label className="block text-xs font-semibold text-amber-800 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Product Benefits
                    <span className="text-xs font-normal text-amber-600 ml-1">— shown as highlights to customers</span>
                  </label>
                  {editBenefits.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {editBenefits.map((b) => (
                        <span
                          key={b}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 text-amber-800 text-xs rounded-full font-medium shadow-sm"
                        >
                          <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          {b}
                          <button
                            onClick={() => setEditBenefits((prev) => prev.filter((x) => x !== b))}
                            className="ml-0.5 hover:text-red-500 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={benefitInput}
                      onChange={(e) => setBenefitInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddBenefit() }
                      }}
                      placeholder="e.g. No Pesticides, Rich in Vitamin C…"
                      className="flex-1 px-2.5 py-1.5 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white placeholder-amber-300"
                    />
                    <button
                      onClick={handleAddBenefit}
                      className="px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors border border-amber-300"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Category" value={product.category_name || product.category_slug} />
                  {product.farmer_name
                    ? <Info label="Farmer" value={product.farmer_name} />
                    : <Info label="Farmer" value="Unassigned (catalog product)" />}
                  <Info label="Price" value={`₹${product.price} / ${product.unit}`} />
                  <Info label="Min Order" value={`${product.min_order_qty} ${product.unit}`} />
                  <Info label="Stock" value={`${product.stock} ${product.unit}`} />
                  <div>
                    <p className="text-xs text-gray-500">Labels</p>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {product.is_organic && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          <Leaf className="h-3 w-3" /> Organic
                        </span>
                      )}
                      {!product.is_organic && (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </div>
                  </div>
                  {product.harvest_date && (
                    <Info label="Harvest Date" value={new Date(product.harvest_date).toLocaleDateString('en-IN')} />
                  )}
                  {product.best_before_date && (
                    <Info label="Best Before" value={new Date(product.best_before_date).toLocaleDateString('en-IN')} />
                  )}
                </div>
                {product.description_en && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Description (English)</p>
                    <p className="text-sm text-gray-700">{product.description_en}</p>
                  </div>
                )}
                {product.description_mr && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Description (Marathi)</p>
                    <p className="text-sm text-gray-700">{product.description_mr}</p>
                  </div>
                )}
                {product.tags && product.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 text-gray-600 text-xs rounded-full"
                        >
                          <Tag className="h-3 w-3" /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Benefits highlight section */}
                {product.benefits && product.benefits.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Product Benefits
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.benefits.map((b) => (
                        <span
                          key={b}
                          className="flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-300 text-amber-800 text-xs rounded-full font-medium shadow-sm"
                        >
                          <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Stock Control ── */}
          <section className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Package className="h-4 w-4" /> Stock Quantity
            </h3>
            <div className={clsx(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold w-fit',
              product.stock === 0
                ? 'bg-red-100 text-red-700'
                : product.stock < 10
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700',
            )}>
              {product.stock === 0 ? '⚠ Out of Stock' : `${product.stock} ${product.unit} available`}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={stockInput}
                onChange={(e) => setStockInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateStock()}
                className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
              />
              <span className="flex items-center text-sm text-gray-500">{product.unit}</span>
              <button
                onClick={handleUpdateStock}
                disabled={stockLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {stockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
              </button>
            </div>
            {stockInput === '0' && (
              <p className="text-xs text-red-600">⚠ Setting stock to 0 will mark this product as Out of Stock.</p>
            )}
            {stockMsg && (
              <p className={clsx('text-xs', stockMsg.type === 'success' ? 'text-green-700' : 'text-red-600')}>
                {stockMsg.text}
              </p>
            )}
          </section>

          {/* ── Status Toggle ── */}
          <section className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Product Status</h3>
                <p className="text-xs text-gray-500 mt-0.5">Toggle to activate or deactivate this product</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={product.status} />
                <button
                  onClick={handleToggleStatus}
                  disabled={statusLoading || product.status === 'OUT_OF_STOCK'}
                  title={
                    product.status === 'OUT_OF_STOCK'
                      ? 'Cannot toggle — product is out of stock'
                      : undefined
                  }
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    product.status === 'ACTIVE'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100',
                  )}
                >
                  {statusLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : product.status === 'ACTIVE' ? (
                    <><ToggleRight className="h-4 w-4" /> Deactivate</>
                  ) : (
                    <><ToggleLeft className="h-4 w-4" /> Activate</>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* ── Discount Management ── */}
          <section className="bg-gray-50 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Percent className="h-4 w-4" /> Discount
            </h3>

            {product.discount && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-700">
                    {product.discount.discount_percent}% off
                  </p>
                  <p className="text-xs text-red-500 mt-0.5">
                    {product.discount.valid_from
                      ? `From ${new Date(product.discount.valid_from).toLocaleDateString('en-IN')}`
                      : 'No start date'}
                    {' · '}
                    {product.discount.valid_until
                      ? `Until ${new Date(product.discount.valid_until).toLocaleDateString('en-IN')}`
                      : 'No end date'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Discounted price:{' '}
                    <strong>
                      ₹{discountedPrice(product.price, product.discount.discount_percent).toFixed(2)}
                    </strong>{' '}
                    / {product.unit}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Discount % <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Valid From
                  </label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Valid Until
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                  />
                </div>
              </div>
            </div>

            {discountMsg && (
              <div className={clsx(
                'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                discountMsg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700',
              )}>
                {discountMsg.type === 'success'
                  ? <span className="text-green-500">✓</span>
                  : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                {discountMsg.text}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSetDiscount}
                disabled={discountLoading || !discountPercent}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {discountLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Percent className="h-4 w-4" />}
                {product.discount ? 'Update Discount' : 'Set Discount'}
              </button>
              {product.discount && (
                <button
                  onClick={handleRemoveDiscount}
                  disabled={discountLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

// ─── AddProductModal ──────────────────────────────────────────────────────────

function AddProductModal({
  defaultCategoryId = '',
  onClose,
  onCreated,
}: {
  defaultCategoryId?: string
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    category_id: defaultCategoryId, name_en: '', name_mr: '',
    price: '', unit: 'kg', min_order_qty: '1', stock: '0',
    is_organic: false,
    harvest_date: '', best_before_date: '', description_en: '', description_mr: '',
  })
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [benefits, setBenefits] = useState<string[]>([])
  const [benefitInput, setBenefitInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: categories } = useQuery<AdminCategoryOption[]>({
    queryKey: ['admin-categories-list'],
    queryFn: async () => (await api.get('/admin/categories')).data,
  })

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  const handleAddBenefit = () => {
    const b = benefitInput.trim()
    if (b && !benefits.includes(b)) setBenefits((prev) => [...prev, b])
    setBenefitInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.category_id) { setError('Select a category.'); return }
    if (!form.name_en.trim()) { setError('Product name (English) is required.'); return }
    const price = parseFloat(form.price)
    if (isNaN(price) || price <= 0) { setError('Enter a valid price.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/admin/products', {
        category_id: form.category_id,
        name_en: form.name_en.trim(), name_mr: form.name_mr.trim(),
        price, unit: form.unit,
        min_order_qty: parseInt(form.min_order_qty) || 1,
        stock: parseInt(form.stock) || 0,
        is_organic: form.is_organic,
        harvest_date: form.harvest_date || null,
        best_before_date: form.best_before_date || null,
        description_en: form.description_en || null,
        description_mr: form.description_mr || null,
        tags,
        benefits,
      })
      onCreated()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Failed to create product.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 overflow-hidden" onClick={onClose}>
      <div className="relative bg-white h-full w-full max-w-2xl overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Add New Product</h2>
            <p className="text-xs text-gray-400">Create a shared product catalog item</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Name (English) *</label>
              <input value={form.name_en} onChange={(e) => set('name_en', e.target.value)} placeholder="e.g. Fresh Tomatoes"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Name (Marathi)</label>
              <input value={form.name_mr} onChange={(e) => set('name_mr', e.target.value)} placeholder="e.g. ताजे टोमॅटो"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Category *</label>
              <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 bg-white">
                <option value="">Select…</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Price (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Unit *</label>
              <select value={form.unit} onChange={(e) => set('unit', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 bg-white">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Min Order Qty</label>
              <input type="number" min="1" value={form.min_order_qty} onChange={(e) => set('min_order_qty', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Initial Stock</label>
              <input type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_organic} onChange={(e) => set('is_organic', e.target.checked)}
                className="h-4 w-4 rounded text-farm-green-600 focus:ring-farm-green-500" />
              <span className="text-sm text-gray-700 flex items-center gap-1"><Leaf className="h-3.5 w-3.5 text-green-600" /> Organic</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> Harvest Date</label>
              <input type="date" value={form.harvest_date} onChange={(e) => set('harvest_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> Best Before</label>
              <input type="date" value={form.best_before_date} onChange={(e) => set('best_before_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Description (English)</label>
            <textarea rows={3} value={form.description_en} onChange={(e) => set('description_en', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Description (Marathi)</label>
            <textarea rows={3} value={form.description_mr} onChange={(e) => set('description_mr', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 resize-none" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium flex items-center gap-1"><Tag className="h-3 w-3" /> Tags</label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-farm-green-50 border border-farm-green-200 text-farm-green-700 text-xs rounded-full">
                    {tag}
                    <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))} className="hover:text-red-500 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                placeholder="Type tag and press Enter"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
              <button type="button" onClick={handleAddTag}
                className="px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <label className="block text-xs font-semibold text-amber-800 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Product Benefits
              <span className="text-xs font-normal text-amber-600 ml-1">— shown as highlights to customers</span>
            </label>
            {benefits.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {benefits.map((b) => (
                  <span key={b} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 text-amber-800 text-xs rounded-full font-medium shadow-sm">
                    <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    {b}
                    <button type="button" onClick={() => setBenefits((prev) => prev.filter((x) => x !== b))} className="ml-0.5 hover:text-red-500 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={benefitInput} onChange={(e) => setBenefitInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBenefit() } }}
                placeholder="e.g. No Pesticides, Rich in Vitamin C…"
                className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white placeholder-amber-300" />
              <button type="button" onClick={handleAddBenefit}
                className="px-3 py-2 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors border border-amber-300">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Creating…' : 'Create Product'}
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

// ─── CategoryIconUploader ─────────────────────────────────────────────────────

function CategoryIconUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    setUploading(true); setError('')
    try {
      const { data: { upload_url, file_url } } = await api.post('/admin/upload/presign', {
        filename: file.name,
        content_type: file.type,
      })
      const s3Res = await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!s3Res.ok) throw new Error('Upload failed')
      onChange(file_url)
    } catch {
      setError('Upload failed. You can paste a URL instead.')
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-500 font-medium">Icon (optional)</label>
      <div className="flex items-center gap-2">
        {value ? (
          <img src={value} alt="icon" className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = '' }} />
        ) : (
          <div className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0 bg-gray-50">
            <ImagePlus className="h-4 w-4 text-gray-400" />
          </div>
        )}
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Paste URL or upload →"
              className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  )
}

// ─── AddCategoryModal ─────────────────────────────────────────────────────────

function AddCategoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name_en: '', name_mr: '', slug: '', icon_url: '', is_active: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleNameChange = (val: string) => {
    setForm((prev) => ({
      ...prev,
      name_en: val,
      slug: prev.slug === autoSlug(prev.name_en) ? autoSlug(val) : prev.slug,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name_en.trim()) { setError('English name is required.'); return }
    if (!form.slug.trim()) { setError('Slug is required.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/admin/categories', {
        name_en: form.name_en.trim(),
        name_mr: form.name_mr.trim(),
        slug: form.slug.trim(),
        icon_url: form.icon_url.trim() || null,
        is_active: form.is_active,
      })
      onCreated()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Failed to create category.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Add Category</h2>
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
              <label className="block text-xs text-gray-500 mb-1 font-medium">Name (English) *</label>
              <input value={form.name_en} onChange={(e) => handleNameChange(e.target.value)} placeholder="Vegetables"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Name (Marathi)</label>
              <input value={form.name_mr} onChange={(e) => set('name_mr', e.target.value)} placeholder="भाजीपाला"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Slug *</label>
            <input value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="vegetables"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 font-mono" />
          </div>
          <CategoryIconUploader value={form.icon_url} onChange={(url) => set('icon_url', url)} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)}
              className="h-4 w-4 rounded text-farm-green-600 focus:ring-farm-green-500" />
            <span className="text-sm text-gray-700">Active (visible in app)</span>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Creating…' : 'Create Category'}
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

export default function ProductsPage() {
  // Category accordion state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [categoryProducts, setCategoryProducts] = useState<Record<string, AdminProduct[]>>({})
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)

  // Modals
  const [selected, setSelected] = useState<AdminProduct | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [preselectedCatId, setPreselectedCatId] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)

  // Inline category edit
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [catEditForm, setCatEditForm] = useState({ name_en: '', name_mr: '', icon_url: '', is_active: true })
  const [catSaving, setCatSaving] = useState(false)
  const [catError, setCatError] = useState('')

  // Sort: per-category product sort key
  const [productSorts, setProductSorts] = useState<Record<string, string>>({})
  const [catMoving, setCatMoving] = useState<string | null>(null)

  // Search
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AdminProduct[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const { data: categories, refetch: refetchCategories, isLoading: catsLoading } = useQuery<AdminCategory[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => (await api.get('/admin/categories')).data,
  })

  const fetchProducts = useCallback(async (slug: string) => {
    setLoadingSlug(slug)
    try {
      const res = await api.get('/admin/products/all', { params: { category: slug, page_size: 100 } })
      setCategoryProducts((prev) => ({ ...prev, [slug]: res.data.items ?? [] }))
    } finally {
      setLoadingSlug(null)
    }
  }, [])

  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
        if (!categoryProducts[slug]) fetchProducts(slug)
      }
      return next
    })
  }

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchInput.trim()
    setSearchQuery(q)
    if (!q) { setSearchResults(null); return }
    setSearchLoading(true)
    try {
      const res = await api.get('/admin/products/all', { params: { search: q, page_size: 50 } })
      setSearchResults(res.data.items ?? [])
    } finally {
      setSearchLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
    setSearchResults(null)
  }

  const startEditCategory = (cat: AdminCategory) => {
    setEditingCatId(cat.id)
    setCatEditForm({ name_en: cat.name_en, name_mr: cat.name_mr, icon_url: cat.icon_url ?? '', is_active: cat.is_active })
    setCatError('')
  }

  const saveEditCategory = async (catId: string) => {
    if (!catEditForm.name_en.trim()) { setCatError('English name required'); return }
    setCatSaving(true); setCatError('')
    try {
      await api.patch(`/admin/categories/${catId}`, {
        name_en: catEditForm.name_en.trim(),
        name_mr: catEditForm.name_mr.trim(),
        icon_url: catEditForm.icon_url.trim() || null,
        is_active: catEditForm.is_active,
      })
      setEditingCatId(null)
      refetchCategories()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setCatError(e?.response?.data?.detail ?? 'Failed to save.')
    } finally {
      setCatSaving(false)
    }
  }

  const handleProductAdded = (categoryId: string) => {
    const cat = categories?.find((c) => c.id === categoryId)
    if (cat && expandedCategories.has(cat.slug)) fetchProducts(cat.slug)
    refetchCategories()
  }

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    if (!categories) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= categories.length) return
    const a = categories[index]
    const b = categories[targetIndex]
    setCatMoving(a.id)
    try {
      await Promise.all([
        api.patch(`/admin/categories/${a.id}`, { display_order: targetIndex * 10 }),
        api.patch(`/admin/categories/${b.id}`, { display_order: index * 10 }),
      ])
      refetchCategories()
    } finally {
      setCatMoving(null)
    }
  }

  const sortedProducts = (products: AdminProduct[], sortKey: string): AdminProduct[] => {
    const arr = [...products]
    switch (sortKey) {
      case 'name_asc':  arr.sort((a, b) => a.name_en.localeCompare(b.name_en)); break
      case 'name_desc': arr.sort((a, b) => b.name_en.localeCompare(a.name_en)); break
      case 'price_asc':  arr.sort((a, b) => a.price - b.price); break
      case 'price_desc': arr.sort((a, b) => b.price - a.price); break
      case 'stock_asc':  arr.sort((a, b) => a.stock - b.stock); break
      case 'stock_desc': arr.sort((a, b) => b.stock - a.stock); break
    }
    return arr
  }

  const handleRefresh = useCallback((categorySlug?: string) => {
    if (categorySlug) fetchProducts(categorySlug)
    if (selected) {
      api.get(`/admin/products/${selected.id}`).then((r) => setSelected(r.data)).catch(() => {})
    }
  }, [selected, fetchProducts])

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:border-farm-green-400 text-gray-700 hover:text-farm-green-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
          <button
            onClick={() => { setPreselectedCatId(''); setShowAddProduct(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-farm-green-700 hover:bg-farm-green-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-farm-green-700 hover:bg-farm-green-800 text-white text-sm font-medium rounded-lg transition-colors">
            Search
          </button>
          {searchQuery && (
            <button type="button" onClick={clearSearch} className="px-3 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {/* Search results */}
      {searchResults !== null && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Search results for &quot;{searchQuery}&quot;
              <span className="ml-2 text-xs font-normal text-gray-400">{searchResults.length} product{searchResults.length !== 1 ? 's' : ''}</span>
            </h3>
          </div>
          {searchLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-farm-green-600" /></div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Package className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">No products match &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={() => setSelected(p)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category accordion (hidden while search results are shown) */}
      {searchResults === null && (
        <div className="space-y-3">
          {catsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-farm-green-600" /></div>
          ) : !categories || categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Package className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm">No categories yet.</p>
              <button onClick={() => setShowAddCategory(true)} className="mt-2 text-sm text-farm-green-700 hover:text-farm-green-900 font-medium">
                + Create first category
              </button>
            </div>
          ) : (
            categories.map((cat, catIndex) => {
              const isExpanded = expandedCategories.has(cat.slug)
              const isEditing = editingCatId === cat.id
              const products = categoryProducts[cat.slug] ?? []
              const isLoadingThis = loadingSlug === cat.slug

              return (
                <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Category header — edit mode */}
                  {isEditing ? (
                    <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 space-y-2">
                      {catError && (
                        <p className="text-xs text-red-600">{catError}</p>
                      )}
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          value={catEditForm.name_en}
                          onChange={(e) => setCatEditForm((p) => ({ ...p, name_en: e.target.value }))}
                          placeholder="Name (English)"
                          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 w-40"
                        />
                        <input
                          value={catEditForm.name_mr}
                          onChange={(e) => setCatEditForm((p) => ({ ...p, name_mr: e.target.value }))}
                          placeholder="Name (Marathi)"
                          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 w-40"
                        />
                        <div className="w-full">
                          <CategoryIconUploader
                            value={catEditForm.icon_url}
                            onChange={(url) => setCatEditForm((p) => ({ ...p, icon_url: url }))}
                          />
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={catEditForm.is_active}
                            onChange={(e) => setCatEditForm((p) => ({ ...p, is_active: e.target.checked }))}
                            className="h-3.5 w-3.5 rounded text-farm-green-600 focus:ring-farm-green-500"
                          />
                          Active
                        </label>
                        <button
                          onClick={() => saveEditCategory(cat.id)}
                          disabled={catSaving}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                          {catSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingCatId(null); setCatError('') }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Category header — view mode */
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                      onClick={() => toggleCategory(cat.slug)}
                    >
                      <span className="text-gray-400 flex-shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                      {cat.icon_url ? (
                        <img src={cat.icon_url} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-farm-green-100 flex items-center justify-center flex-shrink-0">
                          <Package className="h-3.5 w-3.5 text-farm-green-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-gray-900">{cat.name_en}</span>
                        {cat.name_mr && <span className="text-xs text-gray-400 ml-2">{cat.name_mr}</span>}
                      </div>
                      <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {cat.product_count} {cat.product_count === 1 ? 'product' : 'products'}
                      </span>
                      <span className={clsx(
                        'flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium',
                        cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                      )}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Move up/down */}
                        <button
                          onClick={() => moveCategory(catIndex, 'up')}
                          disabled={catIndex === 0 || catMoving === cat.id}
                          className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveCategory(catIndex, 'down')}
                          disabled={catIndex === (categories?.length ?? 0) - 1 || catMoving === cat.id}
                          className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-0.5" />
                        <button
                          onClick={() => startEditCategory(cat)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit category"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setPreselectedCatId(cat.id); setShowAddProduct(true) }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-farm-green-700 bg-farm-green-50 hover:bg-farm-green-100 rounded-lg transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Product
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded products */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/60 p-4">
                      {isLoadingThis ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-farm-green-600" />
                        </div>
                      ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                          <Package className="h-8 w-8 mb-2 opacity-30" />
                          <p className="text-xs">No products in this category.</p>
                          <button
                            onClick={() => { setPreselectedCatId(cat.id); setShowAddProduct(true) }}
                            className="mt-2 text-xs text-farm-green-700 hover:text-farm-green-900 font-medium"
                          >
                            + Add first product
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-500">{products.length} product{products.length !== 1 ? 's' : ''}</span>
                            <div className="flex items-center gap-1.5">
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                              <select
                                value={productSorts[cat.slug] ?? ''}
                                onChange={(e) => setProductSorts(prev => ({ ...prev, [cat.slug]: e.target.value }))}
                                className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-farm-green-400"
                              >
                                <option value="">Default order</option>
                                <option value="name_asc">Name A→Z</option>
                                <option value="name_desc">Name Z→A</option>
                                <option value="price_asc">Price low→high</option>
                                <option value="price_desc">Price high→low</option>
                                <option value="stock_asc">Stock low→high</option>
                                <option value="stock_desc">Stock high→low</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {sortedProducts(products, productSorts[cat.slug] ?? '').map((p) => (
                              <ProductCard key={p.id} product={p} onSelect={() => setSelected(p)} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Modals */}
      {selected && (
        <ProductDetailModal
          product={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => handleRefresh(selected.category_slug)}
          setSelected={setSelected}
        />
      )}
      {showAddProduct && (
        <AddProductModal
          defaultCategoryId={preselectedCatId}
          onClose={() => setShowAddProduct(false)}
          onCreated={() => { setShowAddProduct(false); handleProductAdded(preselectedCatId) }}
        />
      )}
      {showAddCategory && (
        <AddCategoryModal
          onClose={() => setShowAddCategory(false)}
          onCreated={() => { setShowAddCategory(false); refetchCategories() }}
        />
      )}
    </div>
  )
}
