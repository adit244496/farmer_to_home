import { Globe } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { language, setLanguage } = useAuthStore()

  return (
    <div className="h-dvh flex flex-col relative" style={{ background: 'linear-gradient(160deg, #e8f4ee 0%, #f5f0eb 100%)' }}>
      {/* Language toggle — floating top-right */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
        >
          <Globe className="h-4 w-4" />
          {language === 'en' ? 'मराठी' : 'EN'}
        </button>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
