import { Navigate, Outlet, Route, Routes, useNavigate, Link } from 'react-router-dom'
import { useAuth, RequireAuth } from './auth'
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
import CustomerProfile from './pages/CustomerProfile'
import WalletPage from './pages/Wallet'

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
          <span className="whoami">{user.fullName}</span>
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
      </Route>

      {/* ---- Customer / Provider app ---- */}
      <Route element={<UserLayout />}>
        <Route path="/" element={user ? <Navigate to="/home" replace /> : <Landing />} />
        <Route path="/register" element={user ? <Navigate to="/home" replace /> : <Register />} />
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/search" element={<RequireAuth><Search /></RequireAuth>} />
        <Route path="/new-request" element={<RequireAuth><NewRequest /></RequireAuth>} />
        <Route path="/jobs" element={<RequireAuth><MyJobs /></RequireAuth>} />
        <Route path="/my-quotes" element={<RequireAuth><MyQuotes /></RequireAuth>} />
        <Route path="/my-work" element={<RequireAuth><MyWork /></RequireAuth>} />
        <Route path="/requests" element={<RequireAuth><ProviderRequests /></RequireAuth>} />
        <Route path="/provider" element={<RequireAuth><ProviderProfile /></RequireAuth>} />
        <Route path="/providers/:userId" element={<RequireAuth><ProviderView /></RequireAuth>} />
        <Route path="/mates" element={<RequireAuth><Mates /></RequireAuth>} />
        <Route path="/jobby-mate" element={<RequireAuth><JobbyMate /></RequireAuth>} />
        <Route path="/customer-profile" element={<RequireAuth><CustomerProfile /></RequireAuth>} />
        <Route path="/wallet" element={<RequireAuth><WalletPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
