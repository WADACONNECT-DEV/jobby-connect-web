import type { FormEvent, ReactNode } from 'react'
import { formatMoney, type ProviderQuoteStage, type SettlementStatus } from '../types'
import { Icon, InitialsAvatar } from './PageParts'
import { RefPill } from './JobParts'

/* Display-only pieces for Your Quotes (HANDOFF-provider Part K).
   Styles: `pk-` in index.css. Nothing here calls the API or decides what
   action a quote needs; the page passes the buttons in. Money is shown
   exactly as the quote holds it — formatting only. */

export const DocTickIcon = () => (
  <Icon size={40} width={1.8}>
    <path d="M14 3H6v18h12V7z" />
    <path d="M14 3v4h4" />
    <path d="M9 14l2 2 4-4" stroke="#D9A400" />
  </Icon>
)

/** Customer pays · Commission · You get paid, side by side. */
export function FigureTrio({ customerPays, commission, youGet }: { customerPays: number; commission: number; youGet: number }) {
  return (
    <dl className="pk-figs">
      <div>
        <dt>Customer pays</dt>
        <dd>{formatMoney(customerPays)}</dd>
      </div>
      <div>
        <dt>Commission</dt>
        <dd>{formatMoney(commission)}</dd>
      </div>
      <div className="pk-fig-you">
        <dt>You get paid</dt>
        <dd>{formatMoney(youGet)}</dd>
      </div>
    </dl>
  )
}

export function PaymentChip({ staged }: { staged: boolean }) {
  return <span className={`pk-pay${staged ? ' is-staged' : ''}`}>{staged ? 'Staged payment' : 'Full payment'}</span>
}

const DOT: Record<SettlementStatus, string> = {
  PENDING_COMPLETION: 'todo',
  PENDING_PAYMENT: 'wait',
  PENDING_REVIEW: 'act',
  PAID: 'done',
}

/**
 * Each stage on its own line: dot, name and %, amounts, then whatever the page
 * passes as that stage's action or state (Mark complete, Review & get paid, or
 * the existing settlement label).
 */
export function StageTimeline({ stages, actionFor }: {
  stages: ProviderQuoteStage[]
  actionFor: (stage: ProviderQuoteStage) => ReactNode
}) {
  return (
    <ol className="pk-stages" aria-label="Payment stages">
      {stages.map((st, i) => {
        const dot = st.settlementStatus ? DOT[st.settlementStatus] : 'todo'
        return (
          <li key={st.id ?? `${st.name}-${i}`} className={`pk-stage is-${dot}`}>
            <span className="pk-dot" aria-hidden="true" />
            <span className="pk-stage-name">
              <strong>{st.name}{st.completion ? ' (auto)' : ''}</strong>
              <span>{st.percent}%</span>
            </span>
            <span className="pk-stage-amt">
              {formatMoney(st.customerTotal)}
              <span> · you get {formatMoney(st.providerPayable)}</span>
            </span>
            <span className="pk-stage-act">{actionFor(st)}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** "Mark stage 2 complete" / "Submit your review to release $x". */
export function ReasonLine({ children }: { children: ReactNode }) {
  return (
    <p className="pk-reason">
      <span className="pk-reason-dot" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/* ---------- Grid view ---------- */

export function QuoteCompactCard(p: {
  title: string
  customerName: string | null
  refValue: string | null
  staged: boolean
  customerPays: number
  youGet: number
  reason: string | null
  actionLabel: string
  onAction: () => void
  onOpen: () => void
}) {
  return (
    <article className={`jb-cc pk-cc${p.reason ? ' is-attention' : ''}`} onClick={p.onOpen}>
      <div className="jb-cc-top">
        <h3 className="jb-cc-title">{p.title}</h3>
        <PaymentChip staged={p.staged} />
      </div>
      {p.refValue && <div className="jb-cc-refs"><RefPill value={p.refValue} /></div>}
      {p.customerName && (
        <p className="jb-cc-who">
          <InitialsAvatar name={p.customerName} size="sm" />
          <span>{p.customerName}</span>
        </p>
      )}
      <p className="pk-cc-figs">
        <span>Customer pays <strong>{formatMoney(p.customerPays)}</strong></span>
        <span>You get <strong>{formatMoney(p.youGet)}</strong></span>
      </p>
      {p.reason && <ReasonLine>{p.reason}</ReasonLine>}
      <button
        type="button"
        className={`pg-btn ${p.reason ? 'pg-btn-yellow' : 'pg-btn-navy'} jb-cc-action`}
        onClick={(e) => { e.stopPropagation(); p.onAction() }}
      >
        {p.actionLabel}
      </button>
    </article>
  )
}

/* ---------- Post-job review ---------- */

/** 1–5 picker that sets the same number the old dropdown did. */
function Scale({ id, label, low, high, value, onChange }: {
  id: string; label: string; low: string; high: string; value: number; onChange: (n: number) => void
}) {
  return (
    <fieldset className="pk-scale">
      <legend id={id}>{label}</legend>
      <div className="pk-scale-row" role="radiogroup" aria-labelledby={id}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            className={value === n ? 'on' : ''}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <span className="pk-scale-ends"><span>1 {low}</span><span>5 {high}</span></span>
    </fieldset>
  )
}

/**
 * The post-job review form: same four fields as before (difficulty,
 * cooperation, hazards, notes). The page owns the values and the submit.
 */
export function ReviewForm(p: {
  label: string
  isStage: boolean
  difficulty: number
  cooperation: number
  hazards: string
  notes: string
  onDifficulty: (n: number) => void
  onCooperation: (n: number) => void
  onHazards: (v: string) => void
  onNotes: (v: string) => void
  submitDisabled: boolean
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
}) {
  return (
    <form className="pk-review" onSubmit={p.onSubmit} aria-labelledby="pk-review-title">
      <h4 id="pk-review-title">Post-job review — {p.label}</h4>
      <p className="pk-review-lead">Submitting your review releases your payout for this {p.isStage ? 'stage' : 'job'}.</p>
      <div className="pk-review-pair">
        <Scale id="pk-difficulty" label="Job difficulty" low="easy" high="hard" value={p.difficulty} onChange={p.onDifficulty} />
        <Scale id="pk-cooperation" label="Customer cooperation" low="poor" high="great" value={p.cooperation} onChange={p.onCooperation} />
      </div>
      <div className="pg-field">
        <label htmlFor="pk-hazards">Hazards encountered (optional)</label>
        <input id="pk-hazards" value={p.hazards} onChange={(e) => p.onHazards(e.target.value)} />
      </div>
      <div className="pg-field">
        <label htmlFor="pk-notes">Notes (optional)</label>
        <input id="pk-notes" value={p.notes} onChange={(e) => p.onNotes(e.target.value)} />
      </div>
      <div className="pk-review-actions">
        <button type="button" className="pg-btn pg-btn-ghost" onClick={p.onCancel}>Cancel</button>
        <button type="submit" className="pg-btn pg-btn-yellow" disabled={p.submitDisabled}>Submit review &amp; release payout</button>
      </div>
    </form>
  )
}
