export const invokeNative = async <T,>(
  command: string,
  payload?: Record<string, unknown>,
): Promise<T | null> => {
  if (typeof window === 'undefined') {
    return null
  }

  const bridgeWindow = window as typeof window & {
    __TAURI__?: {
      core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<T> }
      tauri?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<T> }
    }
  }

  const invoke =
    bridgeWindow.__TAURI__?.core?.invoke ?? bridgeWindow.__TAURI__?.tauri?.invoke

  if (!invoke) {
    return null
  }

  try {
    return await invoke(command, payload)
  } catch (error) {
    console.warn(`[nativeBridge] invoke for ${command} failed`, error)
    return null
  }
}
