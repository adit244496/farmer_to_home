import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Clock, AlertTriangle } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized, farmerProfile } = useAuthStore()

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (farmerProfile?.approval_status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-yellow-100 rounded-full p-4">
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Application Under Review</h2>
          <p className="text-gray-500 text-center mb-6">
            Welcome, <span className="font-semibold text-gray-700">{farmerProfile.full_name}</span>! Your farmer account is pending approval by our admin team.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-yellow-700 text-sm">
                You will be notified once your account is approved. This typically takes 1–2 business days.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('farmer_access_token')
              localStorage.removeItem('farmer_refresh_token')
              window.location.href = '/login'
            }}
            className="w-full py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  if (farmerProfile?.approval_status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-red-100 rounded-full p-4">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Application Rejected</h2>
          <p className="text-gray-500 text-center mb-6">
            Unfortunately, your farmer account application has been rejected. Please contact support for more information.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('farmer_access_token')
              localStorage.removeItem('farmer_refresh_token')
              window.location.href = '/login'
            }}
            className="w-full py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
