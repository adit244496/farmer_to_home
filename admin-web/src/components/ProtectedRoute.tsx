import { useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-farm-green-700" />
          <p className="text-sm text-gray-500">Loading admin portal…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
