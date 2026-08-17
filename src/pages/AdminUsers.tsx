import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAdminAuth } from '../adminAuth'
import type { AdminUser, CreatedAdmin } from '../types'

export default function AdminUsers() {
  const { admin } = useAdminAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [superAdmin, setSuperAdmin] = useState(false)
  const [level, setLevel] = useState('')
  const [creating, setCreating] = useState(false)
  const [justCreated, setJustCreated] = useState<CreatedAdmin | null>(null)

  const isSuper = admin?.superAdmin ?? false

  const load = () =>
    api<AdminUser[]>('/admin/admins', 'GET')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load admins.'))

  useEffect(() => { if (isSuper) load() }, [isSuper])

  if (!isSuper) {
    return (
      <div className="empty">
        <p>Only a Super Admin can manage admin users.</p>
      </div>
    )
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    setError(''); setJustCreated(null); setCreating(true)
    try {
      const res = await api<CreatedAdmin>('/admin/admins', 'POST', {
        email: email.trim(),
        fullName: fullName.trim(),
        superAdmin,
        permissionLevel: level.trim() || null,
      })
      setJustCreated(res)
      setEmail(''); setFullName(''); setSuperAdmin(false); setLevel('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create admin.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleActive(a: AdminUser) {
    setError('')
    try {
      await api<AdminUser>(`/admin/admins/${a.id}`, 'PATCH', { active: !a.active })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update admin.')
    }
  }

  async function toggleSuper(a: AdminUser) {
    setError('')
    try {
      await api<AdminUser>(`/admin/admins/${a.id}`, 'PATCH', { superAdmin: !a.superAdmin })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update admin.')
    }
  }

  return (
    <>
      <div className="page-head">
        <h2>Admin users</h2>
        <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/admin')}>← Dashboard</button>
      </div>
      <p className="page-intro">Create and manage administrator accounts. New admins get a one-time temporary password to share.</p>

      {error && <div className="msg err">{error}</div>}

      {justCreated && (
        <div className="temp-pw-card">
          <div className="temp-pw-head">Admin created — share this temporary password now</div>
          <p className="temp-pw-sub">It won't be shown again. {justCreated.admin.fullName} should sign in and change it.</p>
          <div className="temp-pw-row">
            <code className="temp-pw">{justCreated.temporaryPassword}</code>
            <button className="btn btn-ghost-dark btn-xs" onClick={() => navigator.clipboard?.writeText(justCreated.temporaryPassword)}>Copy</button>
          </div>
          <div className="temp-pw-meta">{justCreated.admin.email}</div>
        </div>
      )}

      <div className="md-panel">
        <table className="md-table">
          <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Level</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {rows?.map((a) => (
              <tr key={a.id} className={a.active ? '' : 'md-inactive'}>
                <td>{a.email}</td>
                <td>{a.fullName}</td>
                <td>{a.superAdmin ? 'Super Admin' : 'Admin'}</td>
                <td>{a.permissionLevel ?? '—'}</td>
                <td>{a.active ? 'Yes' : 'No'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost-dark btn-xs" onClick={() => toggleActive(a)}>{a.active ? 'Deactivate' : 'Activate'}</button>{' '}
                  <button className="btn btn-ghost-dark btn-xs" onClick={() => toggleSuper(a)}>{a.superAdmin ? 'Make Admin' : 'Make Super'}</button>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan={6} className="md-empty">No admins yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="md-panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Create an admin</h3>
        <form onSubmit={create}>
          <div className="row2">
            <div>
              <label>Email (@jobbyconnect)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@jobbyconnect.com.au" />
            </div>
            <div>
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          </div>
          <div className="row2" style={{ marginTop: 10 }}>
            <div>
              <label>Permission level (optional)</label>
              <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Support, Ops" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label className="check-inline">
                <input type="checkbox" checked={superAdmin} onChange={(e) => setSuperAdmin(e.target.checked)} /> Super Admin
              </label>
            </div>
          </div>
          <button className="btn btn-amber btn-sm" type="submit" disabled={creating} style={{ marginTop: 12 }}>
            {creating ? 'Creating…' : 'Create admin'}
          </button>
        </form>
      </div>
    </>
  )
}
