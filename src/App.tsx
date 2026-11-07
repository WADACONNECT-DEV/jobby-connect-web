import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth, RequireAuth } from './auth'
import { NotificationBell } from './components/NotificationBell'
import { AccountMenu } from './components/frame/AccountMenu'
import { RequireAdmin } from './adminAuth'
import Landing from './pages/Landing'
import ForProviders from './pages/ForProviders'
import Register from './pages/Register'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import ConfirmEmail from './pages/ConfirmEmail'
import Home from './pages/Home'
import Search from './pages/Search'
import NewRequest from './pages/NewRequest'
import MyJobs from './pages/MyJobs'
import MyQuotes from './pages/MyQuotes'
import MyWork from './pages/MyWork'
import ProviderRequests from './pages/ProviderRequests'
import ProviderProfile from './pages/ProviderProfile'
import CustomerLedger from './pages/CustomerLedger'
import ProviderLedger from './pages/ProviderLedger'
import DocumentView from './pages/DocumentView'
import AdminDocuments from './pages/AdminDocuments'
import ProviderView from './pages/ProviderView'
import Mates from './pages/Mates'
import JobbyMate from './pages/JobbyMate'
import AdminLogin from './pages/AdminLogin'
import AdminPortal from './pages/AdminPortal'
import Admin from './pages/Admin'
import AdminMasterData from './pages/AdminMasterData'
import AdminUsers from './pages/AdminUsers'
import AdminChangePassword from './pages/AdminChangePassword'
import AdminApprovals from './pages/AdminApprovals'
import AdminFinance from './pages/AdminFinance'
import AdminReferrals from './pages/AdminReferrals'
import AdminCommunications from './pages/AdminCommunications'
import CustomerProfile from './pages/CustomerProfile'
import Account from './pages/Account'
import WalletPage from './pages/Wallet'
import Notifications from './pages/Notifications'

/**
 * Top bar on every logged-in page (redesign step 3, owner's mates design).
 * Same destinations and the same log-out action as before; the name link and
 * the Log out button now live in the avatar menu.
 */
function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <header className="app-bar">
      <div className="app-bar-in">
        <Link to={user ? '/home' : '/'} className="lp-brand">
          <span className="lp-brand-j" aria-hidden="true">J</span>
          <span className="lp-brand-name">JOBBY-CONNECT</span>
        </Link>
        {user && (
          <div className="app-bar-end">
            <NotificationBell />
            <AccountMenu fullName={user.fullName} onLogout={() => { logout(); navigate('/') }} />
          </div>
        )}
      </div>
    </header>
  )
}

/**
 * The dashboard (/home and its tabs) and Account draw their own full-width navy
 * band, so they aren't boxed into the narrow page column the other logged-in
 * pages use.
 */
function UserLayout() {
  const { pathname } = useLocation()
  const isDashboard = pathname === '/home' || pathname.startsWith('/home/') || pathname === '/account'
  return (
    <div className="app-shell">
      <Header />
      <main className={isDashboard ? 'app-main' : 'wrap'}>
        <Outlet />
      </main>
      <footer className="app-foot">
        <span>© Jobby-Connect 2026</span>
        <span aria-hidden="true">·</span>
        <Link to="/privacy">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms">Terms</Link>
      </footer>
    </div>
  )
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* ---- Admin Portal: separate identity, its own shell, no customer tabs ---- */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<RequireAdmin><AdminPortal /></RequireAdmin>}>
        <Route index element={<Admin />} />
        <Route path="master" element={<AdminMasterData />} />
        <Route path="admins" element={<AdminUsers />} />
        <Route path="password" element={<AdminChangePassword />} />
        <Route path="approvals" element={<AdminApprovals />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="documents" element={<AdminDocuments />} />
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="communications" element={<AdminCommunications />} />
      </Route>

      {/* ---- Landing pages: their own top bar and footer, not the site header ----
          Owner's Version 3 design. Logged-in users go straight to the dashboard. */}
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <Landing />} />
      <Route path="/for-providers" element={user ? <Navigate to="/home" replace /> : <ForProviders />} />

      {/* ---- Account pages: same own-frame style as the landing pages (redesign step 2) ----
          Log in and sign-up still send a logged-in user to the dashboard. Forgot /
          reset password, Terms and Privacy open for anyone: a logged-in user may
          still need to reset, and the legal pages are linked from everywhere. */}
      <Route path="/register" element={user ? <Navigate to="/home" replace /> : <Register />} />
      <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      {/* The confirm link for a change of login email (redesign step 8). Open to
          anyone: it may be opened on a device that isn't logged in. */}
      <Route path="/confirm-email" element={<ConfirmEmail />} />

      {/* ---- Customer / Provider app ---- */}
      <Route element={<UserLayout />}>

        {/* The dashboard. Both roles now work the same way (UAT Round 7 §3):
            every tab is a real child route, so the back button, deep links and
            the persisted filter/sort/view state all behave. Home renders the
            role switcher, the tab bar for whichever role is open, and this
            Outlet underneath.

            The provider tabs used to be a grid of five clickable boxes on a
            landing page of their own. That is gone — same tab pattern, same
            styling, same Back behaviour as the customer side. */}
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>}>
          <Route index element={<Navigate to="/home/mates" replace />} />

          {/* Customer tabs (UAT Round 2 §3) */}
          <Route path="mates" element={<Mates />} />
          <Route path="jobs" element={<MyJobs />} />
          <Route path="points" element={<WalletPage />} />
          <Route path="referrals" element={<JobbyMate />} />
          <Route path="find" element={<Search />} />
          <Route path="ledger" element={<CustomerLedger />} />

          {/* Provider tabs (UAT Round 7 §3), in the order the round specifies.
              "Provider Profile" is the same page previously called My Provider
              — renamed on the tab bar only, contents untouched. */}
          <Route path="requests" element={<ProviderRequests />} />
          <Route path="quotes" element={<MyQuotes />} />
          <Route path="work" element={<MyWork />} />
          <Route path="provider-profile" element={<ProviderProfile />} />
          <Route path="referrals-provider" element={<JobbyMate />} />
          <Route path="ledger-provider" element={<ProviderLedger />} />
        </Route>

        {/* Old links keep working — anything that still points at a pre-tab
            route lands on the right tab instead of 404ing. That includes every
            provider path, which moved in Round 7, and any bookmark or
            notification link created before it. */}
        <Route path="/mates" element={<Navigate to="/home/mates" replace />} />
        <Route path="/jobs" element={<Navigate to="/home/jobs" replace />} />
        <Route path="/wallet" element={<Navigate to="/home/points" replace />} />
        <Route path="/search" element={<Navigate to="/home/find" replace />} />
        <Route path="/requests" element={<Navigate to="/home/requests" replace />} />
        <Route path="/my-quotes" element={<Navigate to="/home/quotes" replace />} />
        <Route path="/my-work" element={<Navigate to="/home/work" replace />} />

        {/* /provider stays a real page, NOT a redirect into the provider tab.
            Account settings sends people here while their application is still
            pending or was rejected — they have no provider tab bar yet, so a
            redirect would bounce them straight back out to a customer tab. */}
        <Route path="/provider" element={<RequireAuth><ProviderProfile /></RequireAuth>} />

        {/* Pushed pages: opened from a tab, with their own back button. These
            stay top level so they cover the whole width and don't nest a page
            inside the dashboard chrome. */}
        <Route path="/new-request" element={<RequireAuth><NewRequest /></RequireAuth>} />
        <Route path="/providers/:userId" element={<RequireAuth><ProviderView /></RequireAuth>} />
        {/* Invoices and receipts (Account Ledger), A4 with print styles. */}
        <Route path="/documents/:number" element={<RequireAuth><DocumentView /></RequireAuth>} />

        {/* Referrals are reachable from both roles, so this one keeps its own
            route as well as being customer tab 4. */}
        <Route path="/jobby-mate" element={<RequireAuth><JobbyMate /></RequireAuth>} />

        {/* Account-level */}
        <Route path="/customer-profile" element={<RequireAuth><CustomerProfile /></RequireAuth>} />
        <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
