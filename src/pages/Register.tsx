import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!fullName || !email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setBusy(true)
    try {
      await register(fullName, email, password)
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
        <h2>Create your account</h2>
        <div className="card-sub">Join Jobby-Connect in a few seconds.</div>
        {error && <div className="msg err">{error}</div>}

        <label>Full name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" autoComplete="name" />

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />

        <button className="btn btn-amber btn-block" type="submit" disabled={busy} style={{ marginTop: 20 }}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <div className="swap">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </form>
    </div>
  )
}
