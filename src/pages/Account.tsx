import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

/**
 * Account settings. This is where the "Become a provider" entry point now lives
 * (UAT Round 1 §4.1 — it used to sit on the customer dashboard, shown to every
 * customer whether they wanted it or not; §4.1 proposed account settings as the
 * natural home, and open item 7.1 leaves the final placement to product).
 */
export default function Account() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const hasProvider = user?.hasProviderProfile ?? false
  const approval = user?.providerApprovalStatus ?? null
  const customerReady = user?.customerProfileComplete ?? false

  return (
    <>
      <div className="page-head"><h2>Account</h2></div>
      <p className="page-intro">Your details, and how you use Jobby-Connect.</p>

      <div className="acct-card">
        <div className="acct-row">
          <span className="acct-label">Name</span>
          <span className="acct-value">{user?.fullName ?? '—'}</span>
        </div>
        <div className="acct-row">
          <span className="acct-label">Email</span>
          <span className="acct-value">{user?.email ?? '—'}</span>
        </div>
        <div className="acct-row">
          <span className="acct-label">Mobile</span>
          <span className="acct-value">{user?.mobile ?? 'Not set'}</span>
        </div>
        <div className="acct-actions">
          <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/customer-profile')}>
            {customerReady ? 'Update your details' : 'Complete your profile'}
          </button>
        </div>
      </div>

      <h3 className="acct-head">Offering your services</h3>

      {!hasProvider && (
        <div className="acct-card">
          <p>
            Work in a trade or service? Set up a provider profile to receive quote requests from
            customers. An admin reviews your application before you appear in search.
          </p>
          <div className="acct-actions">
            <button className="btn btn-amber btn-sm" onClick={() => navigate('/provider')}>
              Become a provider
            </button>
          </div>
        </div>
      )}

      {hasProvider && approval === 'PENDING' && (
        <div className="acct-card">
          <div className="banner banner-pending" style={{ marginBottom: 12 }}>
            <strong>Your provider application is pending approval.</strong> You can keep editing your
            details. Once an admin approves it, your Provider tab appears on the dashboard.
          </div>
          <div className="acct-actions">
            <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/provider')}>
              Edit provider details
            </button>
          </div>
        </div>
      )}

      {hasProvider && approval === 'REJECTED' && (
        <div className="acct-card">
          <div className="banner banner-rejected" style={{ marginBottom: 12 }}>
            <strong>Your provider application wasn't approved.</strong> Review your details and
            resubmit, or contact support if you think this is a mistake.
          </div>
          <div className="acct-actions">
            <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/provider')}>
              Review provider details
            </button>
          </div>
        </div>
      )}

      {hasProvider && approval === 'APPROVED' && (
        <div className="acct-card">
          <p>You're set up as a provider. Your Provider tab is on the dashboard.</p>
          <div className="acct-actions">
            <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/provider')}>
              Provider profile
            </button>
          </div>
        </div>
      )}
    </>
  )
}
