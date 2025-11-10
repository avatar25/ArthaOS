import { create } from 'zustand'

export type AppView = 'dashboard' | 'import' | 'settings'
export type ThemeMode = 'system' | 'light' | 'dark' | 'colorful'
export type AuthMethod = 'touch' | 'basic'

interface AppShellState {
  activeView: AppView
  theme: ThemeMode
  isLocked: boolean
  authMethod: AuthMethod
  setActiveView: (view: AppView) => void
  setTheme: (theme: ThemeMode) => void
  lock: () => void
  unlock: () => void
  setAuthMethod: (method: AuthMethod) => void
}

export const useAppShellStore = create<AppShellState>((set) => ({
  activeView: 'dashboard',
  theme: 'system',
  isLocked: false,
  authMethod: 'touch',
  setActiveView: (view) => set({ activeView: view }),
  setTheme: (theme) => set({ theme }),
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
  setAuthMethod: (method) => set({ authMethod: method }),
}))

export const resolveTheme = (theme: ThemeMode): 'light' | 'dark' | 'colorful' => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}
