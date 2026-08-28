import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import {
  formatMoney,
  referralStatusLabel,
  type MateConnection,
  type InviteResult,
  type ReferralActionResult,
} from '../types'

export default function JobbyMate() {
  const navigate = useNavigate()
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

  // ---- connection list + filter ----
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return mates
    return mates.filter((m) =>
      (m.otherPartyName ?? '').toLowerCase().includes(f) ||
      (m.industry ?? '').toLowerCase().includes(f) ||
      (m.suburb ?? '').toLowerCase().includes(f),
    )
  }, [mates, filter])

  return (
    <>
      <div className="page-head">
        <h2>Jobby Mate</h2>
        <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/home')}>← Home</button>
      </div>
      <p className="muted">
        Invite people you know onto Jobby-Connect and earn Mate Points for successful referrals.
        Connections stay in your Jobby Mate list regardless of points.
      </p>

      {error && <div className="msg err">{error}</div>}
      {notice && <div className="msg ok">{notice}</div>}

      {/* claim a code */}
      <div className="jm-card">
        <h3>Have a referral code?</h3>
        <p className="muted">If someone invited you, enter the code from your message to connect.</p>
        <div className="jm-row">
          <input className="input" placeholder="Referral code" value={claimCode}
                 onChange={(e) => setClaimCode(e.target.value)} />
          <button className="btn btn-dark btn-sm" disabled={!claimCode.trim()} onClick={claim}>Claim</button>
        </div>
      </div>

      {/* Flow A: invite a provider (any member can) */}
      <div className="jm-card">
        <h3>Invite a provider</h3>
        <p className="muted">Know a great tradie or business? Invite them — when they join and accept, you earn Mate Points.</p>
        <div className="jm-form">
          <input className="input" placeholder="Provider mobile number" value={provMobile}
                 onChange={(e) => setProvMobile(e.target.value)} />
          <input className="input" placeholder="Their name (optional)" value={provName}
                 onChange={(e) => setProvName(e.target.value)} />
          <input className="input" placeholder="Industry (optional)" value={provIndustry}
                 onChange={(e) => setProvIndustry(e.target.value)} />
          <button className="btn btn-amber btn-sm" disabled={!provMobile.trim()} onClick={inviteProvider}>Send invite</button>
        </div>
      </div>

      {/* Flow B: provider invites customers */}
      {isProvider && (
        <div className="jm-card">
          <h3>Invite your customers</h3>
          <p className="muted">Bring your existing clients on board. Optionally gift them Mate Points as a welcome — you fund those points when they join.</p>
          <textarea className="input jm-textarea" placeholder="Mobile numbers — one per line" value={custMobiles}
                    onChange={(e) => setCustMobiles(e.target.value)} />
          <label className="jm-check">
            <input type="checkbox" checked={offerPoints} onChange={(e) => setOfferPoints(e.target.checked)} />
            Offer Mate Points as a joining bonus
          </label>
          {offerPoints && (
            <input className="input" type="number" min={0} placeholder="Points per customer" value={pointsAmount}
                   onChange={(e) => setPointsAmount(e.target.value)} />
          )}
          <button className="btn btn-amber btn-sm" onClick={inviteCustomers}>Send invites</button>
        </div>
      )}

      {/* pending Flow A offers for a provider to accept/decline */}
      {pendingOffers.length > 0 && (
        <div className="jm-card jm-offers">
          <h3>Referral offers awaiting you</h3>
          <p className="muted">A customer referred you. Accept to grant them the Mate Points shown (you fund these), or decline — either way you stay connected.</p>
          {pendingOffers.map((o) => (
            <div className="jm-offer-row" key={o.referralRecordId}>
              <div>
                <strong>{o.otherPartyName ?? 'A customer'}</strong>
                <span className="pay-meta"> · would earn {o.pointsAmount} points</span>
              </div>
              <div className="jm-offer-actions">
                <button className="btn btn-dark btn-sm" onClick={() => decide(o.referralRecordId, 'accept')}>Accept</button>
                <button className="btn btn-ghost-dark btn-sm" onClick={() => decide(o.referralRecordId, 'decline')}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* connections list */}
      <div className="page-head" style={{ marginTop: 22 }}>
        <h3>Your Jobby Mates</h3>
        <input className="input jm-filter" placeholder={isProvider ? 'Filter by suburb / name' : 'Filter by industry / name'}
               value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty"><p>No Jobby Mate connections yet. Send an invite above to get started.</p></div>
      ) : (
        <div className="md-panel">
          {filtered.map((m) => (
            <div className="jm-conn" key={m.referralRecordId}>
              <div className="jm-conn-main">
                <strong>{m.otherPartyName ?? (m.otherPartyType === 'PROVIDER' ? 'Provider' : 'Customer')}</strong>
                <span className="pay-meta">
                  {m.otherPartyType === 'PROVIDER'
                    ? [m.industry, m.suburb].filter(Boolean).join(' · ')
                    : (m.direction === 'REFERRED_BY_ME' ? 'You referred them' : 'They referred you')}
                </span>
              </div>
              <div className="jm-conn-side">
                <span className={`jm-badge jm-${m.pointsStatus.toLowerCase()}`}>{referralStatusLabel(m.pointsStatus)}</span>
                {m.pointsAmount > 0 && <span className="pay-meta"> {m.pointsAmount} pts</span>}
                {m.pointsStatus === 'PAYMENT_OVERDUE' && m.direction === 'REFERRED_ME' && (
                  <button className="btn btn-ghost-dark btn-sm" onClick={() => complain(m.referralRecordId)}>Report unpaid</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
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
