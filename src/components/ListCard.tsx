import type { ReactNode } from 'react'

/**
 * The list card every list page uses (owner's direction, 8 Nov 2026: "every
 * page organised like Your quotes"). One order on every card:
 *
 *   title + status chip  ·  reference  ·  person row  ·  figure boxes  ·
 *   meta line  ·  step line (where it applies)  ·  actions at the foot
 *
 * Cards sit in a 3-column grid (2 on tablet, 1 on phone); one that opens a
 * panel (quote form, payment, review) spans the whole row.
 */

export function CardGrid({ layout = 'grid', children }: { layout?: 'grid' | 'list'; children: ReactNode }) {
  return <div className={layout === 'grid' ? 'lc-grid' : 'lc-list'}>{children}</div>
}

export function ListCard({ open = false, selected = false, className = '', children }: {
  open?: boolean
  selected?: boolean
  className?: string
  children: ReactNode
}) {
  return <article className={`lc${open ? ' is-open' : ''}${selected ? ' is-selected' : ''}${className ? ` ${className}` : ''}`}>{children}</article>
}

/** Title, status chip and anything that belongs top-right (a checkbox, a date). */
export function CardHead({ title, status, tone = 'neutral', avatar, right }: {
  title: ReactNode
  status?: ReactNode
  tone?: 'neutral' | 'good' | 'wait' | 'bad' | 'dark'
  avatar?: string
  right?: ReactNode
}) {
  return (
    <div className="lc-head">
      {avatar && <span className="lc-avatar" aria-hidden="true">{avatar}</span>}
      <div className="lc-head-main">
        <h3 className="lc-title">{title}</h3>
        {status && <span className={`lc-chip is-${tone}`}>{typeof status === 'string' ? sentence(status) : status}</span>}
      </div>
      {right && <div className="lc-head-right">{right}</div>}
    </div>
  )
}

/** A reference such as the Quote Request ID, or a row of small chips. */
export function CardRef({ children }: { children: ReactNode }) {
  return <div className="lc-ref">{children}</div>
}

/** The other party: avatar initials and name, with an optional line under it. */
export function CardPerson({ initials, name, sub }: { initials: string; name: ReactNode; sub?: ReactNode }) {
  return (
    <div className="lc-person">
      <span className="lc-avatar is-small" aria-hidden="true">{initials}</span>
      <span className="lc-person-text"><b>{name}</b>{sub && <span>{sub}</span>}</span>
    </div>
  )
}

export interface Figure {
  label: string
  value: ReactNode
  note?: ReactNode
  /** Colour of the value: green money in, red money out. */
  tone?: 'pos' | 'neg'
  /** The box that matters most on the card (cream). */
  highlight?: boolean
  /** Full text on hover when the value is a short form ('1 month' for 'Within a month'). */
  title?: string
}

/** Two to three figure boxes; the highlighted one is the figure that matters most. */
export function Figures({ items }: { items: Figure[] }) {
  return (
    <div className="lc-figs" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((f) => (
        <div key={f.label} className={`lc-fig${f.highlight ? ' is-hi' : ''}`}>
          <span className="lc-fig-label" title={f.label}>{f.label}</span>
          <span className={`lc-fig-value${f.tone === 'pos' ? ' is-pos' : f.tone === 'neg' ? ' is-neg' : ''}${isWords(f.value) ? ' is-words' : longValue(f.value) ? ' is-long' : ''}`}
            title={f.title ?? (isWords(f.value) ? String(f.value) : undefined)}>{f.value}</span>
          {f.note && <span className="lc-fig-note">{f.note}</span>}
        </div>
      ))}
    </div>
  )
}

/** A date for a figure box: "29 Sep" as the value, the year as the note under it. */
export function dayMonth(iso: string): { value: string; note: string } {
  const d = new Date(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return { value: `${d.getDate()} ${months[d.getMonth()]}`, note: String(d.getFullYear()) }
}

/** A short line of facts: "Staged · Sent 30 Sep 2026". */
export function CardMeta({ children }: { children: ReactNode }) {
  return <div className="lc-meta">{children}</div>
}

/** The actions, at the foot of the card, left-aligned. */
export function CardFoot({ children }: { children: ReactNode }) {
  return <div className="lc-foot">{children}</div>
}

/** "IN PROGRESS" -> "In progress"; text that isn't all capitals is left alone. */
function sentence(text: string): string {
  if (text !== text.toUpperCase()) return text
  const lower = text.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/**
 * A value made of words ("Within a month", a customer's own wording) may wrap
 * at a space, up to two lines (the full text shows on hover); amounts, counts
 * and dates ("$4,431.39", "3", "29 Sep") never wrap.
 */
export function isWords(value: ReactNode): boolean {
  if (typeof value !== 'string') return false
  return /[A-Za-z]{3,}/.test(value.replace(/^\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/, '')) && /\s/.test(value.trim())
}

/** The customer's time frame in a figure box: the standard choices shortened, anything else as typed. */
export function shortTimeFrame(text: string | null | undefined): { value: string; title?: string } {
  if (!text) return { value: '—' }
  const map: Record<string, string> = {
    'as soon as possible': 'ASAP',
    'within a week': '1 week',
    'within 2 weeks': '2 weeks',
    'within two weeks': '2 weeks',
    'within a month': '1 month',
    'flexible': 'Flexible',
    'this week': 'This week',
  }
  const short = map[text.trim().toLowerCase()]
  return short ? { value: short, title: short === text ? undefined : text } : { value: text }
}

/** Amounts of ten characters or more ("$13,170.27") get a smaller size so they still fit one line. */
export function longValue(value: ReactNode): boolean {
  return (typeof value === 'string' || typeof value === 'number') && String(value).length >= 10
}
