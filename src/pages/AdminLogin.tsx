import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../adminAuth'

export default function AdminLogin() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await login(email.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login-shell">
      <div className="admin-login-card">
        <div className="admin-brand">
          <span className="brand-mark">J</span>
          <div>
            <div className="admin-brand-name">JOBBY-CONNECT</div>
            <div className="admin-brand-sub">Admin Portal</div>
          </div>
        </div>
        <p className="admin-login-intro">Authorised administrators only. Sign in with your JobbyConnect email.</p>
        {error && <div className="msg err">{error}</div>}
        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@jobbyconnect.com.au" autoFocus />
          <label style={{ marginTop: 12 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn btn-amber" type="submit" disabled={busy} style={{ marginTop: 18, width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
