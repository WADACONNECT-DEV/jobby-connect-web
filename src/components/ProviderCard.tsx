import type { ReactNode } from 'react'
import { ClockIcon, InitialsAvatar, PinIcon, StarIcon } from './PageParts'

/* The provider card from the Your Jobby Mates design (HANDOFF-mates Part B),
   also meant for the Find results. Display only: the page passes in what to
   show and what the checkbox / buttons do. */

type Props = {
  name: string
  selected: boolean
  /** Checkbox disabled (at the cap and not already selected). */
  selectDisabled: boolean
  selectTitle: string
  onToggle: () => void
  /** Chips beside the name, e.g. "Saved". */
  badges?: ReactNode
  industries: string[]
  suburbs: string[]
  /** Shown when there is no suburb list. */
  serviceArea?: string | null
  /** Clock line, e.g. "Last used 9 July 2026". */
  note?: string | null
  averageRating: number
  reviewCount: number
  jobsCompleted: number
  actions: ReactNode
  /** Grid view: short card with every detail on one line. List view leaves this off. */
  compact?: boolean
}

const SUBURBS_SHOWN = 3
const SUBURBS_SHOWN_COMPACT = 2

export function ProviderCard(p: Props) {
  if (p.compact) return <CompactCard {...p} />
  const firstSuburbs = p.suburbs.slice(0, SUBURBS_SHOWN)
  const moreSuburbs = p.suburbs.length - firstSuburbs.length
  return (
    <article className={`pc-card${p.selected ? ' is-selected' : ''}`}>
      <label className="pc-pick" title={p.selectTitle}>
        <input type="checkbox" checked={p.selected} disabled={p.selectDisabled} onChange={p.onToggle} />
        <span className="pg-sr">{p.selected ? `Remove ${p.name} from request` : `Add ${p.name} to request`}</span>
      </label>
      <InitialsAvatar name={p.name} />

      <div className="pc-main">
        <div className="pc-title">
          <h3>{p.name}</h3>
          {p.badges}
        </div>
        {p.industries.length > 0 && (
          <div className="pc-chips">
            {p.industries.map((industry) => <span className="pg-chip" key={industry}>{industry}</span>)}
          </div>
        )}
        {(firstSuburbs.length > 0 || p.serviceArea) && (
          <p className="pc-line">
            <PinIcon />
            <span>
              {firstSuburbs.length > 0 ? firstSuburbs.join(' · ') : p.serviceArea}
              {moreSuburbs > 0 && ` +${moreSuburbs} suburb${moreSuburbs > 1 ? 's' : ''}`}
            </span>
          </p>
        )}
        {p.note && (
          <p className="pc-line pc-line-muted">
            <ClockIcon />
            <span>{p.note}</span>
          </p>
        )}
      </div>

      <div className="pc-stats">
        {p.reviewCount > 0 ? (
          <p className="pc-rating">
            <StarIcon />
            <strong>{p.averageRating.toFixed(1)}</strong>
            <span>({p.reviewCount} review{p.reviewCount === 1 ? '' : 's'})</span>
          </p>
        ) : (
          <p className="pc-rating pc-rating-none">No reviews yet</p>
        )}
        <p className="pc-jobs">{p.jobsCompleted} job{p.jobsCompleted === 1 ? '' : 's'} completed</p>
      </div>

      <div className="pc-actions">{p.actions}</div>
    </article>
  )
}

/* Grid view: about the height of the old grid cards. Same checkbox, same
   buttons; "Last used" is left out here (it stays in List view). */
function CompactCard(p: Props) {
  const firstSuburbs = p.suburbs.slice(0, SUBURBS_SHOWN_COMPACT)
  const moreSuburbs = p.suburbs.length - firstSuburbs.length
  const place = firstSuburbs.length > 0
    ? `${firstSuburbs.join(' · ')}${moreSuburbs > 0 ? ` +${moreSuburbs}` : ''}`
    : p.serviceArea ?? ''
  const placeFull = p.suburbs.length > 0 ? p.suburbs.join(', ') : p.serviceArea ?? ''
  const [firstIndustry, ...otherIndustries] = p.industries
  const jobs = `${p.jobsCompleted} job${p.jobsCompleted === 1 ? '' : 's'}`

  return (
    <article className={`pc-card pc-compact${p.selected ? ' is-selected' : ''}`}>
      <div className="pc-c-top">
        <label className="pc-pick" title={p.selectTitle}>
          <input type="checkbox" checked={p.selected} disabled={p.selectDisabled} onChange={p.onToggle} />
          <span className="pg-sr">{p.selected ? `Remove ${p.name} from request` : `Add ${p.name} to request`}</span>
        </label>
        <InitialsAvatar name={p.name} />
        {/* Always in full (providers pay for their name); wraps, never cut. */}
        <h3 className="pc-c-name">{p.name}</h3>
      </div>

      {(p.badges || firstIndustry) && (
        <div className="pc-c-chips">
          {p.badges}
          {firstIndustry && (
            <span className="pg-chip" title={otherIndustries.length > 0 ? p.industries.join(', ') : undefined}>
              {firstIndustry}
              {otherIndustries.length > 0 && ` +${otherIndustries.length}`}
            </span>
          )}
        </div>
      )}

      {place && (
        <p className="pc-c-line" title={placeFull}>
          <PinIcon />
          <span className="pc-ellip">{place}</span>
        </p>
      )}

      <p className="pc-c-stats">
        {p.reviewCount > 0 ? (
          <>
            <StarIcon size={15} />
            <strong>{p.averageRating.toFixed(1)}</strong>
            <span>({p.reviewCount}<span className="pg-sr"> review{p.reviewCount === 1 ? '' : 's'}</span>)</span>
          </>
        ) : (
          <span>No reviews yet</span>
        )}
        <span aria-hidden="true">·</span>
        <span>{jobs}</span>
      </p>

      <div className="pc-actions">{p.actions}</div>
    </article>
  )
}
