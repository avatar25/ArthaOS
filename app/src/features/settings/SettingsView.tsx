import { useState } from 'react'
import { useAppShellStore, type ThemeMode } from '../../stores/appShell'
import { currency } from '../../lib/format'

const defaultBudgets = [
  { category: 'Housing', cap: 1800, include: true },
  { category: 'Groceries', cap: 700, include: true },
  { category: 'Dining', cap: 350, include: true },
  { category: 'Transportation', cap: 250, include: true },
]

const defaultAccounts = [
  { id: 'chk-001', name: 'First Republic Checking', includeInLiquidity: true },
  { id: 'sav-001', name: 'Ally Savings', includeInLiquidity: true },
  { id: 'inv-001', name: 'Fidelity Brokerage', includeInLiquidity: false },
]

type ExplicitTheme = Exclude<ThemeMode, 'system'>

type ThemeCard = {
  value: ExplicitTheme
  label: string
  description: string
  preview: string[]
}

const themeCards: ThemeCard[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Crisp whites with soft shadows and SF-inspired grays.',
    preview: ['#f8fafc', '#e2e8f0', '#0f172a'],
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Deep slate panels with electric blue accents.',
    preview: ['#020617', '#0f172a', '#38bdf8'],
  },
  {
    value: 'colorful',
    label: 'Colorful',
    description: 'Aurora gradients and playful neon highlights.',
    preview: ['#4c1d95', '#ec4899', '#fde68a'],
  },
]

export const SettingsView = () => {
  const theme = useAppShellStore((state) => state.theme)
  const setTheme = useAppShellStore((state) => state.setTheme)
  const [budgets, setBudgets] = useState(defaultBudgets)
  const [accounts, setAccounts] = useState(defaultAccounts)
  const isSystemTheme = theme === 'system'

  const updateBudgetCap = (category: string, cap: number) => {
    setBudgets((prev) =>
      prev.map((budget) => (budget.category === category ? { ...budget, cap } : budget)),
    )
  }

  const toggleAccount = (id: string) => {
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === id
          ? { ...account, includeInLiquidity: !account.includeInLiquidity }
          : account,
      ),
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 bg-slate-950/60 p-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Preferences
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500">
          Tailor appearance, budgets, and account visibility. Changes persist locally in the encrypted vault.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
          <h2 className="text-sm font-semibold text-slate-100">Appearance</h2>
          <p className="text-xs text-slate-500">
            Follow your Mac&apos;s preference or lock the UI to a specific palette.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme('system')}
              aria-pressed={isSystemTheme}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                isSystemTheme
                  ? 'border-brand-500 bg-brand-500/10 text-slate-100'
                  : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-100'
              }`}
            >
              Match macOS
            </button>
            <span className="text-[11px] text-slate-500">
              Adapts automatically when macOS switches between light and dark.
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {themeCards.map((option) => {
              const isActive = theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={isActive}
                  className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                    isActive
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{option.label}</p>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </div>
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        isActive
                          ? 'bg-brand-500 text-white'
                          : 'border border-slate-800 text-slate-500'
                      }`}
                    >
                      {isActive ? '✓' : option.label.charAt(0)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {option.preview.map((color, index) => (
                      <span
                        key={`${option.value}-${index}`}
                        className="h-8 flex-1 rounded-full"
                        style={{ background: color }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
          <h2 className="text-sm font-semibold text-slate-100">Accounts</h2>
          <p className="text-xs text-slate-500">
            Toggle which accounts are included in liquidity calculations.
          </p>
          <div className="mt-4 space-y-3">
            {accounts.map((account) => (
              <label
                key={account.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">{account.name}</p>
                  <p className="text-xs text-slate-500">{account.includeInLiquidity ? 'Included in liquidity' : 'Excluded'}</p>
                </div>
                <input
                  type="checkbox"
                  checked={account.includeInLiquidity}
                  onChange={() => toggleAccount(account.id)}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-brand-400"
                />
              </label>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Budgets</h2>
            <p className="text-xs text-slate-500">
              Caps per category for month-to-date spend tracking.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-100"
            onClick={() =>
              setBudgets((prev) => [
                ...prev,
                { category: `New Category ${prev.length + 1}`, cap: 0, include: true },
              ])
            }
          >
            + Add category
          </button>
        </div>
        <div className="mt-4 overflow-auto rounded-xl border border-slate-900">
          <table className="min-w-full divide-y divide-slate-900 text-left text-sm text-slate-100">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Monthly cap</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {budgets.map((budget) => (
                <tr key={budget.category} className="bg-slate-900/40">
                  <td className="px-4 py-3 text-sm">{budget.category}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      value={budget.cap}
                      onChange={(event) => updateBudgetCap(budget.category, Number(event.target.value))}
                      className="w-32 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-sm text-slate-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">
                    {currency(budget.cap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
