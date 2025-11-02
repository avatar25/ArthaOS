import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { QuickAddModal } from './components/QuickAddModal'
import { DashboardView } from './features/dashboard/DashboardView'
import { ImportView } from './features/import/ImportView'
import { SettingsView } from './features/settings/SettingsView'
import { LockScreen } from './features/lock/LockScreen'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { resolveTheme, useAppShellStore, type AppView } from './stores/appShell'

const ViewRenderer = ({ view }: { view: AppView }) => {
  switch (view) {
    case 'import':
      return <ImportView />
    case 'settings':
      return <SettingsView />
    case 'dashboard':
    default:
      return <DashboardView />
  }
}

const AppShell = () => {
  const activeView = useAppShellStore((state) => state.activeView)
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <ViewRenderer view={activeView} />
      <QuickAddModal />
    </div>
  )
}

const App = () => {
  const isLocked = useAppShellStore((state) => state.isLocked)
  const theme = useAppShellStore((state) => state.theme)

  useKeyboardShortcuts()

  useEffect(() => {
    const applyTheme = () => {
      const resolved = resolveTheme(theme)
      document.body.dataset.theme = resolved
    }

    applyTheme()

    if (theme === 'system') {
      const matcher = window.matchMedia('(prefers-color-scheme: dark)')
      matcher.addEventListener('change', applyTheme)
      return () => matcher.removeEventListener('change', applyTheme)
    }

    return undefined
  }, [theme])

  if (isLocked) {
    return <LockScreen />
  }

  return <AppShell />
}

export default App
