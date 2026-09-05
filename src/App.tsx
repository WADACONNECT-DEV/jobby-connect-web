import { Navigate, Outlet, Route, Routes, useNavigate, Link } from 'react-router-dom'
import { useAuth, RequireAuth } from './auth'
import { NotificationBell } from './components/NotificationBell'
import { RequireAdmin } from './adminAuth'
import Landing from './pages/Landing'
import Register from './pages/Register'
import Login from './pages/Login'
import Home from './pages/Home'
import Search from './pages/Search'
import NewRequest from './pages/NewRequest'
import MyJobs from './pages/MyJobs'
import MyQuotes from './pages/MyQuotes'
import MyWork from './pages/MyWork'
import ProviderRequests from './pages/ProviderRequests'
import ProviderProfile from './pages/ProviderProfile'
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

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <header className="site-header">
      <Link to={user ? '/home' : '/'} className="brand">
        <span className="brand-mark">J</span>
        <span className="brand-name">JOBBY-CONNECT</span>
      </Link>
      <div className="spacer" />
      {user && (
        <>
          <NotificationBell />
          <Link to="/account" className="whoami whoami-link" title="Account settings">{user.fullName}</Link>
          <button className="btn btn-nav" onClick={() => { logout(); navigate('/') }}>Log out</button>
        </>
      )}
    </header>
  )
}

function UserLayout() {
  return (
    <>
      <Header />
      <main className="wrap">
        <Outlet />
      </main>
      <footer className="site-foot">Jobby-Connect · React + TypeScript</footer>
    </>
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
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="communications" element={<AdminCommunications />} />
      </Route>

      {/* ---- Customer / Provider app ---- */}
      <Route element={<UserLayout />}>
        <Route path="/" element={user ? <Navigate to="/home" replace /> : <Landing />} />
        <Route path="/register" element={user ? <Navigate to="/home" replace /> : <Register />} />
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />

        {/* The customer dashboard. Each of the five tabs (UAT Round 2 §3) is a
            real child route, so the back button, deep links and the persisted
            filter/sort/view state all behave. Home renders the tab bar and the
            Outlet; for an approved provider viewing their provider role it
            renders the provider tiles instead. */}
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>}>
          <Route index element={<Navigate to="/home/mates" replace />} />
          <Route path="mates" element={<Mates />} />
          <Route path="jobs" element={<MyJobs />} />
          <Route path="points" element={<WalletPage />} />
          <Route path="referrals" element={<JobbyMate />} />
          <Route path="find" element={<Search />} />
        </Route>

        {/* Old customer-side links keep working — anything that still points at
            the pre-tab routes lands on the right tab instead of 404ing. */}
        <Route path="/mates" element={<Navigate to="/home/mates" replace />} />
        <Route path="/jobs" element={<Navigate to="/home/jobs" replace />} />
        <Route path="/wallet" element={<Navigate to="/home/points" replace />} />
        <Route path="/search" element={<Navigate to="/home/find" replace />} />

        {/* Pushed pages: opened from a tab, with their own back button. These
            stay top level so they cover the whole width and don't nest a page
            inside the dashboard chrome. */}
        <Route path="/new-request" element={<RequireAuth><NewRequest /></RequireAuth>} />
        <Route path="/providers/:userId" element={<RequireAuth><ProviderView /></RequireAuth>} />

        {/* Referrals are reachable from both roles, so this one keeps its own
            route as well as being customer tab 4. */}
        <Route path="/jobby-mate" element={<RequireAuth><JobbyMate /></RequireAuth>} />

        {/* Provider role */}
        <Route path="/my-quotes" element={<RequireAuth><MyQuotes /></RequireAuth>} />
        <Route path="/my-work" element={<RequireAuth><MyWork /></RequireAuth>} />
        <Route path="/requests" element={<RequireAuth><ProviderRequests /></RequireAuth>} />
        <Route path="/provider" element={<RequireAuth><ProviderProfile /></RequireAuth>} />

        {/* Account-level */}
        <Route path="/customer-profile" element={<RequireAuth><CustomerProfile /></RequireAuth>} />
        <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
