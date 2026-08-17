import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { formatDate, type ProviderApproval } from '../types'

export default function AdminApprovals() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ProviderApproval[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = () =>
    api<ProviderApproval[]>('/admin/provider-approvals', 'GET')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load approvals.'))

  useEffect(() => { load() }, [])

  async function decide(userId: string, action: 'approve' | 'reject') {
    setError(''); setBusy(userId)
    try {
      await api<ProviderApproval>(`/admin/provider-approvals/${userId}/${action}`, 'POST')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="page-head">
        <h2>Provider approvals</h2>
        <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/admin')}>← Dashboard</button>
      </div>
      <p className="page-intro">New providers waiting to go live. Approved providers become searchable to customers; rejected ones stay hidden.</p>

      {error && <div className="msg err">{error}</div>}
      {rows === null && !error && <div className="loading">Loading…</div>}

      {rows !== null && rows.length === 0 && !error && (
        <div className="empty"><p>No providers waiting for approval.</p></div>
      )}

      {rows && rows.length > 0 && (
        <div className="md-panel">
          <table className="md-table">
            <thead><tr><th>Business</th><th>ABN</th><th>Service area</th><th>Submitted</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId}>
                  <td>{r.businessName}</td>
                  <td>{r.abn ?? '—'}</td>
                  <td>{r.serviceArea}</td>
                  <td>{formatDate(r.submittedAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-amber btn-xs" disabled={busy === r.userId} onClick={() => decide(r.userId, 'approve')}>Approve</button>{' '}
                    <button className="btn btn-ghost-dark btn-xs" disabled={busy === r.userId} onClick={() => decide(r.userId, 'reject')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
