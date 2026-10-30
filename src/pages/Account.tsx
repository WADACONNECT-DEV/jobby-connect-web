import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { LockIcon, MailIcon, PasswordInput, PreviewNotice } from '../components/AuthParts'
import { ArrowIcon, PinIcon, initialsOf } from '../components/PageParts'
import {
  IdCardIcon, IdPill, InfoRow, OrNotAdded, PersonIcon, PhoneIcon, ProviderSteps, ToolboxIcon, formatMobile,
} from '../components/AccountParts'

/**
 * Account settings. This is where the "Become a provider" entry point now lives
 * (UAT Round 1 §4.1 — it used to sit on the customer dashboard, shown to every
 * customer whether they wanted it or not; §4.1 proposed account settings as the
 * natural home, and open item 7.1 leaves the final placement to product).
 */
export default function Account() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const hasProvider = user?.hasProviderProfile ?? false
  const approval = user?.providerApprovalStatus ?? null
  const customerReady = user?.customerProfileComplete ?? false

  // "Your details were updated." after saving the details form (HANDOFF-account
  // exception). Kept locally, then cleared from history so a reload doesn't repeat it.
  const [updated] = useState(() => Boolean((location.state as { detailsUpdated?: boolean } | null)?.detailsUpdated))
  useEffect(() => {
    if (updated) navigate('.', { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Change password is a preview: the fields are never sent (BACKEND-REQUESTS.md).
  const [pwOpen, setPwOpen] = useState(false)

  const name = user?.fullName ?? ''

  return (
    <div className="fr ac">
      <section className="fr-band">
        <div className="fr-band-in ac-band">
          <span className="ac-initials" aria-hidden="true">{initialsOf(name || '?')}</span>
          <div className="fr-band-copy">
            <div className="ac-band-title">
              <h1>{name || 'Your account'}</h1>
              {user?.customerRef && <code className="ac-band-pill" title="Customer ID">{user.customerRef}</code>}
              {user?.providerRef && <code className="ac-band-pill" title="Provider ID">{user.providerRef}</code>}
            </div>
            <p>Your details, sign-in and how you use Jobby-Connect.</p>
          </div>
        </div>
      </section>

      <div className="ac-body">
        <button type="button" className="pg-link ac-back" onClick={() => navigate(-1)}>← Back</button>

        {updated && <div className="ac-ok" role="status">Your details were updated.</div>}

        <div className="ac-cards">
          <section className="ac-card" aria-labelledby="ac-details">
            <div className="ac-card-head">
              <h2 id="ac-details"><PersonIcon /> Your details</h2>
              <button type="button" className="pg-btn pg-btn-ghost ac-sm" onClick={() => navigate('/customer-profile')}>
                {customerReady ? 'Edit details' : 'Complete your profile'}
              </button>
            </div>
            <InfoRow icon={<PersonIcon />} label="Name"><OrNotAdded value={user?.fullName} /></InfoRow>
            <InfoRow icon={<PhoneIcon />} label="Mobile">
              <OrNotAdded value={user?.mobile ? formatMobile(user.mobile) : null} />
            </InfoRow>
            <InfoRow icon={<PinIcon />} label="Address"><OrNotAdded value={user?.registeredAddress} /></InfoRow>
          </section>

          <section className="ac-card" aria-labelledby="ac-security">
            <div className="ac-card-head">
              <h2 id="ac-security"><LockIcon /> Sign-in &amp; security</h2>
            </div>
            <InfoRow icon={<MailIcon />} label="Email"><span className="ac-break">{user?.email ?? '—'}</span></InfoRow>
            <InfoRow icon={<LockIcon />} label="Password">
              <span className="ac-pw">
                <span aria-label="Password hidden">••••••••••</span>
                <button
                  type="button"
                  className="pg-btn pg-btn-ghost ac-sm"
                  aria-expanded={pwOpen}
                  aria-controls="ac-pw-panel"
                  onClick={() => setPwOpen((v) => !v)}
                >
                  Change password
                </button>
              </span>
            </InfoRow>
            {pwOpen && (
              <div id="ac-pw-panel" className="ac-pw-panel">
                <PasswordInput id="ac-pw-current" label="Current password" autoComplete="current-password" />
                <PasswordInput id="ac-pw-new" label="New password" autoComplete="new-password" hint="At least 8 characters." />
                <PasswordInput id="ac-pw-confirm" label="Confirm new password" autoComplete="new-password" />
                <div className="ac-pw-actions">
                  <button type="button" className="pg-btn pg-btn-yellow" disabled>Save</button>
                  <button type="button" className="pg-link" onClick={() => setPwOpen(false)}>Cancel</button>
                </div>
                <PreviewNotice>"Change password" isn't connected yet.</PreviewNotice>
              </div>
            )}
            <InfoRow icon={<IdCardIcon />} label="Your IDs">
              <span className="ac-ids">
                {user?.customerRef ? <IdPill id={user.customerRef} label="Customer ID" /> : '—'}
                {user?.providerRef && <IdPill id={user.providerRef} label="Provider ID" />}
              </span>
            </InfoRow>
          </section>
        </div>

        <section className="ac-card ac-services" aria-labelledby="ac-services">
          <div className="ac-services-main">
            <h2 id="ac-services"><ToolboxIcon /> Offering your services</h2>

            {!hasProvider && (
              <>
                <p>
                  Work in a trade or service? Set up a provider profile to receive quote requests from
                  customers. An admin reviews your application before you appear in search.
                </p>
                <ProviderSteps current={1} />
              </>
            )}

            {hasProvider && approval === 'PENDING' && (
              <>
                <ProviderSteps current={2} />
                <div className="ac-banner ac-banner-pending">
                  <strong>Your provider application is pending approval.</strong> You can keep editing your
                  details. Once an admin approves it, your Provider tab appears on the dashboard.
                </div>
                <div>
                  <button type="button" className="pg-btn pg-btn-ghost" onClick={() => navigate('/provider')}>
                    Edit provider details
                  </button>
                </div>
              </>
            )}

            {hasProvider && approval === 'REJECTED' && (
              <>
                <div className="ac-banner ac-banner-rejected">
                  <strong>Your provider application wasn't approved.</strong> Review your details and
                  resubmit, or contact support if you think this is a mistake.
                </div>
                <div>
                  <button type="button" className="pg-btn pg-btn-ghost" onClick={() => navigate('/provider')}>
                    Review provider details
                  </button>
                </div>
              </>
            )}

            {hasProvider && approval === 'APPROVED' && (
              <>
                <ProviderSteps done />
                <p>You're set up as a provider. Your Provider tab is on the dashboard.</p>
                <div>
                  <button type="button" className="pg-btn pg-btn-ghost" onClick={() => navigate('/provider')}>
                    Provider profile
                  </button>
                </div>
              </>
            )}
          </div>

          {!hasProvider && (
            <div className="ac-become">
              <ToolboxIcon />
              <h3>Become a provider</h3>
              <p>Same account, same login — your provider area sits beside this one.</p>
              <button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/provider')}>
                Become a provider <ArrowIcon />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
