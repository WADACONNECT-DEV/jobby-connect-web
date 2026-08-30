import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import AdminForcedPasswordChange from './AdminForcedPasswordChange'
import { useAdminAuth } from '../adminAuth'

export default function AdminPortal() {
  const { admin, logout } = useAdminAuth()

  if (admin?.mustChangePassword) {
    return <AdminForcedPasswordChange />
  }
  const navigate = useNavigate()

  return (
    <div className="admin-portal">
      <header className="admin-header">
        <Link to="/admin" className="admin-brand admin-brand-sm">
          <span className="brand-mark">J</span>
          <span className="admin-brand-name">JOBBY-CONNECT <span className="admin-tag">ADMIN</span></span>
        </Link>
        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => `admin-navlink${isActive ? ' on' : ''}`}>Dashboard</NavLink>
          <NavLink to="/admin/master" className={({ isActive }) => `admin-navlink${isActive ? ' on' : ''}`}>Master data</NavLink>
          <NavLink to="/admin/approvals" className={({ isActive }) => `admin-navlink${isActive ? ' on' : ''}`}>Approvals</NavLink>
          <NavLink to="/admin/finance" className={({ isActive }) => `admin-navlink${isActive ? ' on' : ''}`}>Finance</NavLink>
          <NavLink to="/admin/referrals" className={({ isActive }) => `admin-navlink${isActive ? ' on' : ''}`}>Referrals</NavLink>
          <NavLink to="/admin/communications" className={({ isActive }) => `admin-navlink${isActive ? ' on' : ''}`}>Communications</NavLink>
          {admin?.superAdmin && (
            <NavLink to="/admin/admins" className={({ isActive }) => `admin-navlink${isActive ? ' on' : ''}`}>Admins</NavLink>
          )}
          <NavLink to="/admin/password" className={({ isActive }) => `admin-navlink${isActive ? ' on' : ''}`}>Password</NavLink>
        </nav>
        <div className="spacer" />
        {admin && <span className="whoami">{admin.fullName}{admin.superAdmin ? ' · Super Admin' : ''}</span>}
        <button className="btn btn-nav" onClick={() => { logout(); navigate('/admin/login') }}>Log out</button>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
