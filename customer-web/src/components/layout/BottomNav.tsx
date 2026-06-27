import { NavLink } from 'react-router-dom'
import { Home, ShoppingCart, ClipboardList, User, Heart } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useWishlistStore } from '@/store/wishlistStore'
import clsx from 'clsx'

export function BottomNav() {
  const cartItems = useCartStore((s) => s.items)
  const wishlistCount = useWishlistStore((s) => s.products.length)

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 sm:hidden">
      <div className="grid grid-cols-5 h-16">
        {([
          { to: '/', icon: Home, label: 'Home', exact: true },
          { to: '/cart', icon: ShoppingCart, label: 'Cart' },
          { to: '/wishlist', icon: Heart, label: 'Wishlist' },
          { to: '/orders', icon: ClipboardList, label: 'Orders' },
          { to: '/profile', icon: User, label: 'Profile' },
        ] as const).map(({ to, icon: Icon, label, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'exact' in rest ? rest.exact : false}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative',
                isActive ? 'text-primary-700' : 'text-gray-500'
              )
            }
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {label === 'Cart' && cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {cartItems.length > 9 ? '9+' : cartItems.length}
                </span>
              )}
              {label === 'Wishlist' && wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
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
