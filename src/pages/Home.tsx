import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { usePersistedValue } from '../listView'
import { useAuth } from '../auth'

interface TabDef { to: string; label: string }

/**
 * The five customer dashboard tabs, in the exact order and with the exact names
 * required by UAT Round 2 §3. Tab 1 (saved providers) and tab 4 (the referral
 * program) are two different features from two different specs and must stay
 * separate — do not merge them, and do not reorder this array.
 *
 * Each tab is a real route, not local state, so the browser back button, deep
 * links and the persisted filter/sort/view state all keep working (UAT Round 1
 * §5.3).
 */
const CUSTOMER_TABS: TabDef[] = [
  { to: '/home/mates', label: 'Your Jobby Mates' },
  { to: '/home/jobs', label: 'Your Requests & Jobs' },
  { to: '/home/points', label: 'Mate Points' },
  { to: '/home/referrals', label: 'Jobby Mate Referrals' },
  { to: '/home/find', label: 'Find & Request Quotes' },
  { to: '/home/ledger', label: 'Account Ledger' },
]

/**
 * The five provider tabs, in the exact order and with the exact names required
 * by UAT Round 7 §3.
 *
 * This replaces the grid of five clickable boxes the provider role used to open
 * on. Same pattern as the customer side, same styling, same Back placement —
 * which is the whole point of the change: one way of navigating, not two.
 *
 * "Provider Profile" is the page previously labelled "My Provider". Renamed on
 * the tab bar only; its contents and behaviour are untouched.
 *
 * "Jobby Mate Referrals" is the same page as customer tab 4. It is reachable
 * from both roles by design, so it has a route in each — one component, two
 * entry points, no duplicated state.
 */
const PROVIDER_TABS: TabDef[] = [
  { to: '/home/requests', label: 'Requests to Me' },
  { to: '/home/quotes', label: 'Your Quotes' },
  { to: '/home/work', label: 'Your Work' },
  { to: '/home/provider-profile', label: 'Provider Profile' },
  { to: '/home/referrals-provider', label: 'Jobby Mate Referrals' },
  { to: '/home/ledger-provider', label: 'Account Ledger' },
]

type Role = 'customer' | 'provider'

const tabsFor = (role: Role) => (role === 'customer' ? CUSTOMER_TABS : PROVIDER_TABS)
const holdsPath = (role: Role, path: string) => tabsFor(role).some((t) => t.to === path)

/**
 * The dashboard, and the layout route for both roles' tabs.
 *
 * One account can hold both roles, so this is still a role switcher — but only
 * for people who actually have both (UAT Round 1 §4.1/§4.2). A plain customer
 * sees no provider section and no "Become a provider" button; that entry point
 * lives in Account settings. Someone whose provider application is still pending
 * sees only their Customer tab, with the pending status shown there. Both roles
 * appear only once an admin has approved them.
 *
 * Inside either role, that role's five tabs render their page through the
 * single Outlet below.
 */
export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const customerReady = user?.customerProfileComplete ?? false
  const hasProvider = user?.hasProviderProfile ?? false
  const approval = user?.providerApprovalStatus ?? null
  const isApprovedProvider = hasProvider && approval === 'APPROVED'

  // Which role is open survives navigating away and coming back (UAT §5.3).
  const [role, setRole] = usePersistedValue<Role>('home.role', 'customer')
  const activeRole: Role = isApprovedProvider ? role : 'customer'

  // Which tab each role was last on, so switching roles and switching back
  // returns you where you were rather than to the first tab every time.
  const [lastCustomerTab, setLastCustomerTab] = usePersistedValue('home.tab.customer', CUSTOMER_TABS[0].to)
  const [lastProviderTab, setLastProviderTab] = usePersistedValue('home.tab.provider', PROVIDER_TABS[0].to)

  const path = location.pathname

  useEffect(() => {
    if (holdsPath('customer', path)) setLastCustomerTab(path)
    else if (holdsPath('provider', path)) setLastProviderTab(path)
  }, [path])

  /**
   * Keep the content underneath matching the tab bar above it.
   *
   * Without this, opening /home while the provider role is remembered would
   * show provider tabs over a customer page — and so would switching roles
   * from a tab the other role doesn't have. Replaces rather than pushes, so
   * the back button doesn't bounce between the two.
   */
  useEffect(() => {
    if (holdsPath(activeRole, path)) return
    navigate(activeRole === 'customer' ? lastCustomerTab : lastProviderTab, { replace: true })
  }, [activeRole, path, lastCustomerTab, lastProviderTab])

  function switchRole(next: Role) {
    setRole(next)
    navigate(next === 'customer' ? lastCustomerTab : lastProviderTab)
  }

  const tabs = tabsFor(activeRole)

  return (
    <div className="app-frame">
      {/* Design v2 (8 Nov 2026): the role switch and the section tabs share one
          row directly under the header. The welcome band is gone - the greeting
          and Mate Points now live in the header (App.tsx). Cream on the provider
          side, so it is obvious which hat is on. */}
      {(customerReady || activeRole === 'provider') && (
        <div className={`app-tabsbar is-${activeRole}`}>
          <div className="app-tabsbar-in">
            {isApprovedProvider && (
              <div className="app-roles" role="tablist" aria-label="Role">
                <button
                  role="tab"
                  aria-selected={activeRole === 'customer'}
                  className={`app-role${activeRole === 'customer' ? ' is-on' : ''}`}
                  onClick={() => switchRole('customer')}
                >
                  As a customer
                </button>
                <button
                  role="tab"
                  aria-selected={activeRole === 'provider'}
                  className={`app-role is-provider${activeRole === 'provider' ? ' is-on' : ''}`}
                  onClick={() => switchRole('provider')}
                >
                  As a provider
                </button>
              </div>
            )}
            <nav className="app-tabs" role="tablist" aria-label={`${activeRole} dashboard`} style={{ display: 'contents' }}>
              {tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  role="tab"
                  className={({ isActive }) => `app-tab${isActive ? ' is-on' : ''}`}
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="app-card-wrap">
        <div className={`app-card is-${activeRole}`}>
          {/* A pending or rejected application is surfaced here, because this is
              the only role the applicant can see until they're approved. */}
          {activeRole === 'customer' && hasProvider && approval === 'PENDING' && (
            <div className="app-banner is-pending">
              <span><strong>Your provider application is pending approval.</strong> Once an admin approves
                it, your Provider tab will appear here.</span>
              <button className="app-link-btn" onClick={() => navigate('/account')}>View in Account</button>
            </div>
          )}
          {activeRole === 'customer' && hasProvider && approval === 'REJECTED' && (
            <div className="app-banner is-rejected">
              <span><strong>Your provider application wasn't approved.</strong></span>
              <button className="app-link-btn" onClick={() => navigate('/account')}>Review in Account</button>
            </div>
          )}

          {activeRole === 'customer' && !customerReady ? (
            <div className="app-gate">
              <p>Complete a quick customer profile (name + mobile) to start requesting quotes.</p>
              <button className="app-gate-btn" onClick={() => navigate('/customer-profile')}>Complete customer profile</button>
            </div>
          ) : (
            <div className={`app-pane is-${activeRole}`}>
              <Outlet />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
