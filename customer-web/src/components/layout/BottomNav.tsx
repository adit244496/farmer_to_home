import { NavLink } from 'react-router-dom'
import { Home, ShoppingCart, ClipboardList, User } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/cart', icon: ShoppingCart, label: 'Cart' },
  { to: '/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const items = useCartStore((s) => s.items)

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 sm:hidden">
      <div className="grid grid-cols-4 h-16">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative',
                isActive ? 'text-primary-700' : 'text-gray-500'
              )
            }
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {label === 'Cart' && items.length > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {items.length > 9 ? '9+' : items.length}
                </span>
              )}
            </div>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
