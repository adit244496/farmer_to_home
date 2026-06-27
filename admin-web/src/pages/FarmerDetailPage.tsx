import { useRef, useState, type ElementType } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle, XCircle, PauseCircle,
  Star, MapPin, Phone, Mail, Leaf, Package, Pencil, Trash2,
  ImagePlus, Video, X, RotateCcw, Save,
} from 'lucide-react'
import api from '@/lib/api'
import type { Farmer, Product } from '@/types'
import clsx from 'clsx'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={clsx('inline-block px-2.5 py-1 rounded-lg text-xs font-semibold capitalize', map[status] ?? 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  )
}

export default function FarmerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: farmer, isLoading, isError } = useQuery<Farmer>({
    queryKey: ['farmer', id],
    queryFn: async () => (await api.get(`/admin/farmers/${id}`)).data,
    enabled: !!id,
  })

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['farmer-products', id],
    queryFn: async () => {
      const res = await api.get(`/admin/farmers/${id}/inventory`)
      return Array.isArray(res.data) ? res.data : res.data?.items ?? []
    },
    enabled: !!id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['farmer', id] })
    queryClient.invalidateQueries({ queryKey: ['farmers'] })
  }

  const doAction = async (action: string, endpoint: string, body?: Record<string, string>, successMsg?: string) => {
    setActionLoading(action)
    setActionError(null)
    setActionSuccess(null)
    try {
      await api.post(endpoint, body)
      invalidate()
      setActionSuccess(successMsg ?? 'Action completed.')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setActionError(e?.response?.data?.detail ?? `Failed to ${action}.`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return
    await doAction('reject', `/admin/farmers/${id}/reject`, { reason: rejectReason.trim() }, 'Farmer rejected.')
    setRejectModal(false)
    setRejectReason('')
  }

  const handleDelete = async () => {
    setActionLoading('delete')
    setActionError(null)
    try {
      await api.delete(`/admin/farmers/${id}`)
      setDeleteModal(false)
      navigate(-1)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setActionError(e?.response?.data?.detail ?? 'Failed to delete farmer.')
      setActionLoading(null)
    }
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    setUploadingMedia(true)
    setActionError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('media_type', mediaType)
      await api.post(`/admin/farmers/${id}/media`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      invalidate()
      setActionSuccess('Media uploaded.')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setActionError(e?.response?.data?.detail ?? 'Upload failed.')
    } finally {
      setUploadingMedia(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteMedia = async (mediaId: string) => {
    try {
      await api.delete(`/admin/farmers/${id}/media/${mediaId}`)
      invalidate()
    } catch {
      setActionError('Failed to delete media.')
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-farm-green-600" /></div>
  if (isError || !farmer) return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-4">
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm">Failed to load farmer details.</span>
    </div>
  )

  const isPending = farmer.approval_status === 'pending'
  const isApproved = farmer.approval_status === 'approved'
  const isSuspended = farmer.approval_status === 'suspended'

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Farmers
      </button>

      {actionError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />{actionSuccess}
        </div>
      )}

      {/* ── Farmer info card ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-farm-green-100 text-farm-green-700 font-bold text-xl flex-shrink-0">
              {farmer.full_name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{farmer.full_name}</h1>
                {farmer.is_new && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-medium">New</span>}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={farmer.approval_status} />
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                  {farmer.rating.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Edit button always visible */}
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>

            {/* Pending farmers: Approve + Reject */}
            {isPending && (
              <>
                <button
                  onClick={() => doAction('approve', `/admin/farmers/${id}/approve`, undefined, 'Farmer approved.')}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Approve
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </>
            )}

            {/* Approved farmers: Suspend */}
            {isApproved && (
              <button
                onClick={() => doAction('suspend', `/admin/farmers/${id}/suspend`, undefined, 'Farmer suspended.')}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {actionLoading === 'suspend' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                Suspend
              </button>
            )}

            {/* Suspended farmers: Re-activate */}
            {isSuspended && (
              <button
                onClick={() => doAction('approve', `/admin/farmers/${id}/approve`, undefined, 'Farmer re-activated.')}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Re-activate
              </button>
            )}

            {/* Delete always available (soft delete) */}
            <button
              onClick={() => setDeleteModal(true)}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>

        {farmer.rejection_reason && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <strong>Rejection reason:</strong> {farmer.rejection_reason}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <InfoRow icon={Phone} label="Phone" value={farmer.phone} />
          {farmer.email && <InfoRow icon={Mail} label="Email" value={farmer.email} />}
          <InfoRow icon={MapPin} label="Location" value={[farmer.village, farmer.taluka, farmer.district].filter(Boolean).join(', ')} />
          <InfoRow icon={Leaf} label="Farm Size" value={`${farmer.farm_size_acres} acres`} />
          <InfoRow icon={Package} label="Orders Fulfilled" value={String(farmer.total_orders_fulfilled)} />
          <InfoRow icon={CheckCircle} label="Member Since" value={new Date(farmer.member_since).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
        </div>

        {farmer.produce_types && farmer.produce_types.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium text-gray-500 mb-2">Produce Types</p>
            <div className="flex flex-wrap gap-2">
              {farmer.produce_types.map((type) => (
                <span key={type} className="inline-block px-2.5 py-1 bg-farm-green-50 text-farm-green-700 rounded-lg text-xs font-medium capitalize">{type}</span>
              ))}
            </div>
          </div>
        )}

        {farmer.bio && (
          <div className="mt-5">
            <p className="text-xs font-medium text-gray-500 mb-1">Bio</p>
            <p className="text-sm text-gray-600">{farmer.bio}</p>
          </div>
        )}
        {farmer.farm_description && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Farm Description</p>
            <p className="text-sm text-gray-600">{farmer.farm_description}</p>
          </div>
        )}
      </div>

      {/* ── Media gallery ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Photos &amp; Videos</h2>
          <div className="flex items-center gap-2">
            {uploadingMedia && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-farm-green-600 hover:bg-farm-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ImagePlus className="h-4 w-4" /> Upload
            </button>
          </div>
        </div>

        {(!farmer.media || farmer.media.length === 0) ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
            <div className="flex justify-center gap-3 mb-2 text-gray-300">
              <ImagePlus className="h-8 w-8" />
              <Video className="h-8 w-8" />
            </div>
            <p className="text-sm text-gray-400">No media uploaded yet. Click Upload to add images or videos.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {farmer.media.map((m) => (
              <div key={m.id} className="relative flex-shrink-0 group">
                {m.media_type === 'video' ? (
                  <video
                    src={m.url}
                    className="w-40 h-40 object-cover rounded-xl border border-gray-200"
                    controls
                  />
                ) : (
                  <img
                    src={m.url}
                    alt=""
                    className="w-40 h-40 object-cover rounded-xl border border-gray-200"
                  />
                )}
                <button
                  onClick={() => handleDeleteMedia(m.id)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full capitalize">
                  {m.media_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Products table ── */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Products</h2>
        </div>
        {productsLoading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-farm-green-600" /></div>
        ) : products && products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="px-5 py-3 font-medium">Organic</th>
                  <th className="px-5 py-3 font-medium">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{product.name_en}</div>
                      <div className="text-xs text-gray-400">{product.name_mr}</div>
                    </td>
                    <td className="px-5 py-3 capitalize text-gray-600">{product.category}</td>
                    <td className="px-5 py-3 text-gray-600">₹{product.price_per_unit}/{product.unit}</td>
                    <td className="px-5 py-3">
                      <span className={clsx('text-sm font-medium', product.stock_quantity < 10 ? 'text-red-600' : 'text-gray-700')}>
                        {product.stock_quantity} {product.unit}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {product.is_organic
                        ? <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Yes</span>
                        : <span className="text-gray-400 text-xs">No</span>}
                    </td>
                    <td className="px-5 py-3">
                      {product.is_active
                        ? <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Active</span>
                        : <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Inactive</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No products listed by this farmer.</p>
        )}
      </div>

      {/* ── Edit modal ── */}
      {editOpen && farmer && (
        <EditFarmerModal farmer={farmer} onClose={() => setEditOpen(false)} onSaved={() => { invalidate(); setEditOpen(false); setActionSuccess('Farmer details updated.') }} />
      )}

      {/* ── Reject modal ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Reject Farmer</h2>
            <p className="text-sm text-gray-600">Provide a reason for rejecting <strong>{farmer.full_name}</strong>.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason…"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectModal(false); setRejectReason('') }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                {actionLoading === 'reject' && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Delete Farmer Account</h2>
            <p className="text-sm text-gray-600">
              Are you sure you want to deactivate <strong>{farmer.full_name}</strong>'s account? This will disable their login access.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                {actionLoading === 'delete' && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Edit modal ───────────────────────────────────────────────────────────────

function EditFarmerModal({ farmer, onClose, onSaved }: { farmer: Farmer; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: farmer.full_name,
    phone: farmer.phone,
    email: farmer.email ?? '',
    district: farmer.district,
    taluka: farmer.taluka,
    village: farmer.village,
    farm_size_acres: String(farmer.farm_size_acres ?? ''),
    bio: farmer.bio ?? '',
    farm_description: farmer.farm_description ?? '',
    produce_types: (farmer.produce_types ?? []).join(', '),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.put(`/admin/farmers/${farmer.id}`, {
        ...form,
        farm_size_acres: form.farm_size_acres ? parseFloat(form.farm_size_acres) : null,
        produce_types: form.produce_types.split(',').map((s) => s.trim()).filter(Boolean),
      })
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Edit Farmer Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" value={form.name} onChange={set('name')} />
            <Field label="Phone" value={form.phone} onChange={set('phone')} />
            <Field label="Email" value={form.email} onChange={set('email')} type="email" />
            <Field label="Farm Size (acres)" value={form.farm_size_acres} onChange={set('farm_size_acres')} type="number" />
            <Field label="District" value={form.district} onChange={set('district')} />
            <Field label="Taluka" value={form.taluka} onChange={set('taluka')} />
            <Field label="Village" value={form.village} onChange={set('village')} />
            <Field label="Produce Types (comma-separated)" value={form.produce_types} onChange={set('produce_types')} />
          </div>
          <TextareaField label="Bio" value={form.bio} onChange={set('bio')} rows={2} />
          <TextareaField label="Farm Description" value={form.farm_description} onChange={set('farm_description')} rows={3} />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-farm-green-600 hover:bg-farm-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-farm-green-400"
      />
    </div>
  )
}

function TextareaField({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-farm-green-400 resize-none"
      />
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex-shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}
