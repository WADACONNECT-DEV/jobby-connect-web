import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { optionsFrom, useListView } from '../listView'
import {
  referralStatusLabel,
  type MateConnection,
  type InviteResult,
  type ReferralActionResult,
  type ReferralPointsStatus,
} from '../types'
import { ArrowIcon, EmptyState, PageHead, SearchIcon } from '../components/PageParts'
import { ConnectionRow, HowItWorks, PeoplePlusIcon } from '../components/ReferralParts'

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
    (m) => m.direction === 'REFERRED_ME' && m.pointsStatus === 'OFFERED',
  )

  // ---- connection list: search + status filter ----
  // Same name / industry / suburb search as before, now held by useListView so
  // it is remembered after Back (HANDOFF-referrals). The fields are joined by
  // line breaks, so a search can't match across two of them. Status filter is
  // new and only offers the statuses present. No sort: the API order stays.
  const list = useListView<MateConnection>('referrals.connections', mates, {
    search: (m) => [m.otherPartyName ?? '', m.industry ?? '', m.suburb ?? ''].join('\n'),
    filters: [
      {
        key: 'status',
        label: 'statuses',
        options: optionsFrom<MateConnection>((m) => m.pointsStatus, (v) => referralStatusLabel(v as ReferralPointsStatus)),
        match: (m, value) => m.pointsStatus === value,
      },
    ],
  })
  const statusFilter = list.filters.find((f) => f.key === 'status')

  return (
    <div className="pg rf">
      {/* The page's own "← Home" button is gone: the dashboard frame already
          has ← Back under the tab bar. */}
      <PageHead
        icon={<PeoplePlusIcon />}
        title="Jobby Mate Referrals"
        intro="Bring a provider you trust onto Jobby-Connect — and stay connected as Jobby Mates."
      />

      <HowItWorks />

      {error && <div className="pg-error" role="alert">{error}</div>}
      {notice && <div className="pg-selbar rf-notice" role="status">{notice}</div>}

      <div className="rf-cards">
        {/* Flow A: invite a provider (any member can) */}
        <section className="rf-card rf-invite" aria-labelledby="rf-invite-title">
          <div className="rf-card-head">
            <h3 id="rf-invite-title">Invite a provider</h3>
            <span className="rf-badge">EARN POINTS</span>
          </div>
          <p className="rf-card-intro">
            Know a great tradie or local business? Send them an invite. When they join and accept, you earn Mate Points.
          </p>
          <div className="pg-field">
            <label htmlFor="rf-mobile">Provider mobile number</label>
            <input id="rf-mobile" type="tel" inputMode="tel" placeholder="04xx xxx xxx" value={provMobile}
                   onChange={(e) => setProvMobile(e.target.value)} />
          </div>
          <div className="rf-pair">
            <div className="pg-field">
              <label htmlFor="rf-name">Their name (optional)</label>
              <input id="rf-name" placeholder="e.g. Sam's Plumbing" value={provName}
                     onChange={(e) => setProvName(e.target.value)} />
            </div>
            <div className="pg-field">
              <label htmlFor="rf-industry">Industry (optional)</label>
              <input id="rf-industry" placeholder="e.g. Plumbing" value={provIndustry}
                     onChange={(e) => setProvIndustry(e.target.value)} />
            </div>
          </div>
          <button type="button" className="pg-btn pg-btn-yellow rf-wide" disabled={!provMobile.trim()} onClick={inviteProvider}>
            Send invite <ArrowIcon />
          </button>
        </section>

        {/* claim a code */}
        <section className="rf-card rf-claim" aria-labelledby="rf-claim-title">
          <h3 id="rf-claim-title">Have a referral code?</h3>
          <p className="rf-card-intro">Someone invited you? Enter the code from your message to connect with them.</p>
          <div className="pg-field">
            <label htmlFor="rf-code">Referral code</label>
            <div className="rf-inline">
              <input id="rf-code" placeholder="Referral code" value={claimCode}
                     onChange={(e) => setClaimCode(e.target.value)} />
              <button type="button" className="pg-btn pg-btn-navy" disabled={!claimCode.trim()} onClick={claim}>Claim</button>
            </div>
          </div>
          <p className="rf-tip">Codes are in the text message your Jobby Mate sent you.</p>
        </section>
      </div>

      {/* Flow B: provider invites customers — provider-only, same behaviour. */}
      {isProvider && (
        <section className="rf-card" aria-labelledby="rf-bulk-title">
          <h3 id="rf-bulk-title">Invite your customers</h3>
          <p className="rf-card-intro">Bring your existing clients on board. Optionally gift them Mate Points as a welcome — you fund those points when they join.</p>
          <div className="pg-field">
            <label htmlFor="rf-bulk">Mobile numbers</label>
            <textarea id="rf-bulk" className="rf-textarea" placeholder="Mobile numbers — one per line" value={custMobiles}
                      onChange={(e) => setCustMobiles(e.target.value)} />
          </div>
          <label className="rf-check">
            <input type="checkbox" checked={offerPoints} onChange={(e) => setOfferPoints(e.target.checked)} />
            Offer Mate Points as a joining bonus
          </label>
          {offerPoints && (
            <div className="pg-field rf-points-field">
              <label htmlFor="rf-bulk-points">Points per customer</label>
              <input id="rf-bulk-points" type="number" min={0} placeholder="Points per customer" value={pointsAmount}
                     onChange={(e) => setPointsAmount(e.target.value)} />
            </div>
          )}
          <button type="button" className="pg-btn pg-btn-yellow rf-fit" onClick={inviteCustomers}>Send invites</button>
        </section>
      )}

      {/* pending Flow A offers for a provider to accept/decline */}
      {pendingOffers.length > 0 && (
        <section className="rf-card rf-offers" aria-labelledby="rf-offers-title">
          <h3 id="rf-offers-title">Referral offers awaiting you</h3>
          <p className="rf-card-intro">A customer referred you. Accept to grant them the Mate Points shown (you fund these), or decline — either way you stay connected.</p>
          <ul className="rf-offer-list">
            {pendingOffers.map((o) => (
              <li className="rf-offer" key={o.referralRecordId}>
                <span>
                  <strong>{o.otherPartyName ?? 'A customer'}</strong>
                  <span className="rf-muted"> · would earn {o.pointsAmount} points</span>
                </span>
                <span className="rf-offer-actions">
                  <button type="button" className="pg-btn pg-btn-navy rf-btn-sm" onClick={() => decide(o.referralRecordId, 'accept')}>Accept</button>
                  <button type="button" className="pg-btn pg-btn-ghost rf-btn-sm" onClick={() => decide(o.referralRecordId, 'decline')}>Decline</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* connections list — renamed from "Your Jobby Mates", which clashed with tab 1 */}
      <section className="rf-conns" aria-labelledby="rf-conns-title">
        <div className="rf-conns-head">
          <h3 id="rf-conns-title">
            Your connections <span className="rf-count">· {list.shown === list.total ? list.total : `${list.shown} of ${list.total}`}</span>
          </h3>
          {mates.length > 0 && (
            <div className="rf-conns-tools">
              {statusFilter && (
                <select
                  aria-label="Status"
                  value={list.view.filters.status ?? ''}
                  onChange={(e) => list.setFilter('status', e.target.value)}
                >
                  <option value="">All statuses</option>
                  {statusFilter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              <span className="pg-input-ico">
                <SearchIcon />
                <input
                  type="search"
                  aria-label="Search connections"
                  placeholder="Name, industry or suburb"
                  value={list.view.search}
                  onChange={(e) => list.setSearch(e.target.value)}
                />
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="pg-loading">Loading…</div>
        ) : mates.length === 0 ? (
          <EmptyState>No connections yet. Send your first invite above.</EmptyState>
        ) : list.shown === 0 ? (
          <EmptyState action={<button type="button" className="pg-btn pg-btn-ghost" onClick={list.clear}>Clear filters</button>}>
            No connections match these filters.
          </EmptyState>
        ) : (
          <ul className="rf-list">
            {list.visible.map((m) => (
              <ConnectionRow
                key={m.referralRecordId}
                c={m}
                action={m.pointsStatus === 'PAYMENT_OVERDUE' && m.direction === 'REFERRED_ME' && (
                  <button type="button" className="pg-link" onClick={() => complain(m.referralRecordId)}>Report unpaid</button>
                )}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function summarise(res: InviteResult): string {
  const parts: string[] = []
  if (res.sent.length > 0) parts.push(`${res.sent.length} invite${res.sent.length > 1 ? 's' : ''} sent`)
  if (res.skipped.length > 0) {
    parts.push(res.skipped.map((s) => `${s.mobile}: ${s.reason}`).join('; '))
  }
  return parts.join(' · ') || 'Nothing to send.'
}
