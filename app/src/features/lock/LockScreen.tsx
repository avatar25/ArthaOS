import { FormEvent, useState } from 'react'
import { useAppShellStore } from '../../stores/appShell'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const LockScreen = () => {
  const unlockStore = useAppShellStore((state) => state.unlock)
  const authMethod = useAppShellStore((state) => state.authMethod)
  const setAuthMethod = useAppShellStore((state) => state.setAuthMethod)
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle')
  const [message, setMessage] = useState<string>('Secure local vault')
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const handleUnlock = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()

    if (status === 'pending') {
      return
    }

    if (authMethod === 'basic' && (!username || !password)) {
      setStatus('error')
      setMessage('Enter any username and password to continue.')
      return
    }

    setStatus('pending')
    setMessage(
      authMethod === 'touch'
        ? 'Simulating Touch ID…'
        : 'Checking username/password…',
    )
    await sleep(800)
    setStatus('idle')
    setMessage('Vault unlocked')
    setUsername('')
    setPassword('')
    unlockStore()
  }

  const toggleAuthMethod = (method: typeof authMethod) => {
    if (method === authMethod) {
      return
    }

    setStatus('idle')
    setMessage(
      method === 'touch'
        ? 'Secure local vault'
        : 'Use any test credentials to unlock.',
    )
    setUsername('')
    setPassword('')
    setAuthMethod(method)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-slate-100">
      <div className="rounded-3xl border border-slate-900/60 bg-slate-900/80 px-12 py-10 text-center shadow-card backdrop-blur">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-400">
            Artha OS
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-100">Unlock your vault</h1>
          <p className="mt-2 text-sm text-slate-400">{message}</p>
        </div>
        <div className="mb-6 inline-flex rounded-full border border-slate-800 bg-slate-900/80 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => toggleAuthMethod('touch')}
            className={`rounded-full px-4 py-2 transition ${
              authMethod === 'touch'
                ? 'bg-brand-500 text-white shadow-card'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Touch ID
          </button>
          <button
            type="button"
            onClick={() => toggleAuthMethod('basic')}
            className={`rounded-full px-4 py-2 transition ${
              authMethod === 'basic'
                ? 'bg-brand-500 text-white shadow-card'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Username + Pass
          </button>
        </div>

        {authMethod === 'touch' ? (
          <button
            type="button"
            onClick={() => handleUnlock()}
            disabled={status === 'pending'}
            className="inline-flex items-center justify-center rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:bg-brand-500/50"
          >
            {status === 'pending' ? 'Requesting Touch ID…' : 'Unlock with Touch ID'}
          </button>
        ) : (
          <form className="flex flex-col gap-3 text-left" onSubmit={handleUnlock}>
            <label className="flex flex-col text-xs font-medium text-slate-400">
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
                placeholder="demo@artha"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-400">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
                placeholder="•••••••"
              />
            </label>
            <button
              type="submit"
              disabled={status === 'pending'}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:bg-brand-500/50"
            >
              {status === 'pending' ? 'Checking…' : 'Unlock with credentials'}
            </button>
          </form>
        )}

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
