import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import {
  AuthShell, Field, FormError, FormHead, IconClipboard, IconLock, IconMail, IconPeople, IconStar, IconUser,
  InfoBox, PasswordField, SubmitButton,
} from '../components/landing/AuthLayout'

/**
 * Log in — redesign step 2 (owner's auth design, auth-v1/login-mockup.png).
 *
 * The form does what it always did: same fields, same login() call, same
 * messages, same redirect to /home. New here: the look, the show/hide eye on
 * the password, and the "Forgot password?" link.
 */
export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setBusy(true)
    try {
      await login(email, password)
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="lp-auth-card">
        <section className="lp-auth-panel">
          <div className="lp-auth-panel-copy">
            <span className="lp-rule" aria-hidden="true" />
            <h2 className="lp-auth-panel-title">Good to see you <span className="lp-yellow">again.</span></h2>
            <p className="lp-auth-panel-sub">Your jobs, your trusted mates and your rewards — all in one place.</p>
            <ul className="lp-auth-perks">
              <li><span className="lp-auth-perk-ico"><IconClipboard /></span>Manage jobs</li>
              <li><span className="lp-auth-perk-ico"><IconPeople /></span>Stay connected</li>
              <li><span className="lp-auth-perk-ico"><IconStar /></span>Mate Points</li>
            </ul>
          </div>
          <div className="lp-auth-photo is-curved">
            <img src="/landing/auth-login.jpg" alt="A customer and a Jobby-Connect provider look at the app together" />
            <svg className="lp-auth-curve" viewBox="0 0 700 60" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 0H700V0C560 52 330 70 0 14Z" />
            </svg>
          </div>
        </section>

        <section className="lp-auth-form-side">
          <form className="lp-auth-form" onSubmit={onSubmit} noValidate>
            <FormHead eyebrow="Your Jobby-Connect account" title="Welcome back" sub="Log in to continue." />
            {error && <FormError>{error}</FormError>}

            <Field id="login-email" label="Email address" type="email" value={email} onChange={setEmail}
              placeholder="you@example.com" autoComplete="email" inputMode="email" icon={<IconMail />} />

            <PasswordField id="login-password" label="Password" value={password} onChange={setPassword}
              placeholder="Your password" autoComplete="current-password" icon={<IconLock />} />

            <div className="lp-auth-forgot">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <SubmitButton busy={busy} busyLabel="Logging in…">Log in</SubmitButton>

            <div className="lp-auth-divider">
              <span>New to Jobby-Connect? <Link to="/register">Create a free account</Link></span>
            </div>

            <InfoBox icon={<IconUser />}>One login for customers and service providers.</InfoBox>
          </form>
        </section>
      </div>
    </AuthShell>
  )
}
