import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  BarChart,
  LogOut,
  Leaf,
  ChevronRight,
  Package,
  UserCog,
  Settings,
} from 'lucide-react'
import clsx from 'clsx'
import useAuthStore from '@/store/authStore'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/farmers', label: 'Farmers', icon: Users, exact: false },
  { to: '/products', label: 'Products', icon: Package, exact: false },
  { to: '/farmer-products', label: 'Farmer Products', icon: UserCog, exact: false },
  { to: '/orders', label: 'Orders', icon: ShoppingCart, exact: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart, exact: false },
  { to: '/settings', label: 'App Settings', icon: Settings, exact: false },
]

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/farmers': 'Farmers',
  '/products': 'Products & Categories',
  '/farmer-products': 'Farmer Products',
  '/orders': 'Orders',
  '/analytics': 'Analytics',
  '/settings': 'App Settings',
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/farmers/')) return 'Farmer Detail'
  return pageTitles[pathname] ?? 'Admin'
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="flex flex-col w-60 flex-shrink-0 bg-farm-green-900 text-white">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-farm-green-700">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-farm-green-600">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Farmer to Home</p>
            <p className="text-xs text-farm-green-300">Admin Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-farm-green-600 text-white'
                    : 'text-farm-green-200 hover:bg-farm-green-800 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-farm-green-700 space-y-2">
          <div className="px-3 py-2">
            <p className="text-xs text-farm-green-400">Signed in as</p>
            <p className="text-sm font-medium text-white truncate">{user?.full_name ?? '—'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-farm-green-200 hover:bg-farm-green-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold text-gray-900 text-lg">
              {getPageTitle(location.pathname)}
            </span>
            {location.pathname !== '/' && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span>
                  {navItems.find((n) => location.pathname.startsWith(n.to) && n.to !== '/')
                    ?.label ?? 'Detail'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-farm-green-100 text-farm-green-800 font-semibold text-sm">
              {user?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <span className="text-sm text-gray-600 hidden sm:block">{user?.full_name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
