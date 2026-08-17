import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { User } from '../types'

/**
 * The lightweight customer step: confirm name + mobile. Completing it unlocks
 * the customer area for an account that doesn't yet have a customer profile.
 */
export default function CustomerProfile() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [mobile, setMobile] = useState(user?.mobile ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!fullName.trim() || !mobile.trim()) { setError('Please enter your name and mobile.'); return }
    setBusy(true)
    try {
      await api<User>('/me/customer-profile', 'POST', { fullName: fullName.trim(), mobile: mobile.trim() })
      await refresh()
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head"><h2>Complete your customer profile</h2></div>
      <p className="page-intro">Just your name and a mobile number — this unlocks requesting quotes as a customer.</p>
      <div className="md-panel" style={{ maxWidth: 460 }}>
        {error && <div className="msg err">{error}</div>}
        <form onSubmit={submit}>
          <label>Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <label style={{ marginTop: 12 }}>Mobile</label>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="04xx xxx xxx" />
          <button className="btn btn-amber btn-sm" type="submit" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </>
  )
}
