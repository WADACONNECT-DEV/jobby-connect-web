import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { IconInput } from '../components/AuthParts'
import { PinIcon } from '../components/PageParts'
import { PersonIcon, PhoneIcon } from '../components/AccountParts'
import type { User } from '../types'

/**
 * The lightweight customer step: confirm name + mobile, and optionally the
 * address your jobs usually happen at. Completing it unlocks the customer area
 * for an account that doesn't yet have a customer profile. The same form edits
 * those details later, from Account.
 */
export default function CustomerProfile() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [mobile, setMobile] = useState(user?.mobile ?? '')
  const [address, setAddress] = useState(user?.registeredAddress ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Wording only. Fixed on arrival: refresh() after a first-time save flips
  // customerProfileComplete to true before the redirect below.
  const [editing] = useState(user?.customerProfileComplete ?? false)

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
      // Owner-approved exception (HANDOFF-account): editing returns to Account
      // with a confirmation; first-time completion still goes to /home.
      if (editing) navigate('/account', { replace: true, state: { detailsUpdated: true } })
      else navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ac ac-form-page">
      <form className="ac-card ac-form" onSubmit={submit}>
        <div className="ac-form-head">
          <h2>{editing ? 'Edit your details' : 'Complete your customer profile'}</h2>
          <p>
            {editing
              ? 'Keep your name, mobile and address up to date.'
              : 'Your name and a mobile number unlock requesting quotes. An address is optional — we use it to fill in the job address when you request a quote.'}
          </p>
        </div>

        {error && <div className="pg-error" role="alert">{error}</div>}

        <IconInput
          id="cp-name"
          label="Full name"
          icon={<PersonIcon />}
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <IconInput
          id="cp-mobile"
          label="Mobile"
          icon={<PhoneIcon />}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="04xx xxx xxx"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
        <IconInput
          id="cp-address"
          label="Your address (optional)"
          icon={<PinIcon />}
          autoComplete="street-address"
          placeholder="e.g. 12 Station St, Pakenham VIC 3810"
          hint="Used to fill in the job address on a quote request. You can always type a different address for a particular job."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div className="ac-form-actions">
          {editing && (
            <button type="button" className="pg-btn pg-btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          )}
          <button type="submit" className="pg-btn pg-btn-yellow" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Save and continue'}
          </button>
        </div>
      </form>
    </div>
  )
}
