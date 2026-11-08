import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import {
  AuthShell, Field, FormError, FormHead, IconBriefcase, IconDoc, IconFlowArrow, IconRocket, IconUser,
  InfoBox, PasswordField, SubmitButton,
} from '../components/landing/AuthLayout'

/** Australian mobile: 10 digits starting 04, spaces allowed. Used for a hint only. */
const AU_MOBILE = /^04\d{8}$/

/**
 * Create account — redesign step 2 (owner's auth design,
 * auth-v1/register-mockup.png).
 *
 * Same fields, register() call, messages and redirect to /home as before, plus
 * an optional mobile number. The mobile is sent with the sign-up and saved to
 * the account unverified; leaving it blank is fine (it is asked again in the
 * customer profile step). The format note under it is a hint, not a block.
 */
export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const mobileDigits = mobile.replace(/\s+/g, '')
  const mobileLooksOff = mobileDigits !== '' && !AU_MOBILE.test(mobileDigits)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!fullName || !email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setBusy(true)
    try {
      await register(fullName, email, password, mobile)
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
            <h2 className="lp-auth-panel-title">One account.<br /><span className="lp-yellow">More possibilities.</span></h2>
            <p className="lp-auth-panel-sub">Find local help today. Build your service business when you're ready.</p>
            <ol className="lp-auth-steps">
              <li><span className="lp-auth-step-n">1</span><IconUser size={32} stroke="#FFFFFF" /><span>Create account</span></li>
              <li className="lp-auth-step-arrow" aria-hidden="true"><IconFlowArrow /></li>
              <li><span className="lp-auth-step-n">2</span><IconDoc /><span>Complete profile</span></li>
              <li className="lp-auth-step-arrow" aria-hidden="true"><IconFlowArrow /></li>
              <li><span className="lp-auth-step-n">3</span><IconRocket /><span>Get started</span></li>
            </ol>
          </div>
          <div className="lp-auth-photo">
            <img src="/landing/auth-register.jpg" alt="A customer and a Jobby-Connect provider talk through a job at a laptop" />
          </div>
        </section>

        <section className="lp-auth-form-side">
          <form className="lp-auth-form" onSubmit={onSubmit} noValidate>
            <FormHead eyebrow="Join Jobby-Connect" title="Create your free account"
              sub="A few details and you're ready to begin." />
            {error && <FormError>{error}</FormError>}

            <Field id="reg-name" label="Full name" value={fullName} onChange={setFullName}
              placeholder="Your full name" autoComplete="name" />

            <Field id="reg-email" label="Email address" type="email" value={email} onChange={setEmail}
              placeholder="you@example.com" autoComplete="email" inputMode="email" />

            <Field id="reg-mobile" label="Mobile number (optional)" type="tel" value={mobile} onChange={setMobile}
              placeholder="04xx xxx xxx" autoComplete="tel" inputMode="tel"
              hint={mobileLooksOff ? 'Australian mobiles are 10 digits starting 04.' : undefined} />

            <PasswordField id="reg-password" label="Password" value={password} onChange={setPassword}
              placeholder="Create a password" autoComplete="new-password" hint="At least 8 characters" />

            <p className="lp-auth-terms">
              By creating an account, you agree to our <Link to="/terms">Terms</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>.
            </p>

            <SubmitButton busy={busy} busyLabel="Creating…">Create account</SubmitButton>

            <p className="lp-auth-swap">Already have an account? <Link to="/login">Log in</Link></p>

            <InfoBox icon={<IconBriefcase />}>Offering services? Set up your provider profile after joining.</InfoBox>
          </form>
        </section>
      </div>
    </AuthShell>
  )
}
