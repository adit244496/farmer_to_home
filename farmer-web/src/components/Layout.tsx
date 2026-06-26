import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, TrendingUp, User, LogOut, Sprout } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

const navLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package, end: false },
  { to: '/orders', label: 'Orders', icon: ShoppingCart, end: false },
  { to: '/earnings', label: 'Earnings', icon: TrendingUp, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
]

export default function Layout() {
  const { farmerProfile, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-green-700 flex flex-col h-full">
        {/* Logo / Brand */}
        <div className="px-5 py-5 border-b border-green-600">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-1.5">
              <Sprout className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Farmer to Home</p>
              <p className="text-green-200 text-xs">Farmer Portal</p>
            </div>
          </div>
        </div>

        {/* Farmer info */}
        <div className="px-5 py-4 border-b border-green-600">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 rounded-full h-9 w-9 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {farmerProfile?.full_name?.charAt(0)?.toUpperCase() ?? 'F'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-medium text-sm truncate">{farmerProfile?.full_name ?? 'Farmer'}</p>
              <p className="text-green-200 text-xs truncate">{farmerProfile?.village}, {farmerProfile?.district}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-green-100 hover:bg-green-600 hover:text-white'
                )
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-green-600">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-green-100 hover:bg-green-600 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{farmerProfile?.full_name}</p>
              <p className="text-xs text-gray-500">{farmerProfile?.phone}</p>
            </div>
            <div className="bg-green-100 rounded-full h-8 w-8 flex items-center justify-center">
              <span className="text-green-700 font-semibold text-sm">
                {farmerProfile?.full_name?.charAt(0)?.toUpperCase() ?? 'F'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
