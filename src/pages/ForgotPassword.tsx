import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { AuthShell, Field, FormError, FormHead, IconMail, SubmitButton } from '../components/landing/AuthLayout'

/**
 * Forgot password — redesign step 2.
 *
 * Asks the API to email a reset link. The API answers the same way whether or
 * not the address has an account, so the confirmation screen says "if an
 * account exists" and never confirms either way.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const address = email.trim()
    if (!address) {
      setError('Please enter your email address.')
      return
    }
    setBusy(true)
    try {
      await api<void>('/auth/forgot-password', 'POST', { email: address })
      setSentTo(address)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell narrow>
      <div className="lp-auth-card is-single">
        <section className="lp-auth-form-side">
          {sentTo ? (
            <div className="lp-auth-form">
              <div className="lp-auth-done-ico" aria-hidden="true"><IconMail /></div>
              <FormHead eyebrow="RESET YOUR PASSWORD" title="Check your email"
                sub={<>If an account exists for <strong>{sentTo}</strong>, we've sent a link to reset your password.
                  The link works once, for 1 hour.</>} />
              <p className="lp-auth-note">
                Nothing arrived? Check your spam folder, or{' '}
                <button type="button" className="lp-link-btn" onClick={() => setSentTo(null)}>send it again</button>.
              </p>
              <Link to="/login" className="lp-auth-submit is-link">Back to log in</Link>
            </div>
          ) : (
            <form className="lp-auth-form" onSubmit={onSubmit} noValidate>
              <FormHead eyebrow="RESET YOUR PASSWORD" title="Forgot your password?"
                sub="Enter the email address you signed up with and we'll send you a link to set a new one." />
              {error && <FormError>{error}</FormError>}

              <Field id="forgot-email" label="Email address" type="email" value={email} onChange={setEmail}
                placeholder="you@example.com" autoComplete="email" inputMode="email" icon={<IconMail />} />

              <SubmitButton busy={busy} busyLabel="Sending…">Send reset link</SubmitButton>

              <p className="lp-auth-swap">Remembered it? <Link to="/login">Log in</Link></p>
            </form>
          )}
        </section>
      </div>
    </AuthShell>
  )
}
