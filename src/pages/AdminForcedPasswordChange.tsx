import { FormEvent, useState } from 'react'
import { api } from '../api'
import { useAdminAuth } from '../adminAuth'
import type { AdminUser } from '../types'

/**
 * Shown as a hard gate when the signed-in admin is still on a system-issued
 * password (bootstrap default or a temp password). Nothing else in the portal
 * is reachable until they set their own password.
 */
export default function AdminForcedPasswordChange() {
  const { admin, updateAdmin, logout } = useAdminAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (next !== confirm) { setError('New passwords do not match.'); return }
    if (next.length < 10) { setError('New password must be at least 10 characters.'); return }
    setBusy(true)
    try {
      const updated = await api<AdminUser>('/admin/admins/me/password', 'POST', {
        currentPassword: current,
        newPassword: next,
      })
      updateAdmin(updated) // clears the gate
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="forced-pw">
      <div className="forced-pw-card">
        <div className="forced-pw-brand">JOBBY-CONNECT · ADMIN</div>
        <h2>Set a new password</h2>
        <p className="forced-pw-note">
          You're signed in with a temporary password. For security, you must set your own password
          before you can continue{admin ? `, ${admin.fullName.split(' ')[0]}` : ''}.
        </p>
        {error && <div className="msg err">{error}</div>}
        <form onSubmit={submit}>
          <label>Current (temporary) password</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
          <label style={{ marginTop: 12 }}>New password</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          <label style={{ marginTop: 12 }}>Confirm new password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button className="btn btn-amber" type="submit" disabled={busy} style={{ marginTop: 16, width: '100%' }}>
            {busy ? 'Saving…' : 'Set password and continue'}
          </button>
        </form>
        <button className="forced-pw-logout" onClick={logout}>Sign out</button>
      </div>
    </div>
  )
}
