import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import {
  AuthLayout,
  ClipboardIcon,
  IconInput,
  IconSteps,
  InfoBox,
  LockIcon,
  MailIcon,
  PasswordInput,
  PeopleIcon,
  StarOutlineIcon,
  SubmitButton,
  UserIcon,
} from '../components/AuthParts'

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
    <AuthLayout
      rule
      curve
      headline={<>Good to see you <span className="au-accent">again.</span></>}
      sub="Your jobs, your trusted mates and your rewards — all in one place."
      steps={
        <IconSteps
          steps={[
            { icon: <ClipboardIcon />, label: 'Manage jobs' },
            { icon: <PeopleIcon />, label: 'Stay connected' },
            { icon: <StarOutlineIcon />, label: 'Mate Points' },
          ]}
        />
      }
      photo={{ src: '/landing/auth-login.jpg', alt: 'An older woman and a Jobby-Connect provider smile at a phone together in her garden' }}
    >
      <form className="au-form" onSubmit={onSubmit}>
        <span className="au-eyebrow">YOUR JOBBY-CONNECT ACCOUNT</span>
        <h1 className="au-title">Welcome back</h1>
        <p className="au-lead">Log in to continue.</p>
        {error && <div className="au-error" role="alert">{error}</div>}

        <IconInput
          id="login-email"
          label="Email address"
          icon={<MailIcon />}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <PasswordInput
          id="login-password"
          label="Password"
          icon={<LockIcon />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          autoComplete="current-password"
          after={
            <Link to="/forgot-password" className="au-forgot">Forgot password?</Link>
          }
        />

        <SubmitButton busy={busy}>{busy ? 'Logging in…' : 'Log in'}</SubmitButton>

        <p className="au-divider">
          <span>
            New to Jobby-Connect? <Link to="/register">Create a free account</Link>
          </span>
        </p>
        <InfoBox icon={<UserIcon size={26} stroke="currentColor" />}>One login for customers and service providers.</InfoBox>
      </form>
    </AuthLayout>
  )
}
