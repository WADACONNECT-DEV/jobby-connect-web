import { useEffect } from 'react'
import { Icon, InitialsAvatar } from './PageParts'
import { RefPill } from './JobParts'

/* Display-only pieces for Requests to Me (HANDOFF-provider Part J).
   Styles: `pr-` in index.css; provider colours come from the Part I theme.
   Nothing here calls the API or decides anything: the page passes it all in. */

export const BubbleIcon = () => (
  <Icon size={40} width={1.8}>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M8 9h8M8 12.5h5" stroke="#D9A400" />
  </Icon>
)

/** Whole days from today to the closing date (0 = closes today). */
export function daysUntil(iso: string): number {
  const end = new Date(iso)
  const now = new Date()
  const a = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((a - b) / 86400000)
}

/** "Closes in n days", red "Closes today". Nothing once the date has passed. */
export function ClosesChip({ expiresAt }: { expiresAt: string }) {
  const days = daysUntil(expiresAt)
  if (days < 0) return null
  if (days === 0) return <span className="pr-closes is-today">Closes today</span>
  return <span className="pr-closes">Closes in {days} day{days === 1 ? '' : 's'}</span>
}

/* ---------- Grid view ---------- */

export function RequestCompactCard(p: {
  title: string
  customerName: string
  industry: string
  suburb: string
  date: string
  refValue: string | null
  expiresAt: string | null
  outcomeLabel: string
  attention: boolean
  /** Optional: a card with no main button (e.g. a declined request). */
  actionLabel?: string
  onAction?: () => void
  onOpen: () => void
}) {
  return (
    <article className={`jb-cc pr-cc${p.attention ? ' is-attention' : ''}`} onClick={p.onOpen}>
      <div className="jb-cc-top">
        <h3 className="jb-cc-title">{p.title}</h3>
        <span className="pr-outcome">{p.outcomeLabel}</span>
      </div>
      <p className="jb-cc-date">{p.date}</p>
      <div className="jb-cc-meta">
        <span className="pg-chip">{p.industry}</span>
        <span className="jb-cc-suburb">{p.suburb}</span>
      </div>
      {p.refValue && <div className="jb-cc-refs"><RefPill value={p.refValue} /></div>}
      {p.expiresAt && <div><ClosesChip expiresAt={p.expiresAt} /></div>}
      <p className="jb-cc-who">
        <InitialsAvatar name={p.customerName} size="sm" />
        <span>{p.customerName}</span>
      </p>
      {p.actionLabel && p.onAction && (
        <button
          type="button"
          className={`pg-btn ${p.attention ? 'pg-btn-yellow' : 'pg-btn-navy'} jb-cc-action`}
          onClick={(e) => { e.stopPropagation(); p.onAction?.() }}
        >
          {p.actionLabel}
        </button>
      )}
    </article>
  )
}

/* ---------- Decline dialog ---------- */

/**
 * The decline confirmation in the in-app dialog style. Same rules as the inline
 * panel it replaces: a message is required, Confirm Decline stays disabled until
 * one is typed, and only Confirm declines. "Back" leaves the request untouched.
 */
export function DeclineDialog({ open, inputId, message, onMessage, error, busy, onConfirm, onCancel }: {
  open: boolean
  inputId: string
  message: string
  onMessage: (value: string) => void
  error: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div className="dlg-backdrop" onMouseDown={() => { if (!busy) onCancel() }}>
      <div
        className="dlg pr-dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-title`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="dlg-title" id={`${inputId}-title`}>Are you sure you want to decline this request?</h3>
        <p className="pr-dlg-lead">
          The customer will be told you can't take it on, and will see the message you write
          below. This cannot be undone, and you won't be able to quote on it afterwards.
        </p>
        {error && <div className="pg-error" role="alert">{error}</div>}
        <label htmlFor={inputId} className="pr-dlg-label">Your message to the customer</label>
        <textarea
          id={inputId}
          rows={3}
          autoFocus
          value={message}
          onChange={(e) => onMessage(e.target.value)}
          placeholder="e.g. Sorry, we're fully booked until 20 October — happy to quote after that."
        />
        <div className="pr-dlg-actions">
          <button type="button" className="pg-btn pg-btn-ghost" onClick={onCancel}>
            Back — don't decline
          </button>
          <button
            type="button"
            className="pg-btn pr-btn-danger"
            disabled={message.trim().length === 0 || busy}
            onClick={onConfirm}
          >
            {busy ? 'Declining…' : 'Confirm Decline'}
          </button>
        </div>
      </div>
    </div>
  )
}
