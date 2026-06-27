import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { orderService } from '@/services/order.service'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { Spinner } from '@/components/ui/Spinner'
import { formatCurrency, formatDate, getStatusColor } from '@/utils/formatting'
import { useAuthStore } from '@/store/authStore'

const TABS = [
  { key: undefined, label: 'allOrders' },
  { key: 'active', label: 'activeOrders' },
  { key: 'delivered', label: 'deliveredOrders' },
  { key: 'cancelled', label: 'cancelledOrders' },
]

export default function OrdersPage() {
  const { t } = useTranslation('orders')
  const { language } = useAuthStore()
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: () => orderService.getOrders({ status: activeTab }),
  })

  const orders = data?.results ?? []

  return (
    <div className="h-dvh flex flex-col bg-gray-50 pb-20 sm:pb-0">
      <Header />
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('myOrders')}</h1>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}
            >
              {t(tab.label as keyof typeof t)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <ClipboardList className="h-14 w-14 mb-3" />
            <p className="font-medium text-gray-600">{t('noOrders')}</p>
            <p className="text-sm mt-1">{t('noOrdersDesc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800">#{order.order_id}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                      {t(order.status as keyof typeof t)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(order.placed_at, language)}</p>
                  <p className="text-sm font-bold text-primary-700 mt-1">{formatCurrency(order.total_amount)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
      </div>{/* end scroll wrapper */}
      <BottomNav />
    </div>
  )
}
