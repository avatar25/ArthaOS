import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiClient } from '../../lib/apiClient'
import { compactCurrency, currency, percentage } from '../../lib/format'

const useSummaryData = () => {
  const month = new Date().toISOString().slice(0, 7)
  return useQuery({
    queryKey: ['summary', month],
    queryFn: () => apiClient.getSummary(month),
  })
}

const useNetWorthData = () =>
  useQuery({
    queryKey: ['networth'],
    queryFn: () => apiClient.getNetWorthCurve(),
  })

export const DashboardView = () => {
  const summaryQuery = useSummaryData()
  const networthQuery = useNetWorthData()

  const monthLabel = useMemo(() => {
    if (!summaryQuery.data?.month) return 'This Month'
    const [year, month] = summaryQuery.data.month.split('-').map(Number)
    return new Date(year, month - 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }, [summaryQuery.data?.month])

  const latestNetworth = networthQuery.data?.[networthQuery.data.length - 1]
  const previousNetworth =
    networthQuery.data?.[networthQuery.data.length - 2] ?? latestNetworth

  const netChange = latestNetworth && previousNetworth
    ? latestNetworth.netWorth - previousNetworth.netWorth
    : 0

  const isLoading = summaryQuery.isLoading || networthQuery.isLoading

  return (
    <div className="flex flex-1 flex-col gap-6 bg-slate-950/60 p-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Overview
        </p>
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-slate-500">{monthLabel}</p>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
          <header className="flex items-start justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cash balance
              </h2>
              <p className="mt-2 text-2xl font-semibold text-white">
                {latestNetworth ? compactCurrency(latestNetworth.cash) : '—'}
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
              Liquid
            </span>
          </header>
          <p className="mt-4 text-xs text-slate-500">
            Includes checking and high-yield savings accounts flagged as liquid.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
          <header className="flex items-start justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invested assets
              </h2>
              <p className="mt-2 text-2xl font-semibold text-white">
                {latestNetworth ? compactCurrency(latestNetworth.invested) : '—'}
              </p>
            </div>
            <span className="rounded-full border border-brand-500/40 bg-brand-500/10 px-2 py-1 text-xs font-medium text-brand-200">
              Long-term
            </span>
          </header>
          <p className="mt-4 text-xs text-slate-500">
            Includes brokerage, retirement, and crypto holdings that are tracked.
          </p>
        </article>

        <article className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
          <header className="flex items-start justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total spend
              </h2>
              <p className="mt-2 text-2xl font-semibold text-white">
                {summaryQuery.data ? currency(summaryQuery.data.totalSpend) : '—'}
              </p>
            </div>
            <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-200">
              Month-to-date
            </span>
          </header>
          <p className="mt-4 text-xs text-slate-500">
            {netChange >= 0 ? 'Up' : 'Down'} {currency(Math.abs(netChange))}
            {' '}vs previous period.
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card xl:col-span-2">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Net-worth curve</h2>
              <p className="text-xs text-slate-500">
                Last 12 months · {latestNetworth ? currency(latestNetworth.netWorth) : '—'} current
              </p>
            </div>
          </header>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={networthQuery.data ?? []}>
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2e5df4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2e5df4" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', { month: 'short' })
                } />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => compactCurrency(value)} />
                <Tooltip
                  cursor={{ stroke: '#334155', strokeWidth: 1 }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })
                  }
                  formatter={(value: number) => currency(value)}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#2e5df4"
                  fill="url(#netWorthGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Budgets</h2>
              <p className="text-xs text-slate-500">Month-to-date progress</p>
            </div>
          </header>
          <div className="mt-4 space-y-4">
            {summaryQuery.data?.budgets.map((budget) => {
              const progress = budget.cap === 0 ? 0 : Math.min(budget.spent / budget.cap, 1)
              return (
                <div key={budget.category}>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-slate-200">{budget.category}</span>
                    <span>
                      {currency(budget.spent)} / {currency(budget.cap)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${
                        progress > 0.9 ? 'bg-rose-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${Math.max(progress * 100, 8)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                    {percentage(progress)} used
                  </p>
                </div>
              )
            })}
            {!summaryQuery.data?.budgets.length ? (
              <p className="text-xs text-slate-500">
                Configure budgets in settings to unlock richer tracking.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/80 p-4 text-xs text-slate-500">
          Loading financial snapshot…
        </div>
      ) : null}
    </div>
  )
}
