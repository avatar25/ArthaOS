import { useState } from 'react'
import { invokeNative } from '../../lib/nativeBridge'
import { useAppShellStore } from '../../stores/appShell'

export const LockScreen = () => {
  const unlockStore = useAppShellStore((state) => state.unlock)
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle')
  const [message, setMessage] = useState<string>('Secure local vault')

  const handleUnlock = async () => {
    setStatus('pending')
    setMessage('Authenticating with macOS…')
    const response = await invokeNative<{ ok: boolean; message?: string }>('unlock_vault')

    if (response?.ok) {
      setMessage('Vault unlocked')
      setStatus('idle')
      unlockStore()
      return
    }

    setStatus('error')
    setMessage(response?.message ?? 'Unlock failed. Try again.')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-slate-100">
      <div className="rounded-3xl border border-slate-900/60 bg-slate-900/80 px-12 py-10 text-center shadow-card backdrop-blur">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-400">
            Artha OS
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Unlock your vault</h1>
          <p className="mt-2 text-sm text-slate-400">{message}</p>
        </div>
        <button
          type="button"
          onClick={handleUnlock}
          disabled={status === 'pending'}
          className="inline-flex items-center justify-center rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:bg-brand-500/50"
        >
          {status === 'pending' ? 'Requesting Touch ID…' : 'Unlock with Touch ID'}
        </button>
        {status === 'error' ? (
          <p className="mt-3 text-xs text-rose-400">Authentication required to proceed.</p>
        ) : null}
      </div>
      <p className="text-xs text-slate-600">
        Local-only mode. No network calls. Key material stays on device.
      </p>
    </div>
  )
}
