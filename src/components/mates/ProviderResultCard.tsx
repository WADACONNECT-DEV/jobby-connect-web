import { formatMoney, type ProviderSummary } from '../../types'
import { initialsOf } from './MateCard'

/**
 * One search result on Find & Request Quotes (redesign step 4), in the same
 * layout and classes as a saved-mate card. Presentational only: selection,
 * save and navigation are handed in by Search.tsx unchanged.
 */

const SUBURBS_SHOWN = 3
const SERVICES_SHOWN = 3

interface Props {
  provider: ProviderSummary
  selected: boolean
  blocked: boolean
  blockedTitle: string
  saved: boolean
  onToggle: () => void
  onViewProfile: () => void
  onSave: () => void
}

export function ProviderResultCard({ provider: p, selected, blocked, blockedTitle, saved, onToggle, onViewProfile, onSave }: Props) {
  const industries = p.industries ?? []
  const services = p.services ?? []
  const suburbs = p.suburbs ?? []
  const extraSuburbs = suburbs.length - SUBURBS_SHOWN
  const extraServices = services.length - SERVICES_SHOWN

  return (
    <article className={`mc mc-grid${selected ? ' is-selected' : ''}`}>
      <label className="mc-check" title={blocked ? blockedTitle : 'Include in one request'}>
        <input type="checkbox" checked={selected} disabled={blocked} onChange={onToggle} />
        <span className="mc-sr">Select {p.businessName}</span>
      </label>

      <span className="mc-avatar" aria-hidden="true">{initialsOf(p.businessName)}</span>

      <div className="mc-body">
        <div className="mc-title">
          <h3>{p.businessName}</h3>
          {p.promoPoints > 0 && <span className="mc-bonus">+{formatMoney(p.promoPoints)} Mate Points offered</span>}
        </div>

        {industries.length > 0 && (
          <div className="mc-chips">
            {industries.map((industry) => <span className="mc-chip" key={industry}>{industry}</span>)}
          </div>
        )}

        {suburbs.length > 0 ? (
          <div className="mc-line">
            <PinIcon />
            <span>
              {suburbs.slice(0, SUBURBS_SHOWN).join(' · ')}
              {extraSuburbs > 0 && ` +${extraSuburbs} suburb${extraSuburbs > 1 ? 's' : ''}`}
            </span>
          </div>
        ) : (
          p.serviceArea && <div className="mc-line"><PinIcon /><span>{p.serviceArea}</span></div>
        )}

        {services.length > 0 && (
          <div className="mc-tags">
            {services.slice(0, SERVICES_SHOWN).map((s) => <span className="mc-tag" key={s}>{s}</span>)}
            {extraServices > 0 && <span className="mc-tag is-more">+{extraServices} more</span>}
          </div>
        )}
      </div>

      {/* The three figures the ranking is built on, so the order on screen is
          explainable rather than mysterious (UAT Round 4 3.3-3.5). */}
      <div className="mc-stats">
        {p.reviewCount > 0 ? (
          <span className="mc-rating">
            <StarIcon />
            <strong>{p.averageRating.toFixed(1)}</strong>
            <span className="mc-reviews">({p.reviewCount} review{p.reviewCount === 1 ? '' : 's'})</span>
          </span>
        ) : (
          <span className="mc-reviews">No reviews yet</span>
        )}
        {p.reviewCount > 0 && <span className="mc-jobs">{p.ratingPercent}% rating</span>}
        <span className="mc-jobs">{p.jobsCompleted} job{p.jobsCompleted === 1 ? '' : 's'} completed</span>
      </div>

      <div className="mc-actions">
        <button type="button" className={`mc-btn ${selected ? 'is-selected' : 'is-add'}`}
          onClick={onToggle} disabled={blocked} title={blocked ? blockedTitle : undefined} aria-pressed={selected}>
          {selected ? '✓ Selected' : 'Add to request'}
        </button>
        <button type="button" className="mc-btn is-ghost" onClick={onViewProfile}>View profile</button>
        <button type="button" className="mc-remove mc-save" onClick={onSave} disabled={saved}>
          {saved ? '♥ Saved' : '♡ Save as Jobby Mate'}
        </button>
      </div>
    </article>
  )
}

function PinIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="#0B2038">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  )
}
function StarIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="#F7A400">
      <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" />
    </svg>
  )
}
