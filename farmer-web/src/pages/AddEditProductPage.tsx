import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Upload, X } from 'lucide-react'
import api from '@/lib/api'
import type { Product } from '@/types'

const CATEGORIES = ['vegetables', 'fruits', 'grains', 'dairy', 'spices']
const UNITS = ['kg', 'gram', 'litre', 'piece', 'dozen', 'bundle', '250g', '500g', '100g']

interface FormState {
  name_en: string
  name_mr: string
  description_en: string
  description_mr: string
  category: string
  price_per_unit: string
  unit: string
  min_order_qty: string
  stock_quantity: string
  is_organic: boolean
  is_active: boolean
  tags: string
}

export default function AddEditProductPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<FormState>({
    name_en: '',
    name_mr: '',
    description_en: '',
    description_mr: '',
    category: 'vegetables',
    price_per_unit: '',
    unit: 'kg',
    min_order_qty: '1',
    stock_quantity: '',
    is_organic: false,
    is_active: true,
    tags: '',
  })
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<{ id: number; image_url: string; is_primary: boolean }[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(isEdit)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Prefill from navigation state or fetch
  useEffect(() => {
    if (!isEdit) return
    const stateProduct = (location.state as { product?: Product })?.product
    if (stateProduct) {
      prefillForm(stateProduct)
      setFetchLoading(false)
    } else {
      api.get<Product>(`/farmers/me/products/${id}/`)
        .then((res) => { prefillForm(res.data); setFetchLoading(false) })
        .catch(() => { setError('Failed to load product'); setFetchLoading(false) })
    }
  }, [id, isEdit])

  const prefillForm = (product: Product) => {
    setForm({
      name_en: product.name_en ?? '',
      name_mr: product.name_mr ?? '',
      description_en: product.description_en ?? '',
      description_mr: (product as unknown as Record<string, string>).description_mr ?? '',
      category: product.category ?? 'vegetables',
      price_per_unit: String(product.price_per_unit ?? ''),
      unit: product.unit ?? 'kg',
      min_order_qty: String(product.min_order_qty ?? '1'),
      stock_quantity: String(product.stock_quantity ?? ''),
      is_organic: product.is_organic ?? false,
      is_active: product.is_active ?? true,
      tags: (product.tags ?? []).join(', '),
    })
    setExistingImages(product.images ?? [])
  }

  const set = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name_en.trim()) { setError('English product name is required'); return }
    if (!form.price_per_unit) { setError('Price is required'); return }
    if (!form.stock_quantity) { setError('Stock quantity is required'); return }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('name_en', form.name_en.trim())
      fd.append('name_mr', form.name_mr.trim())
      fd.append('description_en', form.description_en.trim())
      fd.append('description_mr', form.description_mr.trim())
      fd.append('category', form.category)
      fd.append('price_per_unit', form.price_per_unit)
      fd.append('unit', form.unit)
      fd.append('min_order_qty', form.min_order_qty)
      fd.append('stock_quantity', form.stock_quantity)
      fd.append('is_organic', String(form.is_organic))
      fd.append('is_active', String(form.is_active))

      const tagsArr = form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      fd.append('tags', JSON.stringify(tagsArr))

      images.forEach((img) => fd.append('images', img))

      if (isEdit) {
        await api.patch(`/farmers/me/products/${id}/`, fd)
      } else {
        await api.post('/farmers/me/products/', fd)
      }

      setSuccess(true)
      setTimeout(() => navigate('/products'), 1200)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } } }
      setError(axiosErr?.response?.data?.detail || axiosErr?.response?.data?.message || 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/products')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
          <p className="text-gray-500 text-sm">{isEdit ? 'Update product information' : 'List a new product for sale'}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-5 text-green-700 text-sm font-medium">
          Product saved successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Section title="Product Names">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name (English)" required>
              <input
                type="text"
                value={form.name_en}
                onChange={(e) => set('name_en', e.target.value)}
                placeholder="e.g. Fresh Tomatoes"
                className={inputCls}
              />
            </Field>
            <Field label="Name (Marathi)">
              <input
                type="text"
                value={form.name_mr}
                onChange={(e) => set('name_mr', e.target.value)}
                placeholder="e.g. ताजे टोमॅटो"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        <Section title="Descriptions">
          <Field label="Description (English)">
            <textarea
              value={form.description_en}
              onChange={(e) => set('description_en', e.target.value)}
              placeholder="Describe your product..."
              rows={3}
              className={inputCls}
            />
          </Field>
          <Field label="Description (Marathi)">
            <textarea
              value={form.description_mr}
              onChange={(e) => set('description_mr', e.target.value)}
              placeholder="उत्पादनाचे वर्णन..."
              rows={3}
              className={inputCls}
            />
          </Field>
        </Section>

        <Section title="Category & Pricing">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" required>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Unit" required>
              <select value={form.unit} onChange={(e) => set('unit', e.target.value)} className={inputCls}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Price per Unit (₹)" required>
              <input
                type="number"
                value={form.price_per_unit}
                onChange={(e) => set('price_per_unit', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={inputCls}
              />
            </Field>
            <Field label="Min Order Qty">
              <input
                type="number"
                value={form.min_order_qty}
                onChange={(e) => set('min_order_qty', e.target.value)}
                placeholder="1"
                min="1"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Stock Quantity" required>
            <input
              type="number"
              value={form.stock_quantity}
              onChange={(e) => set('stock_quantity', e.target.value)}
              placeholder="Available stock"
              min="0"
              className={inputCls}
            />
          </Field>
        </Section>

        <Section title="Additional Details">
          <Field label="Tags (comma-separated)">
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="e.g. fresh, seasonal, local"
              className={inputCls}
            />
          </Field>
          <div className="flex gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_organic}
                onChange={(e) => set('is_organic', e.target.checked)}
                className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">Organic Product</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">Active (visible to buyers)</span>
            </label>
          </div>
        </Section>

        {/* Image upload */}
        <Section title="Product Images">
          {existingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {existingImages.map((img) => (
                <div key={img.id} className="relative">
                  <img src={img.image_url} alt="" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                  {img.is_primary && (
                    <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs px-1 rounded">★</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Click to upload images</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB each</p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const files = Array.from(e.target.files ?? [])
                setImages((prev) => [...prev, ...files])
              }}
            />
          </label>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {images.map((file, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-sm text-gray-700">
                  <span className="truncate max-w-32">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </span>
            ) : isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
