import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon, CheckIcon } from './PageParts'

/* Display-only pieces for Account and the "Your details" form
   (HANDOFF-account Part H). Styles: `ac-` in index.css. Nothing here calls
   the API. */

/* ---------- icons ---------- */

export const PhoneIcon = () => (
  <Icon size={18}>
    <rect x="7" y="2.5" width="10" height="19" rx="2" />
    <path d="M11 18h2" />
  </Icon>
)
export const IdCardIcon = () => (
  <Icon size={18}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 10h5M7 14h8" />
  </Icon>
)
export const PersonIcon = () => (
  <Icon size={18}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </Icon>
)
export const ToolboxIcon = () => (
  <Icon size={30}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M12 11v5M9.5 13.5h5" stroke="#D9A400" />
  </Icon>
)

/* ---------- formatting (display only) ---------- */

/** "0498000204" → "0498 000 204". Anything that isn't a 10-digit 04 number is shown as stored. */
export function formatMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('04')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return mobile
}

/* ---------- pieces ---------- */

/** One labelled row in a details card: icon, small caps label, value. */
export function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="ac-row">
      <span className="ac-row-ico">{icon}</span>
      <span className="ac-row-label">{label}</span>
      <span className="ac-row-value">{children}</span>
    </div>
  )
}

/** Grey "Not added" when a value is empty. */
export function OrNotAdded({ value }: { value: string | null | undefined }) {
  return value && value.trim() ? <>{value}</> : <span className="ac-empty">Not added</span>
}

/** An account ID pill (CASnnn / PASnnn) shown exactly as issued, with a "Copy" link. */
export function IdPill({ id, label }: { id: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function copy() {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
    }).catch(() => { /* clipboard blocked: nothing to show */ })
  }

  return (
    <span className="ac-id">
      <code className="ac-pill" title={label}>{id}</code>
      <button type="button" className="pg-link ac-copy" onClick={copy} aria-label={`Copy ${label} ${id}`}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span className="pg-sr" aria-live="polite">{copied ? `${label} copied` : ''}</span>
    </span>
  )
}

const STEPS = ['Set up your profile', 'Admin review', 'Start quoting']

/**
 * 1 Set up your profile → 2 Admin review → 3 Start quoting.
 * `current` highlights one step; `done` shows every step ticked.
 */
export function ProviderSteps({ current, done }: { current?: number; done?: boolean }) {
  return (
    <ol className="ac-steps" aria-label="Becoming a provider">
      {STEPS.map((s, i) => {
        const n = i + 1
        const state = done || (current !== undefined && n < current) ? 'done' : n === current ? 'on' : ''
        return (
          <li key={s} className={state ? `is-${state}` : undefined} aria-current={state === 'on' ? 'step' : undefined}>
            <span className="ac-step-n" aria-hidden="true">{state === 'done' ? <CheckIcon /> : n}</span>
            <span>{s}</span>
            {state === 'done' && <span className="pg-sr"> (done)</span>}
          </li>
        )
      })}
    </ol>
  )
}
