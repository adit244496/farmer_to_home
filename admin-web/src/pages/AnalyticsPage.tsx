import { useState, type ElementType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, AlertCircle, TrendingUp, ShoppingCart, Users, IndianRupee } from 'lucide-react'
import api from '@/lib/api'
import clsx from 'clsx'

type Period = 'day' | 'week' | 'month' | 'year'

interface AnalyticsData {
  period: string
  total_revenue: number
  total_orders: number
  new_customers: number
  new_farmers: number
  avg_order_value: number
  top_categories?: { category: string; count: number; revenue: number }[]
  daily_breakdown?: { date: string; orders: number; revenue: number }[]
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
]

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subLabel,
}: {
  label: string
  value: string | number
  icon: ElementType
  color: string
  subLabel?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subLabel && <p className="text-xs text-gray-400 mt-1">{subLabel}</p>}
        </div>
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('day')

  const { data, isLoading, isError, error } = useQuery<AnalyticsData>({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const res = await api.get('/admin/analytics', { params: { period } })
      return res.data
    },
  })

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={clsx(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              period === p.key
                ? 'bg-farm-green-700 text-white'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-farm-green-600" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">
            Failed to load analytics: {(error as { message?: string })?.message ?? 'Unknown error'}
          </span>
        </div>
      ) : data ? (
        <>
          {/* Main stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Revenue"
              value={`₹${(data.total_revenue ?? 0).toLocaleString('en-IN')}`}
              icon={IndianRupee}
              color="bg-purple-100 text-purple-700"
              subLabel={`Avg ₹${(data.avg_order_value ?? 0).toLocaleString('en-IN')} / order`}
            />
            <StatCard
              label="Total Orders"
              value={data.total_orders ?? 0}
              icon={ShoppingCart}
              color="bg-blue-100 text-blue-700"
            />
            <StatCard
              label="New Customers"
              value={data.new_customers ?? 0}
              icon={Users}
              color="bg-farm-green-100 text-farm-green-700"
            />
            <StatCard
              label="New Farmers"
              value={data.new_farmers ?? 0}
              icon={TrendingUp}
              color="bg-amber-100 text-amber-700"
            />
          </div>

          {/* Top categories */}
          {data.top_categories && data.top_categories.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Top Categories</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 font-medium text-right">Orders</th>
                      <th className="px-5 py-3 font-medium text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.top_categories.map((cat) => (
                      <tr key={cat.category} className="hover:bg-gray-50">
                        <td className="px-5 py-3 capitalize font-medium text-gray-800">
                          {cat.category}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">{cat.count}</td>
                        <td className="px-5 py-3 text-right text-gray-600">
                          ₹{cat.revenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily breakdown */}
          {data.daily_breakdown && data.daily_breakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Daily Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium text-right">Orders</th>
                      <th className="px-5 py-3 font-medium text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.daily_breakdown.map((row) => (
                      <tr key={row.date} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-600">
                          {new Date(row.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">{row.orders}</td>
                        <td className="px-5 py-3 text-right font-medium text-gray-800">
                          ₹{row.revenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary card */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-5">
            <h2 className="font-semibold text-gray-800 mb-4">Period Summary</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <SummaryItem label="Period" value={data.period ?? period} />
              <SummaryItem
                label="Total Revenue"
                value={`₹${(data.total_revenue ?? 0).toLocaleString('en-IN')}`}
              />
              <SummaryItem label="Total Orders" value={String(data.total_orders ?? 0)} />
              <SummaryItem
                label="Avg Order Value"
                value={`₹${(data.avg_order_value ?? 0).toLocaleString('en-IN')}`}
              />
              <SummaryItem label="New Customers" value={String(data.new_customers ?? 0)} />
              <SummaryItem label="New Farmers" value={String(data.new_farmers ?? 0)} />
            </dl>
          </div>
        </>
      ) : null}
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-semibold text-gray-900 mt-0.5">{value}</dd>
    </div>
  )
}
