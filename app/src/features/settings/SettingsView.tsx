import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { apiClient } from '../../lib/apiClient'
import { currency } from '../../lib/format'
import { useAppShellStore, type ThemeMode } from '../../stores/appShell'

const defaultBudgets = [
  { category: 'Housing', cap: 1800 },
  { category: 'Groceries', cap: 700 },
  { category: 'Dining', cap: 350 },
  { category: 'Transportation', cap: 250 },
  { category: 'Discretionary', cap: 500 },
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
  const queryClient = useQueryClient()
  const theme = useAppShellStore((state) => state.theme)
  const setTheme = useAppShellStore((state) => state.setTheme)

  // -- Queries --

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: apiClient.getAppSettings,
  })

  const budgetsQuery = useQuery({
    queryKey: ['budgets'],
    queryFn: apiClient.getBudgets,
  })

  const accounts = settingsQuery.data?.accounts
    // @ts-ignore
    ? JSON.parse(settingsQuery.data.accounts)
    : defaultAccounts as typeof defaultAccounts

  // -- Mutations --

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiClient.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const updateBudgetMutation = useMutation({
    mutationFn: ({ category, cap }: { category: string; cap: number }) =>
      apiClient.setBudget(category, cap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] }) // Affects dashboard
    },
  })

  // -- Sync Effects --

  useEffect(() => {
    if (settingsQuery.data?.theme) {
      setTheme(settingsQuery.data.theme as ThemeMode)
    }
  }, [settingsQuery.data?.theme, setTheme])

  // -- Handlers --

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme) // Optimistic update
    updateSettingMutation.mutate({ key: 'theme', value: newTheme })
  }

  const handleAccountToggle = (id: string) => {
    const newAccounts = accounts.map((acc: any) =>
      acc.id === id ? { ...acc, includeInLiquidity: !acc.includeInLiquidity } : acc,
    )
    updateSettingMutation.mutate({ key: 'accounts', value: JSON.stringify(newAccounts) })
  }

  const handleBudgetChange = (category: string, cap: number) => {
    updateBudgetMutation.mutate({ category, cap })
  }

  const isSystemTheme = theme === 'system'

  // Combine default with persisted budgets to ensure we show basics if DB is empty
  const displayBudgets = budgetsQuery.data?.length
    ? budgetsQuery.data
    : defaultBudgets

  // If user adds a new budget category in implementation plan? No, plan said:
  // "Change Housing budget to 2000... verify persistence"
  // I will keep the existing table structure.

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
        {/* Appearance Section */}
        <article className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
          <h2 className="text-sm font-semibold text-slate-100">Appearance</h2>
          <p className="text-xs text-slate-500">
            Follow your Mac&apos;s preference or lock the UI to a specific palette.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              aria-pressed={isSystemTheme}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${isSystemTheme
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
                  onClick={() => handleThemeChange(option.value)}
                  aria-pressed={isActive}
                  className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 text-left transition ${isActive
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
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${isActive
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

        {/* Accounts Section */}
        <article className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
          <h2 className="text-sm font-semibold text-slate-100">Accounts</h2>
          <p className="text-xs text-slate-500">
            Toggle which accounts are included in liquidity calculations.
          </p>
          <div className="mt-4 space-y-3">
            {accounts.map((account: any) => (
              <label
                key={account.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">{account.name}</p>
                  <p className="text-xs text-slate-500">
                    {account.includeInLiquidity ? 'Included in liquidity' : 'Excluded'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={account.includeInLiquidity}
                  onChange={() => handleAccountToggle(account.id)}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-brand-400"
                />
              </label>
            ))}
          </div>
        </article>
      </section>

      {/* Budgets Section */}
      <section className="rounded-2xl border border-slate-900 bg-slate-900/80 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Budgets</h2>
            <p className="text-xs text-slate-500">
              Caps per category for month-to-date spend tracking.
            </p>
          </div>
          {/* Add Category button hidden as we stick to fixed set for now or mocked add? 
              The previous implementation allowed adding mocked categories. 
              I'll omit it for now as backend doesn't support "adding" logic implicitly without explicit endpoint in plan,
              although setBudget upserts. So effectively we can add.
              I will re-add the button but make it use setBudget('New Category', 0).
          */}
          <button
            type="button"
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-100"
            onClick={() => {
              // Simple prompt for now or just generic name
              const name = prompt('Category Name:')
              if (name) updateBudgetMutation.mutate({ category: name, cap: 0 })
            }}
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
              {displayBudgets.map((budget) => (
                <tr key={budget.category} className="bg-slate-900/40">
                  <td className="px-4 py-3 text-sm">{budget.category}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      // Use local state? No, inputs are tricky with async updates.
                      // Ideally use a local intermediate state for input control or onBlur.
                      // For simplicity, using defaultValue and onBlur.
                      defaultValue={budget.cap}
                      onBlur={(e) => handleBudgetChange(budget.category, Number(e.target.value))}
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
