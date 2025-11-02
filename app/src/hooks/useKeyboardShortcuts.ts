import { useEffect } from 'react'
import { useAppShellStore } from '../stores/appShell'
import { useQuickAddStore } from '../stores/quickAdd'

export const useKeyboardShortcuts = () => {
  const setActiveView = useAppShellStore((state) => state.setActiveView)
  const openQuickAdd = useQuickAddStore((state) => state.open)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey
      if (!isMeta) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'i') {
        event.preventDefault()
        setActiveView('import')
      }

      if (key === 'k') {
        event.preventDefault()
        openQuickAdd()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openQuickAdd, setActiveView])
}
