import { useEffect, useState } from 'react'
import { TrendingUp, DollarSign, ShoppingBag, BarChart2, Info } from 'lucide-react'
import api from '@/lib/api'
import type { EarningsSummary } from '@/types'
import clsx from 'clsx'

type Period = 'week' | 'month' | 'year'

const PERIODS: { label: string; value: Period }[] = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
]

export default function EarningsPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.get<EarningsSummary>('/farmers/me/earnings/', { params: { period } })
      .then((res) => setEarnings(res.data))
      .catch(() => setError('Failed to load earnings data'))
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your income and payouts</p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                period === p.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payout info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-blue-800 text-sm">Payout Schedule</p>
          <p className="text-blue-700 text-sm mt-0.5">
            Payouts are processed every Monday directly to your registered bank account. Pending payouts are settled within 3–5 business days after delivery confirmation.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 h-32 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : earnings ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <EarningsCard
            label="Total Earnings"
            value={`₹${earnings.total_earnings?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            bg="bg-green-50"
            sub={`For this ${period}`}
          />
          <EarningsCard
            label="Pending Payout"
            value={`₹${earnings.pending_payout?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<DollarSign className="h-5 w-5 text-yellow-600" />}
            bg="bg-yellow-50"
            sub="Awaiting settlement"
          />
          <EarningsCard
            label="Orders Completed"
            value={earnings.orders_count?.toLocaleString('en-IN')}
            icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-50"
            sub={`This ${period}`}
          />
          <EarningsCard
            label="Avg Order Value"
            value={`₹${earnings.avg_order_value?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<BarChart2 className="h-5 w-5 text-purple-600" />}
            bg="bg-purple-50"
            sub="Per order average"
          />
        </div>
      ) : null}

      {/* Breakdown table placeholder */}
      {!loading && earnings && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Earnings Summary</h3>
          <div className="space-y-3">
            <SummaryRow label="Gross Sales" value={`₹${earnings.total_earnings?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
            <SummaryRow label="Platform Commission (est.)" value={`-₹${(earnings.total_earnings * 0.05).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} highlight="text-red-600" />
            <SummaryRow label="Pending Payout" value={`₹${earnings.pending_payout?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} highlight="text-yellow-700" />
            <div className="border-t border-gray-200 pt-3">
              <SummaryRow
                label="Net Earnings"
                value={`₹${(earnings.total_earnings - earnings.total_earnings * 0.05).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                bold
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EarningsCard({
  label, value, icon, bg, sub,
}: {
  label: string; value: string; icon: React.ReactNode; bg: string; sub: string
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className={clsx('inline-flex p-2.5 rounded-lg mb-3', bg)}>{icon}</div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-gray-700 text-sm font-medium mt-0.5">{label}</p>
      <p className="text-gray-400 text-xs mt-1">{sub}</p>
    </div>
  )
}

function SummaryRow({ label, value, highlight, bold }: { label: string; value: string; highlight?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={clsx('text-sm', bold ? 'font-semibold text-gray-900' : 'text-gray-600')}>{label}</span>
      <span className={clsx('text-sm', bold ? 'font-bold text-gray-900' : highlight ?? 'text-gray-800')}>{value}</span>
    </div>
  )
}
