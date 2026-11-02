import { type ReactNode } from 'react'

/*
 * Display-only pieces for the provider's public page (HANDOFF-profile Part N).
 * They take props and render; nothing here calls the API.
 */

/** "Archie Knight" → "Archie K." (first name + initial). One-word names are shown as they are. */
export function shortName(full: string): string {
  const words = full.trim().split(/\s+/).filter(Boolean)
  if (words.length < 2) return full.trim()
  return `${words[0]} ${words[words.length - 1][0].toUpperCase()}.`
}

/** A titled box in the right-hand column. */
export function SideBox({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="pv-box">
      {title && <h3 className="pv-box-title">{title}</h3>}
      {children}
    </section>
  )
}

/** Average rating and the same figure as a percentage (average ÷ 5). Display only. */
export function RatingBox({ average, count }: { average: number; count: number }) {
  const pct = Math.round((average / 5) * 100)
  return (
    <section className="pv-box pv-rating">
      <div className="pv-stat">
        <strong>{average.toFixed(1)} <span className="pv-stat-star" aria-hidden="true">★</span></strong>
        <span>{count} review{count === 1 ? '' : 's'}</span>
      </div>
      <div className="pv-stat">
        <strong>{pct}%</strong>
        <span>rating</span>
      </div>
    </section>
  )
}

/** Suburb chips, the first `limit` shown and the rest as "+n". No limit shows them all. */
export function SuburbChips({ suburbs, limit }: { suburbs: string[]; limit?: number }) {
  const shown = limit ? suburbs.slice(0, limit) : suburbs
  const more = suburbs.length - shown.length
  return (
    <div className="pv-chips">
      {shown.map((s) => <span className="pv-chip" key={s}>{s}</span>)}
      {more > 0 && <span className="pv-chip pv-chip-more" title={suburbs.slice(shown.length).join(', ')}>+{more}</span>}
    </div>
  )
}

const ico = (d: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
)
const PhoneIco = () => ico(<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />)
const MailIco = () => ico(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></>)
const ClockIco = () => ico(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>)

/** Phone / email / hours rows, each only if filled. Renders nothing when all are empty. */
export function ContactRows({ phone, email, hours }: { phone: string | null; email: string | null; hours: string | null }) {
  if (!phone && !email && !hours) return null
  return (
    <ul className="pv-contact">
      {phone && <li><PhoneIco /><span className="pg-sr">Phone: </span><span>{phone}</span></li>}
      {email && <li><MailIco /><span className="pg-sr">Email: </span><span>{email}</span></li>}
      {hours && <li><ClockIco /><span className="pg-sr">Hours: </span><span>{hours}</span></li>}
    </ul>
  )
}
