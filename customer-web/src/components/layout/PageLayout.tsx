import { Header } from './Header'
import { BottomNav } from './BottomNav'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
  /** Set to true for full-bleed pages that manage their own inner container */
  fullBleed?: boolean
}

export function PageLayout({ children, className = '', fullBleed = false }: PageLayoutProps) {
  return (
    <div className={`min-h-[100dvh] bg-gray-50 pb-20 sm:pb-0 ${className}`}>
      <Header />
      {fullBleed ? (
        children
      ) : (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          {children}
        </main>
      )}
      <BottomNav />
    </div>
  )
}
