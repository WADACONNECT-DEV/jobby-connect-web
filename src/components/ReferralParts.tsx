import type { ReactNode } from 'react'
import { formatDate, referralStatusLabel, type MateConnection, type ReferralPointsStatus } from '../types'
import { InitialsAvatar } from './PageParts'

/* Display-only pieces for Jobby Mate Referrals (HANDOFF-referrals Part F).
   Styles: `rf-` in index.css. Nothing here calls the API. */

export const PeoplePlusIcon = () => (
  <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="3.2" />
    <circle cx="15.5" cy="9.5" r="2.6" />
    <path d="M2.5 20c0-3.3 2.5-5.6 5.5-5.6s5.5 2.3 5.5 5.6M13.5 15.3c.6-.3 1.3-.4 2-.4 2.6 0 4.5 2 4.5 5" />
    <path d="M19.5 2.5v4M17.5 4.5h4" stroke="#D9A400" strokeWidth="2" />
  </svg>
)

const STEPS = [
  'Invite a provider by mobile',
  'They join Jobby-Connect',
  'They accept your referral',
  'You earn Mate Points',
]

/** Flow A in four steps (Referral Program Spec §3), with the decline rule (§3.1 / §5). */
export function HowItWorks() {
  return (
    <section className="rf-how" aria-label="How referrals work">
      <ol>
        {STEPS.map((s, i) => (
          <li key={s}>
            <span className="rf-how-n" aria-hidden="true">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="rf-how-note">If they decline, you still stay connected — no points are earned.</p>
    </section>
  )
}

const STATUS_TONE: Record<ReferralPointsStatus, string> = {
  PAID: 'granted',
  OFFERED: 'pending',
  PENDING_PAYMENT: 'pending',
  NONE: 'connected',
  DECLINED: 'declined',
  PAYMENT_OVERDUE: 'overdue',
}

/** The app's own labels (`referralStatusLabel`); colour AND lightness differ per status. */
export function ReferralStatusChip({ status }: { status: ReferralPointsStatus }) {
  return <span className={`rf-chip rf-chip-${STATUS_TONE[status] ?? 'connected'}`}>{referralStatusLabel(status)}</span>
}

/** One connection: who, what, status, points (as today: "{n} pts", "—" when 0), date, and any action. */
export function ConnectionRow({ c, action }: { c: MateConnection; action?: ReactNode }) {
  const name = c.otherPartyName ?? (c.otherPartyType === 'PROVIDER' ? 'Provider' : 'Customer')
  const details = [
    c.industry,
    c.suburb,
    c.direction === 'REFERRED_BY_ME' ? 'You referred them' : 'They referred you',
  ].filter(Boolean).join(' · ')
  return (
    <li className="rf-row">
      <InitialsAvatar name={name} />
      <div className="rf-row-main">
        <span className="rf-row-name">{name}</span>
        <span className="rf-row-details">{details}</span>
      </div>
      <div className="rf-row-status"><ReferralStatusChip status={c.pointsStatus} /></div>
      <span className="rf-row-pts">{c.pointsAmount > 0 ? `${c.pointsAmount} pts` : '—'}</span>
      <span className="rf-row-date">{formatDate(c.createdAt)}</span>
      <span className="rf-row-action">{action}</span>
    </li>
  )
}
