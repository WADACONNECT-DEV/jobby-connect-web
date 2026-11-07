/**
 * Shared frame for the account pages — Log in, Create account, Forgot password,
 * Reset password, Terms and Privacy (redesign step 2, owner's auth design,
 * matched to the Version 3 landing pages).
 *
 * Slim white top bar, light-blue page, white card, small footer. The pages
 * supply what goes inside the card.
 */
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/* Icons (decorative — the text next to each one carries the meaning)  */
/* ------------------------------------------------------------------ */

const NAVY = '#0F2A4A'
const YELLOW = '#F7C21B'

function Svg({ size = 20, stroke = NAVY, sw = 2, children }: {
  size?: number
  stroke?: string
  sw?: number
  children: ReactNode
}) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export const IconBack = () => <Svg size={18} sw={2.2}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>
export const IconArrow = () => <Svg size={20} stroke="currentColor" sw={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
export const IconMail = () => <Svg><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Svg>
export const IconLock = () => <Svg><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></Svg>
export const IconUser = ({ size = 22, stroke = NAVY }: { size?: number; stroke?: string }) => (
  <Svg size={size} stroke={stroke}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Svg>
)
export const IconPhone = () => <Svg><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Svg>
export const IconBriefcase = () => (
  <Svg size={22}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></Svg>
)
const IconEye = () => <Svg><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>
const IconEyeOff = () => (
  <Svg><path d="M3 3l18 18" /><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.3" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Svg>
)

/* panel icons — yellow or white line art on navy */
export const IconClipboard = () => (
  <Svg size={36} stroke={YELLOW}><rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 4V2.5h6V4" /><path d="M9 13l2 2 4-4" /></Svg>
)
export const IconPeople = () => (
  <Svg size={36} stroke={YELLOW}><circle cx="12" cy="6" r="3" /><circle cx="5.5" cy="10" r="2.3" /><circle cx="18.5" cy="10" r="2.3" />
    <path d="M7 20c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5M1.5 19c0-2.2 1.8-4 4-4M22.5 19c0-2.2-1.8-4-4-4" /></Svg>
)
export const IconStar = () => (
  <Svg size={36} stroke={YELLOW}><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" /></Svg>
)
export const IconDoc = () => (
  <Svg size={32} stroke="#FFFFFF"><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4M9 11h6M9 15h6M9 19h4" /></Svg>
)
export const IconRocket = () => (
  <Svg size={32} stroke="#FFFFFF"><path d="M14 4c3-1.5 6-1 6-1s.5 3-1 6l-6 6-5-5z" /><path d="M9 10l-4 1-2 3 5 1M14 15l-1 4-3 2-1-5" /><circle cx="15.5" cy="8.5" r="1.5" /></Svg>
)
export const IconFlowArrow = () => (
  <svg aria-hidden="true" width="64" height="12" viewBox="0 0 64 12" fill="none" stroke="#8FA6C1" strokeWidth="1.6" strokeLinecap="round">
    <path d="M2 6h58M55 1.5L60 6l-5 4.5" />
  </svg>
)

/* ------------------------------------------------------------------ */
/* Frame                                                               */
/* ------------------------------------------------------------------ */

/** Top bar, light-blue page and footer around one auth card. */
export function AuthShell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className="lp lp-customer lp-auth">
      <header className="lp-auth-bar">
        <div className="lp-auth-bar-in">
          <Link to="/" className="lp-brand">
            <span className="lp-brand-j" aria-hidden="true">J</span>
            <span className="lp-brand-name">JOBBY-CONNECT</span>
          </Link>
          <Link to="/" className="lp-auth-back"><IconBack /> Back to home</Link>
        </div>
      </header>

      <main className={`lp-auth-main${narrow ? ' is-narrow' : ''}`}>{children}</main>

      <footer className="lp-auth-foot">
        <span>© Jobby-Connect 2026</span>
        <span aria-hidden="true">|</span>
        <Link to="/privacy">Privacy</Link>
        <span aria-hidden="true">|</span>
        <Link to="/terms">Terms</Link>
      </footer>
    </div>
  )
}

/** Small capitals label, big heading and a line under it — top of every form. */
export function FormHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: ReactNode }) {
  return (
    <div className="lp-auth-head">
      <span className="lp-auth-eyebrow">{eyebrow}</span>
      <h1 className="lp-auth-title">{title}</h1>
      <p className="lp-auth-sub">{sub}</p>
    </div>
  )
}

/** Error box above a form. Shows the message exactly as the page or the API gives it. */
export function FormError({ children }: { children: ReactNode }) {
  return <div className="lp-auth-error" role="alert">{children}</div>
}

/** Light-blue note under a form, with an icon. */
export function InfoBox({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="lp-auth-info">
      <span className="lp-auth-info-ico">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  autoComplete?: string
  inputMode?: 'text' | 'email' | 'tel' | 'numeric'
  icon?: ReactNode
  hint?: ReactNode
}

/** Label, input (with an optional icon inside it) and an optional hint line. */
export function Field({ id, label, value, onChange, type = 'text', placeholder, autoComplete, inputMode, icon, hint }: FieldProps) {
  return (
    <div className="lp-field">
      <label htmlFor={id}>{label}</label>
      <div className={`lp-input${icon ? ' has-icon' : ''}`}>
        {icon && <span className="lp-input-ico">{icon}</span>}
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode}
          aria-describedby={hint ? `${id}-hint` : undefined} />
      </div>
      {hint && <span id={`${id}-hint`} className="lp-field-hint">{hint}</span>}
    </div>
  )
}

/**
 * Password input with a show/hide eye. Showing the password only changes the
 * input type; the value sent is the same.
 */
export function PasswordField({ id, label, value, onChange, placeholder, autoComplete, icon, hint }: Omit<FieldProps, 'type' | 'inputMode'>) {
  const [shown, setShown] = useState(false)
  return (
    <div className="lp-field">
      <label htmlFor={id}>{label}</label>
      <div className={`lp-input has-eye${icon ? ' has-icon' : ''}`}>
        {icon && <span className="lp-input-ico">{icon}</span>}
        <input id={id} type={shown ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoComplete={autoComplete}
          aria-describedby={hint ? `${id}-hint` : undefined} />
        <button type="button" className="lp-eye" onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}>
          {shown ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
      {hint && <span id={`${id}-hint`} className="lp-field-hint">{hint}</span>}
    </div>
  )
}

/** The big yellow button at the bottom of each form. */
export function SubmitButton({ busy, busyLabel, children }: { busy: boolean; busyLabel: string; children: ReactNode }) {
  return (
    <button type="submit" className="lp-auth-submit" disabled={busy}>
      {busy ? busyLabel : <>{children} <IconArrow /></>}
    </button>
  )
}
