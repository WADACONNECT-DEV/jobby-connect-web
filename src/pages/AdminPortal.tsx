import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import AdminForcedPasswordChange from './AdminForcedPasswordChange'
import { useAdminAuth } from '../adminAuth'
import { api } from '../api'
import type { ProviderApproval } from '../types'

/**
 * The Admin Portal shell (design v2, 8 Nov 2026): the standard 64-px header
 * with "Admin portal" beside the logo, and a side menu grouped Operations /
 * Money / Setup instead of the old flat navy tab row. Same routes as before;
 * the Admins link still shows for super admins only.
 */
export default function AdminPortal() {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState<number | null>(null)

  // The approvals count on the menu, so the queue is visible from any page.
  useEffect(() => {
    if (!admin || admin.mustChangePassword) return
    api<ProviderApproval[]>('/admin/provider-approvals', 'GET')
      .then((rows) => setPending(rows.filter((r) => r.status === 'PENDING').length))
      .catch(() => setPending(null))
  }, [admin])

  if (admin?.mustChangePassword) {
    return <AdminForcedPasswordChange />
  }

  const item = (to: string, label: string, end = false, badge?: number | null) => (
    <NavLink to={to} end={end} className={({ isActive }) => `adm-link${isActive ? ' is-on' : ''}`}>
      <span>{label}</span>
      {badge !== undefined && badge !== null && badge > 0 && <span className="adm-badge">{badge}</span>}
    </NavLink>
  )

  return (
    <div className="app-shell adm">
      <header className="app-bar">
        <div className="app-bar-in">
          <Link to="/admin" className="lp-brand">
            <span className="lp-brand-j" aria-hidden="true">J</span>
            <span className="lp-brand-name">Jobby-Connect</span>
          </Link>
          <span className="adm-portal">Admin portal</span>
          <div className="app-bar-end">
            {admin && (
              <span className="app-greet adm-who">
                <b>{admin.fullName}</b>
                <span>{admin.superAdmin ? 'Super admin' : 'Admin'}</span>
              </span>
            )}
            <button className="mt-btn-ghost adm-logout" onClick={() => { logout(); navigate('/admin/login') }}>Log out</button>
          </div>
        </div>
      </header>

      <div className="adm-body">
        <nav className="adm-menu" aria-label="Admin sections">
          <small>Operations</small>
          {item('/admin', 'Overview', true)}
          {item('/admin/approvals', 'Provider approvals', false, pending)}
          {item('/admin/communications', 'Communications')}
          <small>Money</small>
          {item('/admin/finance', 'Finance')}
          {item('/admin/documents', 'Documents')}
          {item('/admin/referrals', 'Referrals')}
          <small>Setup</small>
          {item('/admin/master', 'Master data')}
          {admin?.superAdmin && item('/admin/admins', 'Admins')}
          {item('/admin/password', 'Password')}
        </nav>
        <main className="adm-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
