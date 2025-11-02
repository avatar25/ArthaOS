import { create } from 'zustand'

export type AppView = 'dashboard' | 'import' | 'settings'
export type ThemeMode = 'system' | 'light' | 'dark'

interface AppShellState {
  activeView: AppView
  theme: ThemeMode
  isLocked: boolean
  setActiveView: (view: AppView) => void
  setTheme: (theme: ThemeMode) => void
  lock: () => void
  unlock: () => void
}

export const useAppShellStore = create<AppShellState>((set) => ({
  activeView: 'dashboard',
  theme: 'system',
  isLocked: true,
  setActiveView: (view) => set({ activeView: view }),
  setTheme: (theme) => set({ theme }),
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
}))

export const resolveTheme = (theme: ThemeMode): 'light' | 'dark' => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}
