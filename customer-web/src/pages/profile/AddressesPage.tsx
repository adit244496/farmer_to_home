import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, MapPin, Star } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { orderService } from '@/services/order.service'
import { AddressForm } from '@/components/address/AddressForm'
import { Spinner } from '@/components/ui/Spinner'
import type { AddressCreateData } from '@/services/order.service'

export default function AddressesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: orderService.getAddresses,
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return
    await orderService.deleteAddress(id)
    queryClient.invalidateQueries({ queryKey: ['addresses'] })
  }

  const handleSave = async (data: AddressCreateData) => {
    await orderService.createAddress(data)
    queryClient.invalidateQueries({ queryKey: ['addresses'] })
    setShowForm(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-gray-900 flex-1">Manage Addresses</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="text-primary-700 hover:text-primary-800">
            <Plus className="h-5 w-5" />
          </button>
        )}
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (addresses ?? []).length === 0 && !showForm ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <MapPin className="h-12 w-12 mb-3" />
            <p className="font-medium text-gray-600 mb-1">No saved addresses</p>
            <p className="text-sm text-gray-400 mb-4">Add your delivery address to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #115e59 0%, #0d9488 100%)' }}
            >
              <Plus className="h-4 w-4" /> Add Address
            </button>
          </div>
        ) : (
          <>
            {(addresses ?? []).map((addr) => (
              <div key={addr.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase">{addr.label}</span>
                      {addr.is_default && (
                        <span className="inline-flex items-center gap-0.5 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                          <Star className="h-3 w-3 fill-current" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{addr.recipient_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {addr.house}{addr.area ? `, ${addr.area}` : ''}, {addr.city}, {addr.state} — {addr.pin_code}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">+91 {addr.phone}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">New Address</h3>
            <AddressForm
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
              saveLabel="Save Address"
            />
          </div>
        )}

        {!showForm && (addresses ?? []).length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add new address
          </button>
        )}
      </div>
    </div>
  )
}
