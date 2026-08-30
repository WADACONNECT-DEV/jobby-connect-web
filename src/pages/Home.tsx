import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { usePersistedValue } from '../listView'
import { formatMoney, type Wallet } from '../types'
import { useAuth } from '../auth'

interface Tile { t: string; d: string; to?: string; soon?: boolean }

const CUSTOMER_TILES: Tile[] = [
  { t: 'Find & request quotes', d: 'Search providers by service and suburb, then request quotes from up to three.', to: '/search' },
  { t: 'Your Jobby Mates', d: 'Re-request providers you\'ve saved, without searching again.', to: '/mates' },
  { t: 'Your requests & jobs', d: 'Track your requests, compare quotes, accept, and follow the job to completion.', to: '/jobs' },
  { t: 'Mate Points', d: 'Your points balance and history — redeemable on future bookings.', to: '/wallet' },
  { t: 'Jobby Mate referrals', d: 'Invite providers and friends onto Jobby-Connect and earn Mate Points for successful referrals.', to: '/jobby-mate' },
]

const PROVIDER_TILES: Tile[] = [
  { t: 'Requests to me', d: 'See the quote requests customers have sent you and reply.', to: '/requests' },
  { t: 'Your quotes', d: 'Track the quotes you\'ve sent and which were accepted.', to: '/my-quotes' },
  { t: 'Your work', d: 'Jobs you\'ve won — start the work and see it through.', to: '/my-work' },
  { t: 'Provider profile', d: 'Update your business details, service areas, industries and GST status.', to: '/provider' },
  { t: 'Jobby Mate referrals', d: 'Invite your existing customers on board — optionally gift them Mate Points as a welcome.', to: '/jobby-mate' },
]

function TileGrid({ tiles }: { tiles: Tile[] }) {
  const navigate = useNavigate()
  return (
    <div className="grid2">
      {tiles.map((tile) => (
        <div className={`panel${tile.to ? ' panel-active' : ''}`} key={tile.t}
             onClick={() => tile.to && navigate(tile.to)} role={tile.to ? 'button' : undefined}>
          <h3>{tile.t}{tile.soon && <span className="soon">COMING SOON</span>}</h3>
          <p>{tile.d}</p>
        </div>
      ))}
    </div>
  )
}

type Role = 'customer' | 'provider'

/**
 * The dashboard. One account can hold both roles, so this is a role switcher —
 * but only for people who actually have both (UAT Round 1 §4.1/§4.2).
 *
 * A plain customer sees no provider section and no "Become a provider" button;
 * that entry point moved to Account settings. Someone whose provider
 * application is still pending sees only their Customer tab, with the pending
 * status shown there (§4.2, and open item 7.2 — "somewhere sensible"; the
 * customer dashboard is where they'll look). Both tabs appear only once an
 * admin has approved them.
 */
export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.fullName.split(' ')[0] ?? 'there'

  const [points, setPoints] = useState<number | null>(null)
  useEffect(() => {
    if (user?.customerProfileComplete) {
      api<Wallet>('/points/wallet', 'GET').then((w) => setPoints(w.balance)).catch(() => {})
    }
  }, [user?.customerProfileComplete])

  const customerReady = user?.customerProfileComplete ?? false
  const hasProvider = user?.hasProviderProfile ?? false
  const approval = user?.providerApprovalStatus ?? null
  const isApprovedProvider = hasProvider && approval === 'APPROVED'

  // Which tab is open survives navigating away and coming back (UAT §5.3).
  const [role, setRole] = usePersistedValue<Role>('home.role', 'customer')
  const activeRole: Role = isApprovedProvider ? role : 'customer'

  return (
    <>
      <section className="welcome">
        <h2>Welcome, {firstName}!</h2>
        <p>
          {isApprovedProvider
            ? 'Switch between requesting work and providing it.'
            : 'Request quotes from providers you choose.'}
        </p>
      </section>

      {isApprovedProvider && (
        <div className="role-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeRole === 'customer'}
            className={`role-tab customer${activeRole === 'customer' ? ' on' : ''}`}
            onClick={() => setRole('customer')}
          >
            As a customer
          </button>
          <button
            role="tab"
            aria-selected={activeRole === 'provider'}
            className={`role-tab provider${activeRole === 'provider' ? ' on' : ''}`}
            onClick={() => setRole('provider')}
          >
            As a provider
          </button>
        </div>
      )}

      {activeRole === 'customer' && (
        <div className="role-pane customer">
          <div className="area-head">
            <h3>{isApprovedProvider ? 'As a customer' : 'Your dashboard'}</h3>
            {points !== null && <span className="points-chip">Mate Points: {formatMoney(points)}</span>}
          </div>

          {/* A pending or rejected application is surfaced here, because this is
              the only tab the applicant can see until they're approved. */}
          {hasProvider && approval === 'PENDING' && (
            <div className="banner banner-pending">
              <strong>Your provider application is pending approval.</strong> Once an admin approves
              it, your Provider tab will appear here.{' '}
              <button className="link-btn" onClick={() => navigate('/account')}>View in Account</button>
            </div>
          )}
          {hasProvider && approval === 'REJECTED' && (
            <div className="banner banner-rejected">
              <strong>Your provider application wasn't approved.</strong>{' '}
              <button className="link-btn" onClick={() => navigate('/account')}>Review in Account</button>
            </div>
          )}

          {customerReady ? (
            <TileGrid tiles={CUSTOMER_TILES} />
          ) : (
            <div className="gate-card">
              <p>Complete a quick customer profile (name + mobile) to start requesting quotes.</p>
              <button className="btn btn-amber btn-sm" onClick={() => navigate('/customer-profile')}>Complete customer profile</button>
            </div>
          )}
        </div>
      )}

      {activeRole === 'provider' && (
        <div className="role-pane provider">
          <div className="area-head"><h3>As a provider</h3></div>
          <TileGrid tiles={PROVIDER_TILES} />
        </div>
      )}
    </>
  )
}
