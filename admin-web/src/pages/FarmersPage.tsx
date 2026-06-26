import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Loader2, AlertCircle, CheckCircle, XCircle, PauseCircle,
  ChevronLeft, ChevronRight, Star, Plus, X, Eye, EyeOff, Key,
} from 'lucide-react'
import api from '@/lib/api'
import type { Farmer, PaginatedResponse } from '@/types'
import clsx from 'clsx'

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={clsx('inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize', map[status] ?? 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  )
}

// ─── AddFarmerModal ───────────────────────────────────────────────────────────

function AddFarmerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '',
    district: '', taluka: '', village: '', bio: '',
    approval_status: 'APPROVED',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.phone.trim()) { setError('Phone number is required.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/admin/farmers', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        password: form.password,
        district: form.district.trim() || null,
        taluka: form.taluka.trim() || null,
        village: form.village.trim() || null,
        bio: form.bio.trim() || null,
        approval_status: form.approval_status,
      })
      onCreated()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Failed to create farmer.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 overflow-hidden" onClick={onClose}>
      <div className="relative bg-white h-full w-full max-w-lg overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Add New Farmer</h2>
            <p className="text-xs text-gray-400">Create a farmer account with login credentials</p>
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

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Rajan Patil"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
              autoFocus
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Phone *</label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="farmer@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">The farmer will use this password to log in.</p>
          </div>

          {/* Location */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">District</label>
              <input
                value={form.district}
                onChange={(e) => set('district', e.target.value)}
                placeholder="e.g. Pune"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Taluka</label>
              <input
                value={form.taluka}
                onChange={(e) => set('taluka', e.target.value)}
                placeholder="e.g. Haveli"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Village</label>
              <input
                value={form.village}
                onChange={(e) => set('village', e.target.value)}
                placeholder="e.g. Manjri"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Bio / About</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              placeholder="A short description about the farmer and their farm…"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500 resize-none"
            />
          </div>

          {/* Approval Status */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 font-medium">Approval Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="approval_status"
                  value="APPROVED"
                  checked={form.approval_status === 'APPROVED'}
                  onChange={(e) => set('approval_status', e.target.value)}
                  className="text-farm-green-600 focus:ring-farm-green-500"
                />
                <span className="text-sm text-gray-700">Approved</span>
                <span className="text-xs text-gray-400">(can list products immediately)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="approval_status"
                  value="PENDING"
                  checked={form.approval_status === 'PENDING'}
                  onChange={(e) => set('approval_status', e.target.value)}
                  className="text-farm-green-600 focus:ring-farm-green-500"
                />
                <span className="text-sm text-gray-700">Pending</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Creating…' : 'Create Farmer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ResetPasswordModal ───────────────────────────────────────────────────────

function ResetPasswordModal({
  farmerId, farmerName, onClose,
}: {
  farmerId: string
  farmerName: string
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setSaving(true); setError('')
    try {
      await api.patch(`/admin/farmers/${farmerId}/password`, { new_password: password })
      setSuccess(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Failed to update password.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Reset Password</h2>
            <p className="text-xs text-gray-400 mt-0.5">{farmerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-700 font-medium">Password updated successfully.</p>
            <button onClick={onClose} className="px-5 py-2 bg-farm-green-700 hover:bg-farm-green-800 text-white text-sm font-medium rounded-lg transition-colors">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">New Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-farm-green-700 hover:bg-farm-green-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Set Password'}
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FarmersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [resetPasswordModal, setResetPasswordModal] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, isError, error } = useQuery<PaginatedResponse<Farmer>>({
    queryKey: ['farmers', status, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE }
      if (status) params.status = status
      const res = await api.get('/admin/farmers', { params })
      return res.data
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['farmers'] })

  const handleApprove = async (id: string) => {
    setActionLoading(id); setActionError(null)
    try {
      await api.post(`/admin/farmers/${id}/approve`)
      invalidate()
    } catch { setActionError('Failed to approve farmer.') }
    finally { setActionLoading(null) }
  }

  const handleSuspend = async (id: string) => {
    setActionLoading(id); setActionError(null)
    try {
      await api.post(`/admin/farmers/${id}/suspend`)
      invalidate()
    } catch { setActionError('Failed to suspend farmer.') }
    finally { setActionLoading(null) }
  }

  const handleRejectSubmit = async () => {
    if (!rejectModal || !rejectReason.trim()) return
    setActionLoading(rejectModal.id); setActionError(null)
    try {
      await api.post(`/admin/farmers/${rejectModal.id}/reject`, { reason: rejectReason.trim() })
      invalidate()
      setRejectModal(null); setRejectReason('')
    } catch { setActionError('Failed to reject farmer.') }
    finally { setActionLoading(null) }
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <div className="space-y-4">
      {/* Status tabs + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setPage(1); setSearchParams(tab.key ? { status: tab.key } : {}) }}
              className={clsx(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                status === tab.key ? 'bg-farm-green-700 text-white' : 'text-gray-600 hover:text-gray-900',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-farm-green-700 hover:bg-farm-green-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Farmer
        </button>
      </div>

      {actionError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {actionError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-7 w-7 animate-spin text-farm-green-600" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 m-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {(error as { message?: string })?.message ?? 'Failed to load farmers.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">District</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                    <th className="px-4 py-3 font-medium">Member Since</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.items && data.items.length > 0 ? (
                    data.items.map((farmer) => (
                      <tr
                        key={farmer.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/farmers/${farmer.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{farmer.full_name}</div>
                          {farmer.is_new && <span className="text-xs text-blue-600">New</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{farmer.phone}</td>
                        <td className="px-4 py-3 text-gray-600">{farmer.district}</td>
                        <td className="px-4 py-3"><StatusBadge status={farmer.approval_status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                            {farmer.rating.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(farmer.member_since).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {farmer.approval_status !== 'approved' && (
                              <button
                                onClick={() => handleApprove(farmer.id)}
                                disabled={actionLoading === farmer.id}
                                title="Approve"
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === farmer.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <CheckCircle className="h-4 w-4" />}
                              </button>
                            )}
                            {farmer.approval_status !== 'rejected' && (
                              <button
                                onClick={() => setRejectModal({ id: farmer.id, name: farmer.full_name })}
                                disabled={actionLoading === farmer.id}
                                title="Reject"
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                            {farmer.approval_status !== 'suspended' && (
                              <button
                                onClick={() => handleSuspend(farmer.id)}
                                disabled={actionLoading === farmer.id}
                                title="Suspend"
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                              >
                                <PauseCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setResetPasswordModal({ id: farmer.id, name: farmer.full_name })}
                              title="Reset password"
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                        No farmers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} · {data?.total ?? 0} total
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Reject Farmer</h2>
            <p className="text-sm text-gray-600">
              Please provide a reason for rejecting <strong>{rejectModal.name}</strong>.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason…"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || actionLoading !== null}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {actionLoading !== null && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Farmer modal */}
      {showAddModal && (
        <AddFarmerModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { invalidate(); setShowAddModal(false) }}
        />
      )}

      {/* Reset Password modal */}
      {resetPasswordModal && (
        <ResetPasswordModal
          farmerId={resetPasswordModal.id}
          farmerName={resetPasswordModal.name}
          onClose={() => setResetPasswordModal(null)}
        />
      )}
    </div>
  )
}
