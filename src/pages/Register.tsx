import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import {
  AuthLayout,
  BriefcaseIcon,
  DocIcon,
  IconInput,
  InfoBox,
  NumberedSteps,
  PasswordInput,
  PreviewNotice,
  RocketIcon,
  SubmitButton,
  UserIcon,
} from '../components/AuthParts'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // TODO(developer): the mobile number is shown but NOT sent yet — register()
  // below still takes (fullName, email, password). Connect once POST
  // /auth/register accepts an optional `mobile` (see BACKEND-REQUESTS.md).
  const [mobile, setMobile] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!fullName || !email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setBusy(true)
    try {
      await register(fullName, email, password)
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      headline={<>One account.<br /><span className="au-accent">More possibilities.</span></>}
      sub="Find local help today. Build your service business when you're ready."
      steps={
        <NumberedSteps
          steps={[
            { icon: <UserIcon />, label: 'Create account' },
            { icon: <DocIcon />, label: 'Complete profile' },
            { icon: <RocketIcon />, label: 'Get started' },
          ]}
        />
      }
      photo={{ src: '/landing/auth-register.jpg', alt: 'A smiling woman talks with a Jobby-Connect provider over a laptop at her kitchen table' }}
    >
      <form className="au-form" onSubmit={onSubmit}>
        <span className="au-eyebrow">JOIN JOBBY-CONNECT</span>
        <h1 className="au-title">Create your free account</h1>
        <p className="au-lead">A few details and you're ready to begin.</p>
        {error && <div className="au-error" role="alert">{error}</div>}

        <IconInput
          id="reg-name"
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          autoComplete="name"
        />
        <IconInput
          id="reg-email"
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
        {/* TODO(developer): display only until the API takes `mobile`. */}
        <IconInput
          id="reg-mobile"
          label="Mobile number"
          type="tel"
          inputMode="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="04xx xxx xxx"
          autoComplete="tel"
          hint="Australian mobile: 10 digits starting 04"
          after={<PreviewNotice>This number isn't saved yet. You'll add it in Complete profile.</PreviewNotice>}
        />
        <PasswordInput
          id="reg-password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          autoComplete="new-password"
          hint="At least 8 characters"
        />

        <p className="au-terms">
          By creating an account, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
        </p>

        <SubmitButton busy={busy}>{busy ? 'Creating…' : 'Create account'}</SubmitButton>

        <p className="au-swap">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <InfoBox icon={<BriefcaseIcon />}>Offering services? Set up your provider profile after joining.</InfoBox>
      </form>
    </AuthLayout>
  )
}
