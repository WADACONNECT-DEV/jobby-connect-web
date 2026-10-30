import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { statusLabel, type JobStatus, type JobTargetProvider } from '../types'
import { InitialsAvatar } from './PageParts'

/* Display-only pieces for Your Requests & Jobs (HANDOFF-jobs-find Part C).
   Styles: `jb-` in index.css. Nothing here calls the API or decides which
   jobs go where; the page passes everything in. */

/* ---------- secondary sub-tab bar ---------- */

export type SubTab<K extends string> = {
  key: K
  label: string
  count: number
  /** Yellow badge: something here is waiting for the customer. */
  attention?: boolean
}

export function SubTabs<K extends string>({ tabs, active, onChange, label }: {
  tabs: SubTab<K>[]
  active: K
  onChange: (key: K) => void
  label: string
}) {
  return (
    <div className="jb-subtabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          className={`jb-subtab${active === t.key ? ' on' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          <span className={`jb-badge${t.attention ? ' is-attention' : ''}`}>
            {t.count}
            {t.attention && <span className="pg-sr"> (needs your attention)</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ---------- status chip ---------- */

/** Colour follows the job's own status; the text is the same label as before. */
const STATUS_TONE: Record<JobStatus, string> = {
  OPEN: 'open',
  QUOTED: 'open',
  ACCEPTED: 'progress',
  IN_PROGRESS: 'progress',
  COMPLETED: 'done',
  CANCELLED: 'ended',
}

export function StatusChip({ status }: { status: JobStatus }) {
  return <span className={`jb-status jb-status-${STATUS_TONE[status] ?? 'open'}`}>{statusLabel(status)}</span>
}

/* ---------- Quote Request ID ---------- */

/** Shown exactly as issued, in a monospace pill. */
export function RefPill({ value, owner }: { value: string; owner?: string }) {
  return (
    <code className="jb-ref" title={owner ? `Quote Request ID · ${owner}` : 'Quote Request ID'}>
      {value}
    </code>
  )
}

/* ---------- who the request went to ---------- */

export function SentTo({ targets, fallbackCount }: { targets: JobTargetProvider[]; fallbackCount: number }) {
  if (targets.length === 0) {
    return (
      <p className="jb-sent">
        Sent to {fallbackCount} provider{fallbackCount > 1 ? 's' : ''} · awaiting quotes
      </p>
    )
  }
  return (
    <div className="jb-sent">
      <span className="jb-sent-label">Sent to</span>
      <ul className="jb-sent-list">
        {targets.map((t) => (
          <li key={t.userId} className={t.status === 'DECLINED' ? 'is-declined' : ''}>
            <InitialsAvatar name={t.name} size="sm" />
            <span>{t.name}</span>
            {t.status === 'DECLINED' && <span className="pg-sr"> (declined)</span>}
          </li>
        ))}
      </ul>
      <span className="jb-sent-note">awaiting quotes</span>
    </div>
  )
}

/* ---------- description cut to two lines ---------- */

/** Two lines, then "Show more". The button only appears when the text is
    actually cut. Display only. */
export function ClampText({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const [cut, setCut] = useState(false)
  const box = useRef<HTMLParagraphElement | null>(null)

  const measure = () => {
    const el = box.current
    if (el && !open) setCut(el.scrollHeight > el.clientHeight + 1)
  }
  useLayoutEffect(measure, [text, open])
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  })

  return (
    <div className="jb-desc-wrap">
      <p ref={box} className={`jb-desc${open ? '' : ' is-clamped'}`}>{text}</p>
      {(cut || open) && (
        <button type="button" className="pg-link jb-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

/* ---------- compact job card (Grid view) ---------- */

type CompactProps = {
  title: string
  status: JobStatus
  date: string
  industry: string
  suburb: string
  /** Quote Request IDs, exactly as issued. The first is shown, the rest as "+N". */
  refs: { value: string; owner: string }[]
  /** Accepted provider, when there is one. */
  assignedTo: string | null
  sentCount: number
  /** Latest progress figure, if the provider has posted any. */
  progress: number | null
  /** Yellow highlight: something here is waiting for the customer. */
  attention: boolean
  actionLabel: string
  /** The main button: opens the card (and, for Review, the review form). */
  onAction: () => void
  /** Clicking anywhere else on the card opens it. */
  onOpen: () => void
}

/** Grid view: about the size of a grid mate card. Display only; opening it
    shows the full List-view card in its place. */
export function JobCompactCard(p: CompactProps) {
  const [firstRef, ...moreRefs] = p.refs
  const pct = p.progress === null ? null : Math.max(0, Math.min(100, Math.round(p.progress)))
  return (
    <article className={`jb-cc${p.attention ? ' is-attention' : ''}`} onClick={p.onOpen}>
      <div className="jb-cc-top">
        <h3 className="jb-cc-title">{p.title}</h3>
        <StatusChip status={p.status} />
      </div>
      <p className="jb-cc-date">{p.date}</p>

      <div className="jb-cc-meta">
        <span className="pg-chip">{p.industry}</span>
        <span className="jb-cc-suburb">{p.suburb}</span>
      </div>

      {firstRef && (
        <div className="jb-cc-refs" title={p.refs.map((r) => `${r.value} · ${r.owner}`).join('\n')}>
          <RefPill value={firstRef.value} owner={firstRef.owner} />
          {moreRefs.length > 0 && <span className="jb-cc-more">+{moreRefs.length}</span>}
        </div>
      )}

      <p className="jb-cc-who">
        {p.assignedTo ? (
          <>
            <InitialsAvatar name={p.assignedTo} size="sm" />
            <span>{p.assignedTo}</span>
          </>
        ) : (
          <span>Sent to {p.sentCount} provider{p.sentCount === 1 ? '' : 's'}</span>
        )}
      </p>

      {pct !== null && (
        <div
          className="jb-cc-prog"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Job progress"
          title={`${pct}% complete`}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      )}

      <button
        type="button"
        className={`pg-btn ${p.attention ? 'pg-btn-yellow' : 'pg-btn-navy'} jb-cc-action`}
        onClick={(e) => { e.stopPropagation(); p.onAction() }}
      >
        {p.actionLabel}
      </button>
    </article>
  )
}
