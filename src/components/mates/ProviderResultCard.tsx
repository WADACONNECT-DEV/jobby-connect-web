import { formatMoney, type ProviderSummary } from '../../types'
import { initialsOf } from './MateCard'
import { CardFoot, CardHead, CardMeta, CardRef, Figures, ListCard } from '../ListCard'

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

  // The Your quotes card order (owner's direction, 8 Nov 2026). The three
  // figures are the ones the ranking is built on (UAT Round 4 3.3-3.5).
  return (
    <ListCard selected={selected} className="mc-card">
      <CardHead
        avatar={initialsOf(p.businessName)}
        title={p.businessName}
        right={(
          <label title={blocked ? blockedTitle : 'Include in one request'}>
            <input type="checkbox" checked={selected} disabled={blocked} onChange={onToggle} />
            <span className="mc-sr">Select {p.businessName}</span>
          </label>
        )}
      />

      {industries.length > 0 && (
        <CardRef>{industries.map((industry) => <span className="mc-chip" key={industry}>{industry}</span>)}</CardRef>
      )}

      <Figures items={[
        {
          label: 'Rating',
          value: p.reviewCount > 0 ? <>{p.averageRating.toFixed(1)} <StarIcon /></> : '—',
          note: p.reviewCount > 0 ? `${p.ratingPercent}% · ${p.reviewCount} review${p.reviewCount === 1 ? '' : 's'}` : 'No reviews yet',
        },
        { label: 'Jobs done', value: p.jobsCompleted },
        { label: 'Bonus points', value: p.promoPoints > 0 ? `+${formatMoney(p.promoPoints)}` : '—', tone: p.promoPoints > 0 ? 'pos' : undefined, highlight: p.promoPoints > 0 },
      ]} />

      {suburbs.length > 0 ? (
        <CardMeta>
          <span>
            <PinIcon />
            {suburbs.slice(0, SUBURBS_SHOWN).join(' · ')}
            {extraSuburbs > 0 && ` +${extraSuburbs} suburb${extraSuburbs > 1 ? 's' : ''}`}
          </span>
        </CardMeta>
      ) : (
        p.serviceArea && <CardMeta><span><PinIcon />{p.serviceArea}</span></CardMeta>
      )}

      {services.length > 0 && (
        <CardMeta>
          {services.slice(0, SERVICES_SHOWN).map((s) => <span className="mc-tag" key={s}>{s}</span>)}
          {extraServices > 0 && <span className="mc-tag is-more">+{extraServices} more</span>}
        </CardMeta>
      )}

      <CardFoot>
        <button type="button" className={`mc-btn ${selected ? 'is-selected' : 'is-add'}`}
          onClick={onToggle} disabled={blocked} title={blocked ? blockedTitle : undefined} aria-pressed={selected}>
          {selected ? '✓ Selected' : 'Add to request'}
        </button>
        <button type="button" className="mc-btn is-ghost" onClick={onViewProfile}>View profile</button>
        <button type="button" className="mc-remove mc-save" onClick={onSave} disabled={saved}>
          {saved ? '♥ Saved' : '♡ Save as Jobby Mate'}
        </button>
      </CardFoot>
    </ListCard>
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
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#F7A400" style={{ verticalAlign: '-2px' }}>
      <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" />
    </svg>
  )
}
