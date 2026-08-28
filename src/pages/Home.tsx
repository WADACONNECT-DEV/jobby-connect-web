import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
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

  return (
    <>
      <section className="welcome">
        <h2>Welcome, {firstName}!</h2>
        <p>Request quotes as a customer, or set up as a provider to win work.</p>
      </section>

      {/* ---- Customer area ---- */}
      <div className="area-head">
        <h3>As a customer</h3>
        {points !== null && <span className="points-chip">Mate Points: {formatMoney(points)}</span>}
      </div>
      {customerReady ? (
        <TileGrid tiles={CUSTOMER_TILES} />
      ) : (
        <div className="gate-card">
          <p>Complete a quick customer profile (name + mobile) to start requesting quotes.</p>
          <button className="btn btn-amber btn-sm" onClick={() => navigate('/customer-profile')}>Complete customer profile</button>
        </div>
      )}

      {/* ---- Provider area ---- */}
      <div className="area-head" style={{ marginTop: 26 }}><h3>As a provider</h3></div>

      {hasProvider && approval === 'PENDING' && (
        <div className="banner banner-pending">
          <strong>Your provider profile is pending approval.</strong> You can set up your profile now, but you won't
          appear in customer search until an admin approves you.
        </div>
      )}
      {hasProvider && approval === 'REJECTED' && (
        <div className="banner banner-rejected">
          <strong>Your provider profile wasn't approved.</strong> Please review your details or contact support.
        </div>
      )}

      {hasProvider ? (
        <>
          <TileGrid tiles={PROVIDER_TILES} />
          <div className="grid2" style={{ marginTop: 12 }}>
            <div className="panel panel-active" role="button" onClick={() => navigate('/provider')}>
              <h3>Provider profile</h3>
              <p>Update your business details, service areas, industries and GST status.</p>
            </div>
          </div>
        </>
      ) : (
        <div className="gate-card">
          <p>Offer your services on Jobby-Connect. Set up a provider profile — an admin reviews it before you go live in search.</p>
          <button className="btn btn-amber btn-sm" onClick={() => navigate('/provider')}>Become a provider</button>
        </div>
      )}
    </>
  )
}
