import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, AlertCircle, ImagePlus, Check, X, Eye, EyeOff, Package,
  GripVertical, Plus, Save,
} from 'lucide-react'
import api from '@/lib/api'
import clsx from 'clsx'

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

const CATEGORY_COLORS: Record<string, string> = {
  vegetables: 'bg-green-100 text-green-700',
  fruits:     'bg-orange-100 text-orange-700',
  grains:     'bg-yellow-100 text-yellow-700',
  dairy:      'bg-blue-100 text-blue-700',
  spices:     'bg-red-100 text-red-700',
  other:      'bg-gray-100 text-gray-600',
}

function CategoryInitial({ slug, name }: { slug: string; name: string }) {
  const color = CATEGORY_COLORS[slug] ?? 'bg-gray-100 text-gray-600'
  return (
    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0', color)}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

// ─── AddCategoryModal ─────────────────────────────────────────────────────────

function AddCategoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nameEn, setNameEn] = useState('')
  const [nameMr, setNameMr] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameEn.trim()) { setError('English name is required.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/admin/categories', {
        name_en: nameEn.trim(),
        name_mr: nameMr.trim() || nameEn.trim(),
        icon_url: iconUrl.trim() || null,
        is_active: isActive,
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
          <h2 className="font-bold text-gray-900">Add New Category</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Name (English) *</label>
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Vegetables"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Name (Marathi)</label>
              <input
                value={nameMr}
                onChange={(e) => setNameMr(e.target.value)}
                placeholder="e.g. भाज्या"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium flex items-center gap-1">
              <ImagePlus className="h-3 w-3" /> Icon URL (optional)
            </label>
            <input
              type="url"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://example.com/icon.png"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
            />
            {iconUrl.trim() && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">Preview:</span>
                <img src={iconUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded text-farm-green-600 focus:ring-farm-green-500"
            />
            <span className="text-sm text-gray-700">Visible in app</span>
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

// ─── CategoryRow ──────────────────────────────────────────────────────────────

function CategoryRow({
  cat, onUpdated, isDragging, dragHandleProps,
}: {
  cat: AdminCategory
  onUpdated: () => void
  isDragging: boolean
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>
}) {
  const [editing, setEditing] = useState(false)
  const [iconUrl, setIconUrl] = useState(cat.icon_url ?? '')
  const [nameEn, setNameEn] = useState(cat.name_en)
  const [nameMr, setNameMr] = useState(cat.name_mr)
  const [saving, setSaving] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      await api.patch(`/admin/categories/${cat.id}`, {
        icon_url: iconUrl.trim() || null,
        name_en: nameEn.trim() || cat.name_en,
        name_mr: nameMr.trim() || cat.name_mr,
      })
      setEditing(false)
      onUpdated()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Save failed')
    } finally { setSaving(false) }
  }

  const handleToggleActive = async () => {
    setToggleLoading(true)
    try {
      await api.patch(`/admin/categories/${cat.id}`, { is_active: !cat.is_active })
      onUpdated()
    } catch { /* silent */ } finally { setToggleLoading(false) }
  }

  const handleCancel = () => {
    setIconUrl(cat.icon_url ?? ''); setNameEn(cat.name_en); setNameMr(cat.name_mr)
    setError(''); setEditing(false)
  }

  return (
    <div className={clsx(
      'bg-white rounded-xl border p-5 transition-all',
      isDragging ? 'opacity-50 shadow-lg border-farm-green-300' : cat.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
    )}>
      <div className="flex items-start gap-4">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="flex-shrink-0 mt-3 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Icon */}
        <div className="flex-shrink-0">
          {cat.icon_url ? (
            <img src={cat.icon_url} alt={cat.name_en}
              className="w-12 h-12 rounded-xl object-cover border border-gray-200"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <CategoryInitial slug={cat.slug} name={cat.name_en} />
          )}
        </div>

        {/* Info / edit fields */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name (English)</label>
                  <input value={nameEn} onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name (Marathi)</label>
                  <input value={nameMr} onChange={(e) => setNameMr(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <ImagePlus className="h-3 w-3" /> Icon URL
                </label>
                <input type="url" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)}
                  placeholder="https://example.com/icon.png  or leave blank to remove"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500" />
              </div>
              {iconUrl.trim() && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Preview:</span>
                  <img src={iconUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                    onError={(e) => { (e.target as HTMLImageElement).src = '' }} />
                </div>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button onClick={handleCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-900 border border-gray-300 text-xs font-medium rounded-lg transition-colors">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{cat.name_en}</h3>
                <span className="text-xs text-gray-400">/</span>
                <span className="text-sm text-gray-500">{cat.name_mr}</span>
                {!cat.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Hidden</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">slug: {cat.slug}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Package className="h-3 w-3" /> {cat.product_count} products
                </span>
                {cat.icon_url
                  ? <span className="text-xs text-green-600">✓ Icon set</span>
                  : <span className="text-xs text-amber-600">No icon</span>}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-farm-green-700 bg-farm-green-50 hover:bg-farm-green-100 rounded-lg transition-colors">
              <ImagePlus className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={handleToggleActive} disabled={toggleLoading}
              title={cat.is_active ? 'Hide from app' : 'Show in app'}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50',
                cat.is_active ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'text-green-700 bg-green-50 hover:bg-green-100'
              )}>
              {toggleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : cat.is_active ? <><EyeOff className="h-3.5 w-3.5" /> Hide</>
                : <><Eye className="h-3.5 w-3.5" /> Show</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [localCategories, setLocalCategories] = useState<AdminCategory[]>([])
  const [isOrderDirty, setIsOrderDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)

  const { data: categories, isLoading, isError } = useQuery<AdminCategory[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => (await api.get('/admin/categories')).data,
  })

  useEffect(() => {
    if (categories) { setLocalCategories(categories); setIsOrderDirty(false) }
  }, [categories])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] })

  const handleDragStart = (id: string) => setDragId(id)

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault()
    if (!dragId || dragId === overId) return
    setLocalCategories((prev) => {
      const arr = [...prev]
      const fromIdx = arr.findIndex((c) => c.id === dragId)
      const toIdx = arr.findIndex((c) => c.id === overId)
      if (fromIdx === -1 || toIdx === -1) return prev
      arr.splice(toIdx, 0, arr.splice(fromIdx, 1)[0])
      return arr
    })
    setIsOrderDirty(true)
  }

  const handleDrop = () => setDragId(null)
  const handleDragEnd = () => setDragId(null)

  const handleSaveOrder = async () => {
    setSavingOrder(true)
    try {
      await api.post('/admin/categories/reorder', {
        order: localCategories.map((c) => c.id),
      })
      setIsOrderDirty(false)
      refresh()
    } catch { /* silent */ } finally { setSavingOrder(false) }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-farm-green-600" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-4">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">Failed to load categories.</span>
      </div>
    )
  }

  const active = localCategories.filter((c) => c.is_active)
  const hidden = localCategories.filter((c) => !c.is_active)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {active.length} visible · {hidden.length} hidden · {localCategories.length} total
          {isOrderDirty && <span className="ml-2 text-amber-600 font-medium">· unsaved order</span>}
        </p>
        <div className="flex items-center gap-3">
          {isOrderDirty && (
            <button
              onClick={handleSaveOrder}
              disabled={savingOrder}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {savingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Order
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-farm-green-700 hover:bg-farm-green-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <GripVertical className="h-3.5 w-3.5" />
        Drag rows to reorder · click "Save Order" to persist
      </p>

      <div className="space-y-3">
        {localCategories.map((cat) => (
          <div
            key={cat.id}
            draggable
            onDragStart={() => handleDragStart(cat.id)}
            onDragOver={(e) => handleDragOver(e, cat.id)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          >
            <CategoryRow
              cat={cat}
              onUpdated={refresh}
              isDragging={dragId === cat.id}
              dragHandleProps={{}}
            />
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddCategoryModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { refresh(); setShowAddModal(false) }}
        />
      )}
    </div>
  )
}
