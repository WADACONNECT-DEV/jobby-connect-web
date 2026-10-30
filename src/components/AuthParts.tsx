import { useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowIcon } from './LandingSteps'

/* Building blocks for the Log in / Create account pages and the simple
   public pages around them (design/HANDOFF-auth.md). Display only: nothing
   here calls the API or decides what a form does. Styles: `au-` in index.css,
   inside the landing `.lp` wrapper so the landing fonts and colours apply. */

/* ---------- icons ---------- */

type IconProps = { children: ReactNode; size?: number; stroke?: string }

function Icon({ children, size = 20, stroke = 'currentColor' }: IconProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export const MailIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </Icon>
)
export const LockIcon = () => (
  <Icon>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <path d="M12 15v2" />
  </Icon>
)
const EyeIcon = ({ off }: { off: boolean }) => (
  <Icon>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </Icon>
)
export const ClipboardIcon = () => (
  <Icon size={30} stroke="#fff">
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 3h6v3H9z" />
    <path d="M9 13l2 2 4-4" stroke="#F7C21B" />
  </Icon>
)
export const PeopleIcon = () => (
  <Icon size={30} stroke="#fff">
    <circle cx="12" cy="7" r="3" stroke="#F7C21B" />
    <circle cx="5.5" cy="11" r="2.2" />
    <circle cx="18.5" cy="11" r="2.2" />
    <path d="M7 20c0-3 2.2-5 5-5s5 2 5 5" />
    <path d="M1.5 20c0-2.4 1.6-4 4-4M22.5 20c0-2.4-1.6-4-4-4" />
  </Icon>
)
export const StarOutlineIcon = () => (
  <Icon size={30} stroke="#F7C21B">
    <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" />
  </Icon>
)
export const UserIcon = ({ size = 28, stroke = '#fff' }: { size?: number; stroke?: string }) => (
  <Icon size={size} stroke={stroke}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </Icon>
)
export const DocIcon = () => (
  <Icon size={28} stroke="#fff">
    <path d="M14 3H6v18h12V7z" />
    <path d="M14 3v4h4M9 12h6M9 16h6" />
  </Icon>
)
export const RocketIcon = () => (
  <Icon size={28} stroke="#fff">
    <path d="M5 15c-1.5 1.5-2 4.5-2 6 1.5 0 4.5-.5 6-2" />
    <path d="M9 15l-3-3 3-5c3-4 8-5 12-4 1 4 0 9-4 12l-5 3z" />
    <circle cx="15" cy="9" r="1.8" />
  </Icon>
)
export const BriefcaseIcon = () => (
  <Icon size={26}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
  </Icon>
)

/* ---------- page chrome ---------- */

export function AuthTopBar() {
  return (
    <header className="au-top">
      <div className="au-top-in">
        <Link to="/" className="lp-logo">
          <span className="lp-logo-j" aria-hidden="true">J</span>
          <span className="lp-logo-name">JOBBY-CONNECT</span>
        </Link>
        <Link to="/" className="au-back">
          <ArrowIcon d="M19 12H5M11 6l-6 6 6 6" />
          Back to home
        </Link>
      </div>
    </header>
  )
}

export function AuthFooter() {
  return (
    <footer className="au-foot">
      <span>© Jobby-Connect 2026</span>
      <span aria-hidden="true">|</span>
      <Link to="/privacy">Privacy</Link>
      <span aria-hidden="true">|</span>
      <Link to="/terms">Terms</Link>
    </footer>
  )
}

type LayoutProps = {
  /** Big headline in the navy panel. */
  headline: ReactNode
  sub: string
  steps: ReactNode
  photo: { src: string; alt: string }
  /** Yellow rule above the headline (Log in page). */
  rule?: boolean
  /** Curved navy edge over the top of the photo (Log in page). */
  curve?: boolean
  children: ReactNode
}

/** Log in / Create account: navy story panel on the left, form on the right. */
export function AuthLayout({ headline, sub, steps, photo, rule, curve, children }: LayoutProps) {
  return (
    <div className="lp au">
      <AuthTopBar />
      <main className="au-main">
        <div className="au-card">
          <div className="au-side">
            <div className="au-side-copy">
              {rule && <span className="lp-rule au-rule" aria-hidden="true" />}
              <p className="au-headline">{headline}</p>
              <p className="au-sub">{sub}</p>
              <div className="au-steps-wrap">{steps}</div>
            </div>
            <div className={'au-photo' + (curve ? ' au-photo--curve' : '')}>
              {curve && (
                <svg className="au-curve" viewBox="0 0 700 70" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 0H700V6C520 74 180 74 0 16Z" fill="#0F2A4A" />
                </svg>
              )}
              <img src={photo.src} alt={photo.alt} />
            </div>
          </div>
          <div className="au-form-side">{children}</div>
        </div>
      </main>
      <AuthFooter />
    </div>
  )
}

/** Terms, Privacy, Forgot / Reset password: top bar, one white card, footer. */
export function SimplePage({ wide, children }: { wide?: boolean; children: ReactNode }) {
  return (
    <div className="lp au">
      <AuthTopBar />
      <main className="au-main">
        <div className={'au-simple' + (wide ? ' au-simple--wide' : '')}>{children}</div>
      </main>
      <AuthFooter />
    </div>
  )
}

/* ---------- navy-panel steps ---------- */

type Step = { icon: ReactNode; label: string }

/** Log in: three round icons with a label under each. */
export function IconSteps({ steps }: { steps: Step[] }) {
  return (
    <ul className="au-icons">
      {steps.map((s) => (
        <li key={s.label}>
          <span className="au-icons-ring">{s.icon}</span>
          {s.label}
        </li>
      ))}
    </ul>
  )
}

/** Create account: numbered steps joined by arrows. */
export function NumberedSteps({ steps }: { steps: Step[] }) {
  return (
    <ol className="au-numbered">
      {steps.map((s, k) => (
        <li key={s.label}>
          {k > 0 && (
            <svg className="au-numbered-arrow" aria-hidden="true" width="70" height="12" viewBox="0 0 70 12" fill="none" stroke="#C3D1E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 6h67M62 1l6 5-6 5" />
            </svg>
          )}
          <span className="au-numbered-n">{k + 1}</span>
          {s.icon}
          <span className="au-numbered-label">{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

/* ---------- form pieces ---------- */

type FieldProps = {
  id: string
  label: string
  icon?: ReactNode
  hint?: string
  /** Extra content under the input, e.g. the Preview notice. */
  after?: ReactNode
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>

/** Labelled input with an optional icon on the left. */
export function IconInput({ id, label, icon, hint, after, ...input }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="au-field">
      <label htmlFor={id}>{label}</label>
      <span className={'au-input' + (icon ? ' has-icon' : '')}>
        {icon && <span className="au-input-ico">{icon}</span>}
        <input id={id} aria-describedby={hintId} {...input} />
      </span>
      {hint && <span id={hintId} className="au-hint">{hint}</span>}
      {after}
    </div>
  )
}

/** Password input with a show/hide button. Display only: it switches the
    field between hidden and visible text and nothing else. */
export function PasswordInput({ id, label, icon, hint, after, ...input }: FieldProps) {
  const [shown, setShown] = useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="au-field">
      <label htmlFor={id}>{label}</label>
      <span className={'au-input has-eye' + (icon ? ' has-icon' : '')}>
        {icon && <span className="au-input-ico">{icon}</span>}
        <input id={id} aria-describedby={hintId} {...input} type={shown ? 'text' : 'password'} />
        <button
          type="button"
          className="au-eye"
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          onClick={() => setShown((v) => !v)}
        >
          <EyeIcon off={shown} />
        </button>
      </span>
      {hint && <span id={hintId} className="au-hint">{hint}</span>}
      {after}
    </div>
  )
}

/** Amber "not connected yet" note for screens the developer still has to wire up. */
export function PreviewNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="au-preview" role="note">
      <strong>Preview — not connected yet</strong>
      {children && <span>{children}</span>}
    </p>
  )
}

export function InfoBox({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="au-info">
      <span className="au-info-ico">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

/** Big yellow submit button with the arrow. */
export function SubmitButton({ busy, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <button type="submit" className="au-submit" disabled={busy}>
      {children}
      {!busy && <ArrowIcon />}
    </button>
  )
}
