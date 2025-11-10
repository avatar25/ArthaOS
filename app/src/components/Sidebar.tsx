import { useMemo } from 'react'
import { useAppShellStore, type AppView } from '../stores/appShell'
import { useQuickAddStore } from '../stores/quickAdd'

type NavItem = {
  id: AppView
  label: string
  shortcut?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'import', label: 'Import', shortcut: '⌘I' },
  { id: 'settings', label: 'Settings' },
]

export const Sidebar = () => {
  const activeView = useAppShellStore((state) => state.activeView)
  const setActiveView = useAppShellStore((state) => state.setActiveView)
  const lock = useAppShellStore((state) => state.lock)
  const openQuickAdd = useQuickAddStore((state) => state.open)

  const navButtons = useMemo(
    () =>
      NAV_ITEMS.map((item) => {
        const isActive = item.id === activeView
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveView(item.id)}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-slate-800 text-slate-100 shadow-card'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
            }`}
          >
            <span>{item.label}</span>
            {item.shortcut ? (
              <span className="text-xs text-slate-500">{item.shortcut}</span>
            ) : null}
          </button>
        )
      }),
    [activeView, setActiveView],
  )

  return (
    <aside className="sidebar-surface flex w-64 flex-col gap-6 border-r border-slate-900 bg-slate-950/80 p-6 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-300">Artha OS</p>
          <p className="text-xs text-slate-500">M1 Local Vault</p>
        </div>
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </div>

      <nav className="flex flex-1 flex-col gap-2">{navButtons}</nav>

      <div className="space-y-2">
        <button
          type="button"
          onClick={openQuickAdd}
          className="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          ⌘K Quick Add
        </button>
        <button
          type="button"
          onClick={lock}
          className="w-full rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-400 hover:border-slate-700 hover:text-slate-100"
        >
          Lock Vault
        </button>
      </div>
    </aside>
  )
}
