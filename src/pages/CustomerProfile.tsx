import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { User } from '../types'

/**
 * The lightweight customer step: confirm name + mobile, and optionally the
 * address your jobs usually happen at. Completing it unlocks the customer area
 * for an account that doesn't yet have a customer profile.
 */
export default function CustomerProfile() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [mobile, setMobile] = useState(user?.mobile ?? '')
  const [address, setAddress] = useState(user?.registeredAddress ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!fullName.trim() || !mobile.trim()) { setError('Please enter your name and mobile.'); return }
    setBusy(true)
    try {
      await api<User>('/me/customer-profile', 'POST', {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        registeredAddress: address.trim() || null,
      })
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
      <p className="page-intro">Your name and a mobile number unlock requesting quotes. An address is optional — we use it to fill in the job address when you request a quote.</p>
      <div className="md-panel" style={{ maxWidth: 460 }}>
        {error && <div className="msg err">{error}</div>}
        <form onSubmit={submit}>
          <label>Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <label style={{ marginTop: 12 }}>Mobile</label>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="04xx xxx xxx" />
          <label style={{ marginTop: 12 }}>Your address (optional)</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Station St, Pakenham VIC 3810" />
          <p className="field-hint">Used to fill in the job address on a quote request. You can always type a different address for a particular job.</p>
          <button className="btn btn-amber btn-sm" type="submit" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </>
  )
}
