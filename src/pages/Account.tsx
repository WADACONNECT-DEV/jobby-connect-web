import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Field, PasswordField } from '../components/landing/AuthLayout'
import type { AuthResponse } from '../types'

/**
 * Account settings (redesign step 8, owner's account design).
 *
 * Still the home of the "Become a provider" entry point (UAT Round 1 §4.1).
 * The four provider states keep their wording and their /provider links.
 *
 * New here and connected:
 *  - Change password (Functional Spec §2.9): POST /me/password. Signs out other
 *    sessions; this browser switches to the fresh token the call returns.
 *  - Change login email (owner decision 3 Nov 2026 §3): POST /me/email emails a
 *    confirm link to the new address; nothing changes until it's used.
 */
export default function Account() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const hasProvider = user?.hasProviderProfile ?? false
  const approval = user?.providerApprovalStatus ?? null
  const name = user?.fullName ?? ''

  // "Your details were updated." after saving the details form (owner-approved).
  const [saved, setSaved] = useState(Boolean((location.state as { updated?: boolean } | null)?.updated))
  useEffect(() => {
    if (!saved) return
    // Don't show it again on refresh or Back.
    navigate(location.pathname, { replace: true, state: null })
    const t = window.setTimeout(() => setSaved(false), 6000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [panel, setPanel] = useState<'none' | 'password' | 'email'>('none')

  return (
    <div className="ac">
      <section className="ac-band">
        <div className="ac-band-in">
          <span className="ac-initials" aria-hidden="true">{initials(name)}</span>
          <div>
            <h1 className="ac-name">
              {name || 'Your account'}
              {user?.customerRef && <code className="ac-pill">{user.customerRef}</code>}
              {user?.providerRef && <code className="ac-pill">{user.providerRef}</code>}
            </h1>
            <p className="ac-band-sub">Your details, sign-in and how you use Jobby-Connect.</p>
          </div>
        </div>
      </section>

      <div className="ac-wrap">
        <button className="app-back" onClick={() => navigate(-1)}>← Back</button>

        {saved && <div className="ac-msg is-ok" role="status">Your details were updated.</div>}

        <div className="ac-grid">
          <section className="ac-card">
            <div className="ac-card-head">
              <h2><UserIcon /> Your details</h2>
              <button className="mt-btn-ghost" onClick={() => navigate('/customer-profile')}>Edit details</button>
            </div>
            <Row icon={<UserIcon small />} label="Name">{name || <span className="ac-empty">Not added</span>}</Row>
            <Row icon={<PhoneIcon />} label="Mobile">{user?.mobile ? showMobile(user.mobile) : <span className="ac-empty">Not added</span>}</Row>
            <Row icon={<PinIcon />} label="Address">{user?.registeredAddress || <span className="ac-empty">Not added</span>}</Row>
          </section>

          <section className="ac-card">
            <div className="ac-card-head">
              <h2><LockIcon /> Sign-in &amp; security</h2>
            </div>
            <Row icon={<MailIcon />} label="Email">
              <span className="ac-val-line">
                <span className="ac-break">{user?.email}</span>
                <button className="mt-btn-ghost ac-small" onClick={() => setPanel(panel === 'email' ? 'none' : 'email')}>
                  Change email
                </button>
              </span>
            </Row>
            <Row icon={<LockIcon small />} label="Password">
              <span className="ac-val-line">
                <span aria-label="Password hidden">••••••••••</span>
                <button className="mt-btn-ghost ac-small" onClick={() => setPanel(panel === 'password' ? 'none' : 'password')}>
                  Change password
                </button>
              </span>
            </Row>
            <Row icon={<IdIcon />} label="Your IDs">
              <span className="ac-ids">
                {user?.customerRef && <CopyId value={user.customerRef} />}
                {user?.providerRef && <CopyId value={user.providerRef} />}
              </span>
            </Row>

            {panel === 'password' && <ChangePassword onDone={() => setPanel('none')} />}
            {panel === 'email' && <ChangeEmail currentEmail={user?.email ?? ''} onDone={() => setPanel('none')} />}
          </section>
        </div>

        <ProviderCard hasProvider={hasProvider} approval={approval} onGo={() => navigate('/provider')} />
      </div>
    </div>
  )
}

/* ---------- details rows ---------- */

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="ac-row">
      <span className="ac-row-ico">{icon}</span>
      <span className="ac-row-label">{label}</span>
      <span className="ac-row-val">{children}</span>
    </div>
  )
}

/** An ID pill with a Copy link that says "Copied" for 2 seconds. */
function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Older browsers / no permission: fall back to a hidden text box.
      const ta = document.createElement('textarea')
      ta.value = value
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* nothing more to try */ }
      ta.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }
  return (
    <span className="ac-id">
      <code className="ac-pill is-light">{value}</code>
      <button type="button" className="ac-copy" onClick={copy} aria-live="polite">{copied ? 'Copied' : 'Copy'}</button>
    </span>
  )
}

/* ---------- change password ---------- */

function ChangePassword({ onDone }: { onDone: () => void }) {
  const { adoptToken } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!current || !next || !confirm) { setError('Please fill in all three fields.'); return }
    if (next.length < 8) { setError('Password must be at least 8 characters'); return }
    if (next !== confirm) { setError('The two new passwords do not match.'); return }
    setBusy(true)
    try {
      const res = await api<AuthResponse>('/me/password', 'POST', { currentPassword: current, newPassword: next })
      await adoptToken(res)
      setDone(true)
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change your password.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="ac-panel">
        <div className="ac-msg is-ok" role="status">Password changed. You've been logged out on your other devices.</div>
        <button className="mt-btn-ghost ac-small" onClick={onDone}>Close</button>
      </div>
    )
  }

  return (
    <form className="ac-panel lp lp-customer" onSubmit={submit} noValidate>
      <h3 className="ac-panel-title">Change password</h3>
      {error && <div className="ac-msg is-err" role="alert">{error}</div>}
      <PasswordField id="pw-current" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordField id="pw-new" label="New password" value={next} onChange={setNext} autoComplete="new-password" hint="At least 8 characters" />
      <PasswordField id="pw-confirm" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <div className="ac-panel-actions">
        <button type="button" className="mt-btn-ghost" onClick={onDone}>Cancel</button>
        <button type="submit" className="mt-continue" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </div>
    </form>
  )
}

/* ---------- change email ---------- */

function ChangeEmail({ currentEmail, onDone }: { currentEmail: string; onDone: () => void }) {
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const address = newEmail.trim()
    if (!address || !password) { setError('Please enter your new email and your password.'); return }
    setBusy(true)
    try {
      await api<void>('/me/email', 'POST', { newEmail: address, currentPassword: password })
      setSentTo(address)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the email change.')
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <div className="ac-panel">
        <div className="ac-msg is-ok" role="status">
          We've sent a confirmation link to <strong>{sentTo}</strong>. Your login email changes when you open it
          (it works for 24 hours). Until then, keep logging in with {currentEmail}.
        </div>
        <button className="mt-btn-ghost ac-small" onClick={onDone}>Close</button>
      </div>
    )
  }

  return (
    <form className="ac-panel lp lp-customer" onSubmit={submit} noValidate>
      <h3 className="ac-panel-title">Change login email</h3>
      <p className="ac-panel-sub">We'll email a link to the new address. Your email only changes once you open it.</p>
      {error && <div className="ac-msg is-err" role="alert">{error}</div>}
      <Field id="em-new" label="New email address" type="email" value={newEmail} onChange={setNewEmail}
        placeholder="you@example.com" autoComplete="email" inputMode="email" />
      <PasswordField id="em-password" label="Your password" value={password} onChange={setPassword} autoComplete="current-password" />
      <div className="ac-panel-actions">
        <button type="button" className="mt-btn-ghost" onClick={onDone}>Cancel</button>
        <button type="submit" className="mt-continue" disabled={busy}>{busy ? 'Sending…' : 'Send confirmation link'}</button>
      </div>
    </form>
  )
}

/* ---------- offering your services (the four states, wording as before) ---------- */

function ProviderCard({ hasProvider, approval, onGo }: { hasProvider: boolean; approval: string | null; onGo: () => void }) {
  const step = !hasProvider ? 1 : approval === 'APPROVED' ? 4 : 2
  const steps = (
    <ol className="ac-steps">
      {['Set up your profile', 'Admin review', 'Start quoting'].map((label, i) => {
        const n = i + 1
        const state = n < step ? 'is-done' : n === step ? 'is-current' : ''
        return (
          <li key={label} className={state}>
            <span className="ac-step-n">{n < step ? '✓' : n}</span>{label}
          </li>
        )
      })}
    </ol>
  )

  return (
    <section className="ac-card ac-provider">
      <div className="ac-provider-main">
        <h2><CaseIcon /> Offering your services</h2>

        {!hasProvider && (
          <>
            <p className="ac-text">
              Work in a trade or service? Set up a provider profile to receive quote requests from
              customers. An admin reviews your application before you appear in search.
            </p>
            {steps}
          </>
        )}

        {hasProvider && approval === 'PENDING' && (
          <>
            {steps}
            <div className="app-banner is-pending">
              <span><strong>Your provider application is pending approval.</strong> You can keep editing your
                details. Once an admin approves it, your Provider tab appears on the dashboard.</span>
            </div>
            <div><button className="mt-btn-ghost" onClick={onGo}>Edit provider details</button></div>
          </>
        )}

        {hasProvider && approval === 'REJECTED' && (
          <>
            <div className="app-banner is-rejected">
              <span><strong>Your provider application wasn't approved.</strong> Review your details and
                resubmit, or contact support if you think this is a mistake.</span>
            </div>
            <div><button className="mt-btn-ghost" onClick={onGo}>Review provider details</button></div>
          </>
        )}

        {hasProvider && approval === 'APPROVED' && (
          <>
            {steps}
            <p className="ac-text">You're set up as a provider. Your Provider tab is on the dashboard.</p>
            <div><button className="mt-btn-ghost" onClick={onGo}>Provider profile</button></div>
          </>
        )}
      </div>

      {!hasProvider && (
        <div className="ac-become">
          <CaseIcon big />
          <strong>Become a provider</strong>
          <span>Same account, same login — your provider area sits beside this one.</span>
          <button className="mt-continue" onClick={onGo}>Become a provider →</button>
        </div>
      )}
    </section>
  )
}

/* ---------- helpers ---------- */

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
}

/** "0498000204" -> "0498 000 204"; anything else as stored. Display only. */
function showMobile(m: string): string {
  const digits = m.replace(/\s+/g, '')
  return /^04\d{8}$/.test(digits) ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : m
}

/* ---------- icons (decorative) ---------- */

const Svg = ({ size = 20, children }: { size?: number; children: ReactNode }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const UserIcon = ({ small = false }: { small?: boolean }) => (
  <Svg size={small ? 17 : 21}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Svg>
)
const LockIcon = ({ small = false }: { small?: boolean }) => (
  <Svg size={small ? 17 : 21}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Svg>
)
const PhoneIcon = () => <Svg size={17}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Svg>
const PinIcon = () => <Svg size={17}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></Svg>
const MailIcon = () => <Svg size={17}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Svg>
const IdIcon = () => <Svg size={17}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h6M7 14h4" /></Svg>
const CaseIcon = ({ big = false }: { big?: boolean }) => (
  <Svg size={big ? 32 : 21}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></Svg>
)
