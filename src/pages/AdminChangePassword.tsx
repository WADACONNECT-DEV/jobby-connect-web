import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function AdminChangePassword() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (next !== confirm) { setError('New passwords do not match.'); return }
    if (next.length < 10) { setError('New password must be at least 10 characters.'); return }
    setBusy(true)
    try {
      await api<void>('/admin/admins/me/password', 'POST', { currentPassword: current, newPassword: next })
      setDone(true)
      setCurrent(''); setNext(''); setConfirm('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <h2>Change my password</h2>
        <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/admin')}>← Dashboard</button>
      </div>
      <div className="md-panel" style={{ maxWidth: 460 }}>
        {done && <div className="msg ok">Password changed.</div>}
        {error && <div className="msg err">{error}</div>}
        <form onSubmit={submit}>
          <label>Current password</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <label style={{ marginTop: 12 }}>New password</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          <label style={{ marginTop: 12 }}>Confirm new password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button className="btn btn-amber btn-sm" type="submit" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </div>
    </>
  )
}
