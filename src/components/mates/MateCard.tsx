import { formatDate, formatMoney, type Mate } from '../../types'
import { CardFoot, CardHead, CardMeta, CardRef, Figures, ListCard } from '../ListCard'

/**
 * One saved provider on the Your Jobby Mates tab, in the shared list-card
 * layout (Your quotes order). Presentational only: every action is handed in by Mates.tsx,
 * which keeps the selection, remove and navigation logic it always had.
 */

const SUBURBS_SHOWN = 3
const SERVICES_SHOWN = 3

/** Up to two initials from the business name, e.g. "Yarra Catering Co" -> "YC". */
export function initialsOf(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

interface MateCardProps {
  mate: Mate
  name: string
  layout: 'grid' | 'list'
  selected: boolean
  /** True when the cap is reached and this card isn't one of the selected. */
  blocked: boolean
  blockedTitle: string
  onToggle: () => void
  onViewProfile: () => void
  onRemove: () => void
}

export function MateCard({ mate, name, layout, selected, blocked, blockedTitle, onToggle, onViewProfile, onRemove }: MateCardProps) {
  const extraSuburbs = mate.suburbs.length - SUBURBS_SHOWN
  const services = mate.services ?? []
  const extraServices = services.length - SERVICES_SHOWN
  const promo = mate.promoPoints ?? 0
  void layout

  // The Your quotes card order (owner's direction, 8 Nov 2026): title and
  // status, reference, figures, meta, actions.
  return (
    <ListCard selected={selected} className="mc-card">
      <CardHead
        avatar={initialsOf(name)}
        title={name}
        status={<><HeartIcon /> Saved</>}
        tone="wait"
        right={(
          <label title={blocked ? blockedTitle : 'Include in one request'}>
            <input type="checkbox" checked={selected} disabled={blocked} onChange={onToggle} />
            <span className="mc-sr">Select {name}</span>
          </label>
        )}
      />

      {mate.industries.length > 0 && (
        <CardRef>{mate.industries.map((industry) => <span className="mc-chip" key={industry}>{industry}</span>)}</CardRef>
      )}

      <Figures items={[
        {
          label: 'Rating',
          value: mate.reviewCount > 0 ? <>{mate.averageRating.toFixed(1)} <StarIcon /></> : '—',
          note: mate.reviewCount > 0 ? `${mate.reviewCount} review${mate.reviewCount === 1 ? '' : 's'}` : 'No reviews yet',
        },
        { label: 'Jobs done', value: mate.jobsCompleted },
        { label: 'Bonus points', value: promo > 0 ? `+${formatMoney(promo)}` : '—', tone: promo > 0 ? 'pos' : undefined, highlight: promo > 0 },
      ]} />

      {mate.suburbs.length > 0 && (
        <CardMeta>
          <span>
            <PinIcon />
            {mate.suburbs.slice(0, SUBURBS_SHOWN).join(' · ')}
            {extraSuburbs > 0 && ` +${extraSuburbs} suburb${extraSuburbs > 1 ? 's' : ''}`}
          </span>
        </CardMeta>
      )}

      {mate.bio && <p className="lc-desc">{mate.bio}</p>}

      {services.length > 0 && (
        <CardMeta>
          {services.slice(0, SERVICES_SHOWN).map((s) => <span className="mc-tag" key={s}>{s}</span>)}
          {extraServices > 0 && <span className="mc-tag is-more">+{extraServices} more</span>}
        </CardMeta>
      )}

      {mate.lastJobAt && (
        <CardMeta><span><ClockIcon />Last used {formatDate(mate.lastJobAt)}</span></CardMeta>
      )}

      <CardFoot>
        <button type="button" className={`mc-btn ${selected ? 'is-selected' : 'is-add'}`}
          onClick={onToggle} disabled={blocked} title={blocked ? blockedTitle : undefined} aria-pressed={selected}>
          {selected ? <><TickIcon /> Selected</> : 'Add to request'}
        </button>
        <button type="button" className="mc-btn is-ghost" onClick={onViewProfile}>View profile</button>
        <button type="button" className="mc-remove" onClick={onRemove}>Remove mate</button>
      </CardFoot>
    </ListCard>
  )
}

/* ---------- icons (decorative) ---------- */

function HeartIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="#F7C21B">
      <path d="M12 21l-8.4-8.1a5.3 5.3 0 0 1 7.5-7.5L12 6.3l.9-.9a5.3 5.3 0 0 1 7.5 7.5z" />
    </svg>
  )
}
function PinIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="#0B2038">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  )
}
function StarIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#F7A400" style={{ verticalAlign: '-2px' }}>
      <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" />
    </svg>
  )
}
function TickIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
      strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
  )
}
