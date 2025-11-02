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

export const SettingsView = () => {
  const theme = useAppShellStore((state) => state.theme)
  const setTheme = useAppShellStore((state) => state.setTheme)
  const [budgets, setBudgets] = useState(defaultBudgets)
  const [accounts, setAccounts] = useState(defaultAccounts)

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

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'System default' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 bg-slate-950/60 p-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Preferences
        </p>
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-slate-500">
          Tailor appearance, budgets, and account visibility. Changes persist locally in the encrypted vault.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
          <h2 className="text-sm font-semibold text-white">Appearance</h2>
          <p className="text-xs text-slate-500">
            Match macOS or lock the app to light/dark.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={`rounded-xl border px-4 py-3 text-sm transition ${
                  theme === option.value
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
          <h2 className="text-sm font-semibold text-white">Accounts</h2>
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
                  className="h-5 w-5 rounded border-slate-700 bg-slate-950 text-brand-500 focus:ring-brand-400"
                />
              </label>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Budgets</h2>
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
                      className="w-32 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-sm text-slate-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
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
