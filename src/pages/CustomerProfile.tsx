import { FormEvent, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { User } from '../types'

/**
 * The customer details form (redesign step 8, owner's account design).
 *
 * One page, two cases, chosen from user.customerProfileComplete:
 *  - first time: "Complete your customer profile" → Save and continue → /home,
 *    exactly as before. Completing it unlocks the customer area.
 *  - editing:    "Edit your details" → Save changes → back to /account with a
 *    "Your details were updated." bar (owner-approved), or Cancel → back.
 *
 * Same fields, same validation message, same save call either way.
 */
export default function CustomerProfile() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const editing = user?.customerProfileComplete ?? false
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
      if (editing) navigate('/account', { state: { updated: true } })
      else navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt cp">
      {editing && <button type="button" className="app-back" onClick={() => navigate(-1)}>← Back</button>}
      <div className="mt-head">
        <div className="mt-head-copy">
          <PersonIcon big />
          <div>
            <h1 className="mt-title">{editing ? 'Edit your details' : 'Complete your customer profile'}</h1>
            <p className="mt-sub">
              {editing
                ? 'Keep your name, mobile and address up to date.'
                : 'Your name and a mobile number unlock requesting quotes. An address is optional — we use it to fill in the job address when you request a quote.'}
            </p>
          </div>
        </div>
      </div>

      <form className="cp-card" onSubmit={submit} noValidate>
        {error && <div className="ac-msg is-err" role="alert">{error}</div>}

        <label className="mt-field">
          <span><Ico><PersonIcon /></Ico>FULL NAME</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </label>
        <label className="mt-field">
          <span><Ico><PhoneIcon /></Ico>MOBILE</span>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="04xx xxx xxx" inputMode="tel" autoComplete="tel" />
        </label>
        <label className="mt-field">
          <span><Ico><PinIcon /></Ico>YOUR ADDRESS <em>(OPTIONAL)</em></span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Station St, Pakenham VIC 3810" autoComplete="street-address" />
        </label>
        <p className="cp-hint">Used to fill in the job address on a quote request. You can always type a different address for a particular job.</p>

        <div className="cp-actions">
          {editing && <button type="button" className="mt-btn-ghost" onClick={() => navigate(-1)} disabled={busy}>Cancel</button>}
          <button className="mt-continue" type="submit" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Save and continue'}
          </button>
        </div>
      </form>
    </div>
  )
}

const Ico = ({ children }: { children: ReactNode }) => <span className="cp-ico">{children}</span>

const Svg = ({ size = 16, children }: { size?: number; children: ReactNode }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const PersonIcon = ({ big = false }: { big?: boolean }) => (
  <Svg size={big ? 44 : 16}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Svg>
)
const PhoneIcon = () => <Svg><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Svg>
const PinIcon = () => <Svg><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></Svg>
