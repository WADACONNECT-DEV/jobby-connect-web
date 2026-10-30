import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconInput, MailIcon, PreviewNotice, SimplePage, SubmitButton } from '../components/AuthParts'

/* /forgot-password — finished screen, NOT connected yet (HANDOFF-auth).
   TODO(developer): connect to POST /auth/forgot-password { email } (see
   BACKEND-REQUESTS.md) and remove the Preview notice. */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    // TODO(developer): send the reset link here. Until then nothing is sent;
    // we only show the confirmation screen.
    setSent(true)
  }

  return (
    <SimplePage>
      <PreviewNotice>Nothing is sent from this screen yet.</PreviewNotice>
      {sent ? (
        <div className="au-form">
          <span className="au-eyebrow">RESET YOUR PASSWORD</span>
          <h1 className="au-title">Check your email</h1>
          <p className="au-lead">
            If there's a Jobby-Connect account for that address, we've sent it a link to reset your password.
            The link works once and expires after about an hour.
          </p>
          <p className="au-swap">
            <Link to="/login">Back to log in</Link>
          </p>
        </div>
      ) : (
        <form className="au-form" onSubmit={onSubmit}>
          <span className="au-eyebrow">RESET YOUR PASSWORD</span>
          <h1 className="au-title">Forgot your password?</h1>
          <p className="au-lead">Enter the email you log in with and we'll send you a link to set a new one.</p>
          <IconInput
            id="forgot-email"
            label="Email address"
            icon={<MailIcon />}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <SubmitButton>Send reset link</SubmitButton>
          <p className="au-swap">
            Remembered it? <Link to="/login">Log in</Link>
          </p>
        </form>
      )}
    </SimplePage>
  )
}
