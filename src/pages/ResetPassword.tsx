import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { AuthShell, FormError, FormHead, IconLock, PasswordField, SubmitButton } from '../components/landing/AuthLayout'

const MIN_LENGTH = 8

/**
 * Reset password — redesign step 2. Opened from the emailed link
 * (/reset-password?token=…).
 *
 * The API refuses a link that is wrong, already used or more than an hour old,
 * and its message is shown as it comes. A successful reset signs the account
 * out everywhere, so if this browser was logged in it is logged out here too.
 */
export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { user, logout } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!password || !confirm) {
      setError('Please enter and confirm your new password.')
      return
    }
    if (password.length < MIN_LENGTH) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await api<void>('/auth/reset-password', 'POST', { token, newPassword: password })
      if (user) logout()
      setDone(true)
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
          {!token ? (
            <div className="lp-auth-form">
              <FormHead eyebrow="Reset your password" title="This link isn't complete"
                sub="Open the link from your email again, or ask for a new one." />
              <Link to="/forgot-password" className="lp-auth-submit is-link">Request a new link</Link>
            </div>
          ) : done ? (
            <div className="lp-auth-form">
              <div className="lp-auth-done-ico is-ok" aria-hidden="true"><IconLock /></div>
              <FormHead eyebrow="Reset your password" title="Password updated"
                sub="You can now log in with your new password. You've been logged out on your other devices." />
              <Link to="/login" className="lp-auth-submit is-link">Log in</Link>
            </div>
          ) : (
            <form className="lp-auth-form" onSubmit={onSubmit} noValidate>
              <FormHead eyebrow="Reset your password" title="Set a new password"
                sub="Choose a new password for your Jobby-Connect account." />
              {error && (
                <FormError>
                  {error}
                  {/expired|invalid/i.test(error) && <> <Link to="/forgot-password">Request a new link</Link></>}
                </FormError>
              )}

              <PasswordField id="reset-password" label="New password" value={password} onChange={setPassword}
                placeholder="Create a password" autoComplete="new-password" icon={<IconLock />}
                hint="At least 8 characters" />

              <PasswordField id="reset-confirm" label="Confirm new password" value={confirm} onChange={setConfirm}
                placeholder="Type it again" autoComplete="new-password" icon={<IconLock />} />

              <SubmitButton busy={busy} busyLabel="Saving…">Set new password</SubmitButton>

              <p className="lp-auth-swap"><Link to="/login">Back to log in</Link></p>
            </form>
          )}
        </section>
      </div>
    </AuthShell>
  )
}
