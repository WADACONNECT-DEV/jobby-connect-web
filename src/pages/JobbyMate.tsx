import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { usePersistedValue } from '../listView'
import { initialsOf } from '../components/mates/MateCard'
import {
  formatDate,
  formatMoney,
  referralStatusLabel,
  type MateConnection,
  type InviteResult,
  type ReferralActionResult,
} from '../types'

/**
 * Jobby Mate Referrals (redesign step 6, owner's referrals design).
 *
 * One page for both roles. This redesign is the customer view; the two
 * provider-only sections ("Invite your customers", "Referral offers awaiting
 * you") keep their fields and behaviour, in the same card style, until the
 * provider view is redesigned.
 *
 * Every call and rule is unchanged: invite, claim, accept / decline, bulk
 * invite and the unpaid-points report. New on screen:
 *  - "Your connections" (renamed from "Your Jobby Mates", which is tab 1's
 *    name) with a Status filter; filter and search are remembered after Back.
 *  - points shown with their dollar value at the admin rate, "20 pts · $2.00"
 *    (owner decision 3 Nov 2026 §2).
 *  - invites sent that nobody has joined from yet, as "Invited — waiting to
 *    join" rows (returned by the API alongside the connections).
 */
export default function JobbyMate() {
  const { user } = useAuth()
  const isProvider = user?.hasProviderProfile ?? false

  const [mates, setMates] = useState<MateConnection[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api<MateConnection[]>('/me/jobby-mates', 'GET')
      .then((m) => setMates(m))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your Jobby Mates.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // ---- claim a referral code (for a newly-registered member) ----
  const [claimCode, setClaimCode] = useState('')
  const claim = () => {
    setError(''); setNotice('')
    api<ReferralActionResult>('/referrals/claim', 'POST', { referralCode: claimCode.trim() })
      .then((r) => { setNotice(r.message); setClaimCode(''); load() })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not claim that code.'))
  }

  // ---- Flow A: customer invites a provider ----
  const [provMobile, setProvMobile] = useState('')
  const [provName, setProvName] = useState('')
  const [provIndustry, setProvIndustry] = useState('')
  const inviteProvider = () => {
    setError(''); setNotice('')
    api<InviteResult>('/referrals/invite', 'POST', {
      mobiles: [provMobile.trim()],
      inviteeType: 'PROVIDER',
      nameHint: provName.trim() || null,
      industryHint: provIndustry.trim() || null,
    })
      .then((res) => {
        setNotice(summarise(res)); setProvMobile(''); setProvName(''); setProvIndustry(''); load()
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not send the invite.'))
  }

  // ---- Flow B: provider invites customers (bulk) ----
  const [custMobiles, setCustMobiles] = useState('')
  const [offerPoints, setOfferPoints] = useState(false)
  const [pointsAmount, setPointsAmount] = useState('')
  const inviteCustomers = () => {
    setError(''); setNotice('')
    const mobiles = custMobiles.split(/[\n,]/).map((m) => m.trim()).filter(Boolean)
    if (mobiles.length === 0) { setError('Enter at least one mobile number.'); return }
    api<InviteResult>('/referrals/invite', 'POST', {
      mobiles,
      inviteeType: 'CUSTOMER',
      pointsOffered: offerPoints ? Number(pointsAmount || '0') : null,
    })
      .then((res) => { setNotice(summarise(res)); setCustMobiles(''); setPointsAmount(''); setOfferPoints(false); load() })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not send the invites.'))
  }

  // ---- Flow A: provider accepts / declines a pending offer ----
  const decide = (id: string, action: 'accept' | 'decline') => {
    setError(''); setNotice('')
    api<ReferralActionResult>(`/referrals/${id}/${action}`, 'POST')
      .then((r) => { setNotice(r.message); load() })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not update the referral.'))
  }

  // ---- Flow B: customer reports unpaid points ----
  const complain = (id: string) => {
    setError(''); setNotice('')
    api<void>(`/referrals/${id}/complaints`, 'POST', { reason: 'Referral points not received' })
      .then(() => { setNotice('Thanks — your report has been sent to our team.'); load() })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not send your report.'))
  }

  // pending Flow A offers awaiting THIS provider's decision
  const pendingOffers = mates.filter(
    (m) => m.referralRecordId && m.direction === 'REFERRED_ME' && m.pointsStatus === 'OFFERED',
  )

  // ---- connection list: status filter + search, remembered after Back ----
  const [status, setStatus] = usePersistedValue<string>('referrals.status', '')
  const [filter, setFilter] = usePersistedValue<string>('referrals.search', '')
  const statusesPresent = useMemo(
    () => Array.from(new Set(mates.map((m) => m.pointsStatus))),
    [mates],
  )
  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    return mates
      .filter((m) => !status || m.pointsStatus === status)
      .filter((m) => !f
        || (m.otherPartyName ?? '').toLowerCase().includes(f)
        || (m.industry ?? '').toLowerCase().includes(f)
        || (m.suburb ?? '').toLowerCase().includes(f)
        || (m.inviteMobile ?? '').replace(/\s+/g, '').includes(f.replace(/\s+/g, '')))
  }, [mates, filter, status])

  return (
    <div className="mt jr">
      <div className="mt-head">
        <div className="mt-head-copy">
          <PeoplePlusIcon />
          <div>
            <h2 className="mt-title">Jobby Mate Referrals</h2>
            <p className="mt-sub">Bring a provider you trust onto Jobby-Connect — and stay connected as Jobby Mates.</p>
          </div>
        </div>
      </div>

      {/* How it works (Referral Program Spec §3.1 / §5) */}
      <div className="jr-how">
        <ol className="jr-steps">
          <li><span className="jr-n">1</span>Invite a provider by mobile</li>
          <li><span className="jr-n">2</span>They join Jobby-Connect</li>
          <li><span className="jr-n">3</span>They accept your referral</li>
          <li><span className="jr-n">4</span>You earn Mate Points</li>
        </ol>
        <p className="jr-how-note">If they decline, you still stay connected — no points are earned.</p>
      </div>

      {error && <div className="jr-msg is-err" role="alert">{error}</div>}
      {notice && <div className="jr-msg is-ok" role="status">{notice}</div>}

      <div className="jr-cards">
        {/* Flow A: invite a provider (any member can) */}
        <section className="jr-card">
          <h3 className="jr-card-title">Invite a provider <span className="jr-badge">EARN POINTS</span></h3>
          <p className="jr-card-sub">Know a great tradie or local business? Send them an invite. When they join and accept, you earn Mate Points.</p>
          <form className="jr-form" onSubmit={(e) => { e.preventDefault(); if (provMobile.trim()) inviteProvider() }}>
            <label className="mt-field is-full">
              <span>PROVIDER MOBILE NUMBER</span>
              <input type="tel" inputMode="tel" placeholder="04xx xxx xxx" value={provMobile}
                onChange={(e) => setProvMobile(e.target.value)} />
            </label>
            <label className="mt-field">
              <span>THEIR NAME (OPTIONAL)</span>
              <input placeholder="e.g. Sam's Plumbing" value={provName} onChange={(e) => setProvName(e.target.value)} />
            </label>
            <label className="mt-field">
              <span>INDUSTRY (OPTIONAL)</span>
              <input placeholder="e.g. Plumbing" value={provIndustry} onChange={(e) => setProvIndustry(e.target.value)} />
            </label>
            <button type="submit" className="jr-send" disabled={!provMobile.trim()}>Send invite →</button>
          </form>
        </section>

        {/* claim a code */}
        <section className="jr-card is-blue">
          <h3 className="jr-card-title">Have a referral code?</h3>
          <p className="jr-card-sub">Someone invited you? Enter the code from your message to connect with them.</p>
          <form className="jr-claim" onSubmit={(e) => { e.preventDefault(); if (claimCode.trim()) claim() }}>
            <label className="mt-field">
              <span>REFERRAL CODE</span>
              <input placeholder="Referral code" value={claimCode} onChange={(e) => setClaimCode(e.target.value)} />
            </label>
            <button type="submit" className="jr-claim-btn" disabled={!claimCode.trim()}>Claim</button>
          </form>
          <p className="jr-note"><InfoIcon /> Codes are in the text message your Jobby Mate sent you.</p>
        </section>
      </div>

      {/* Flow B: provider invites customers - provider view, restyled only */}
      {isProvider && (
        <section className="jr-card">
          <h3 className="jr-card-title">Invite your customers</h3>
          <p className="jr-card-sub">Bring your existing clients on board. Optionally gift them Mate Points as a welcome — you fund those points when they join.</p>
          <div className="jr-form is-stack">
            <label className="mt-field">
              <span>MOBILE NUMBERS — ONE PER LINE</span>
              <textarea rows={4} placeholder="0412 345 678" value={custMobiles} onChange={(e) => setCustMobiles(e.target.value)} />
            </label>
            <label className="mt-radio">
              <input type="checkbox" checked={offerPoints} onChange={(e) => setOfferPoints(e.target.checked)} />
              Offer Mate Points as a joining bonus
            </label>
            {offerPoints && (
              <label className="mt-field jr-narrow">
                <span>POINTS PER CUSTOMER</span>
                <input type="number" min={0} value={pointsAmount} onChange={(e) => setPointsAmount(e.target.value)} />
              </label>
            )}
            <button type="button" className="jr-send is-auto" onClick={inviteCustomers}>Send invites</button>
          </div>
        </section>
      )}

      {/* pending Flow A offers for a provider to accept/decline - provider view, restyled only */}
      {pendingOffers.length > 0 && (
        <section className="jr-card is-offers">
          <h3 className="jr-card-title">Referral offers awaiting you</h3>
          <p className="jr-card-sub">A customer referred you. Accept to grant them the Mate Points shown (you fund these), or decline — either way you stay connected.</p>
          {pendingOffers.map((o) => (
            <div className="jr-offer" key={o.referralRecordId}>
              <span><strong>{o.otherPartyName ?? 'A customer'}</strong>
                <span className="jr-muted"> · would earn {pointsText(o)}</span></span>
              <span className="jr-offer-actions">
                <button className="jr-claim-btn" onClick={() => decide(o.referralRecordId!, 'accept')}>Accept</button>
                <button className="mt-btn-ghost" onClick={() => decide(o.referralRecordId!, 'decline')}>Decline</button>
              </span>
            </div>
          ))}
        </section>
      )}

      {/* connections list */}
      <div className="mt-toolbar jr-conn-head">
        <h3 className="jr-conn-title">Your connections <span className="jr-count">· {mates.length}</span></h3>
        <div className="mt-toolbar-end">
          <label className="mt-sort">
            <span className="mc-sr">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {statusesPresent.map((s) => <option key={s} value={s}>{referralStatusLabel(s)}</option>)}
            </select>
          </label>
          <span className="mt-input jr-search">
            <SearchIcon />
            <input type="search" placeholder={isProvider ? 'Name, suburb or industry' : 'Name or industry'}
              value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search connections" />
          </span>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : mates.length === 0 ? (
        <div className="mt-empty"><p>No connections yet. Send your first invite above.</p></div>
      ) : filtered.length === 0 ? (
        <div className="mt-empty">
          <p>No connections match these filters.</p>
          <button className="mt-btn-ghost" onClick={() => { setStatus(''); setFilter('') }}>Clear filters</button>
        </div>
      ) : (
        <div className="jr-list">
          {filtered.map((m) => {
            const isInvite = !m.referralRecordId
            const name = isInvite
              ? (m.otherPartyType === 'PROVIDER' ? 'Provider invite' : 'Customer invite')
              : (m.otherPartyName ?? (m.otherPartyType === 'PROVIDER' ? 'Provider' : 'Customer'))
            const details = isInvite
              ? [m.inviteMobile, m.expiresAt && m.pointsStatus === 'INVITED' ? `link valid until ${formatDate(m.expiresAt)}` : null]
              : [m.industry, m.suburb, m.direction === 'REFERRED_BY_ME' ? 'You referred them' : 'They referred you']
            return (
              <div className={`jr-row${isInvite ? ' is-invite' : ''}`} key={m.referralRecordId ?? m.inviteId ?? m.createdAt}>
                <span className={`mc-avatar jr-avatar${isInvite ? ' is-invite' : ''}`} aria-hidden="true">
                  {isInvite ? '…' : initialsOf(name)}
                </span>
                <span className="jr-who">
                  <strong>{name}</strong>
                  <span className="jr-muted">{details.filter(Boolean).join(' · ')}</span>
                </span>
                <span className={`jr-chip is-${m.pointsStatus.toLowerCase()}`}>{referralStatusLabel(m.pointsStatus)}</span>
                <span className="jr-amt">{pointsText(m)}</span>
                <span className="jr-date">{formatDate(m.createdAt)}</span>
                <span className="jr-act">
                  {m.referralRecordId && m.pointsStatus === 'PAYMENT_OVERDUE' && m.direction === 'REFERRED_ME' && (
                    <button className="mc-remove" onClick={() => complain(m.referralRecordId!)}>Report unpaid</button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** "20 pts · $2.00", or "—" when no points are involved. */
function pointsText(m: MateConnection): string {
  if (!m.pointsAmount) return '—'
  const value = m.pointsValue
  return value === null || value === undefined
    ? `${m.pointsAmount} pts`
    : `${m.pointsAmount} pts · ${formatMoney(value)}`
}

function summarise(res: InviteResult): string {
  const parts: string[] = []
  if (res.sent.length > 0) parts.push(`${res.sent.length} invite${res.sent.length > 1 ? 's' : ''} sent`)
  if (res.skipped.length > 0) {
    parts.push(res.skipped.map((s) => `${s.mobile}: ${s.reason}`).join('; '))
  }
  return parts.join(' · ') || 'Nothing to send.'
}

/* ---------- icons (decorative) ---------- */

function PeoplePlusIcon() {
  return (
    <svg aria-hidden="true" className="mt-head-ico" width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="#0F2A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3.2" /><circle cx="15.5" cy="9" r="2.6" />
      <path d="M2.5 19c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5M13.5 14.2c.6-.2 1.3-.3 2-.3 2.6 0 4.5 1.9 4.5 4.6" />
      <path d="M19.5 2.5v4M17.5 4.5h4" stroke="#D9A400" strokeWidth="2.2" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6E86"
      strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" /></svg>
  )
}
function InfoIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#24405F"
      strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
  )
}
