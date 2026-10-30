import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { LockIcon, PasswordInput, PreviewNotice, SimplePage, SubmitButton } from '../components/AuthParts'

/* /reset-password?token=… — finished screen, NOT connected yet (HANDOFF-auth).
   TODO(developer): read `token` from the address, send it with the new
   password to POST /auth/reset-password { token, newPassword }, add the
   min-8 and passwords-match checks, handle an expired/used token, and remove
   the Preview notice. See BACKEND-REQUESTS.md. */
export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    // TODO(developer): call the API here. Until then nothing is saved;
    // we only show the confirmation screen.
    setDone(true)
  }

  return (
    <SimplePage>
      <PreviewNotice>Your password is not changed from this screen yet.</PreviewNotice>
      {done ? (
        <div className="au-form">
          <span className="au-eyebrow">RESET YOUR PASSWORD</span>
          <h1 className="au-title">Password updated</h1>
          <p className="au-lead">You can now log in with your new password.</p>
          <Link to="/login" className="au-submit au-submit-link">Log in</Link>
        </div>
      ) : (
        <form className="au-form" onSubmit={onSubmit}>
          <span className="au-eyebrow">RESET YOUR PASSWORD</span>
          <h1 className="au-title">Set a new password</h1>
          <p className="au-lead">Choose a new password for your Jobby-Connect account.</p>
          <PasswordInput
            id="reset-password"
            label="New password"
            icon={<LockIcon />}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            autoComplete="new-password"
            hint="At least 8 characters"
          />
          <PasswordInput
            id="reset-confirm"
            label="Confirm new password"
            icon={<LockIcon />}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            autoComplete="new-password"
          />
          <SubmitButton>Set new password</SubmitButton>
        </form>
      )}
    </SimplePage>
  )
}
