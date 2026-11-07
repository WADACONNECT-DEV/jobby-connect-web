import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { AuthShell, FormHead, IconMail } from '../components/landing/AuthLayout'

/**
 * Confirms a change of login email (redesign step 8, owner decision §3).
 * Opened from the link sent to the new address: /confirm-email?token=…
 *
 * The change signs the account out everywhere, so if this browser was logged
 * in it is logged out here too, and the page says to log in with the new email.
 */
export default function ConfirmEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { user, logout } = useAuth()
  const [state, setState] = useState<'working' | 'done' | 'error'>(token ? 'working' : 'error')
  const [message, setMessage] = useState(token ? '' : 'This confirmation link isn\'t complete. Open it from your email again.')
  const sent = useRef(false)

  useEffect(() => {
    // Only once, even if React runs the effect twice in development.
    if (!token || sent.current) return
    sent.current = true
    api<void>('/auth/confirm-email', 'POST', { token })
      .then(() => {
        if (user) logout()
        setState('done')
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : 'Could not confirm your new email.')
        setState('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <AuthShell narrow>
      <div className="lp-auth-card is-single">
        <section className="lp-auth-form-side">
          <div className="lp-auth-form">
            {state === 'working' && (
              <FormHead eyebrow="CHANGE OF EMAIL" title="Confirming…" sub="One moment while we update your account." />
            )}
            {state === 'done' && (
              <>
                <div className="lp-auth-done-ico is-ok" aria-hidden="true"><IconMail /></div>
                <FormHead eyebrow="CHANGE OF EMAIL" title="Email changed"
                  sub="Your login email has been updated. Log in with your new email address. You've been logged out on your other devices." />
                <Link to="/login" className="lp-auth-submit is-link">Log in</Link>
              </>
            )}
            {state === 'error' && (
              <>
                <FormHead eyebrow="CHANGE OF EMAIL" title="We couldn't confirm that link" sub={message} />
                <Link to="/login" className="lp-auth-submit is-link">Go to log in</Link>
              </>
            )}
          </div>
        </section>
      </div>
    </AuthShell>
  )
}
