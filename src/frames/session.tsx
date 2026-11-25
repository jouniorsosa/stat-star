import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'

type SessionState = { admin: boolean | null; refresh: () => Promise<void> }
const SessionContext = createContext<SessionState>({ admin: null, refresh: async () => {} })

export function SessionProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<boolean | null>(null)
  const refresh = useCallback(async () => {
    try {
      const s = await api<{ admin: boolean }>('session')
      setAdmin(s.admin)
    } catch {
      setAdmin(false)
    }
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return <SessionContext.Provider value={{ admin, refresh }}>{children}</SessionContext.Provider>
}

export function useSession() {
  return useContext(SessionContext)
}

export function Login() {
  const { refresh } = useSession()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('login', { body: { password } })
      setPassword('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="login card" onSubmit={submit}>
      <h2 className="display">Sign in to manage</h2>
      <p className="muted">Only you need this. People who scan a frame never sign in.</p>
      <label className="field">
        <span>Password</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-red" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}

/** Shows children only when signed in; otherwise the sign-in form. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { admin } = useSession()
  if (admin === null) return <p className="muted pad">Loading…</p>
  if (!admin) return <div className="wrap pad"><Login /></div>
  return <>{children}</>
}
