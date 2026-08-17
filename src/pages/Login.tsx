import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setBusy(true)
    try {
      await login(email, password)
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center">
      <form className="card" onSubmit={onSubmit}>
        <h2>Welcome back</h2>
        <div className="card-sub">Log in to your Jobby-Connect account.</div>
        {error && <div className="msg err">{error}</div>}

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" />

        <button className="btn btn-amber btn-block" type="submit" disabled={busy} style={{ marginTop: 20 }}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <div className="swap">
          New here? <Link to="/register">Create an account</Link>
        </div>
      </form>
    </div>
  )
}
