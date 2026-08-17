import { useEffect, useState } from 'react'
import { api } from '../api'
import {
  formatDate,
  formatMoney,
  statusLabel,
  type AdminFlag,
  type AdminJobRow,
  type AdminOverview,
  type AdminProviderRow,
} from '../types'

export default function Admin() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [jobs, setJobs] = useState<AdminJobRow[]>([])
  const [providers, setProviders] = useState<AdminProviderRow[]>([])
  const [flags, setFlags] = useState<AdminFlag[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [jobFilter, setJobFilter] = useState<string>('ALL')

  useEffect(() => {
    Promise.all([
      api<AdminOverview>('/admin/overview', 'GET'),
      api<AdminJobRow[]>('/admin/jobs', 'GET'),
      api<AdminProviderRow[]>('/admin/providers', 'GET'),
      api<AdminFlag[]>('/admin/flags', 'GET'),
    ])
      .then(([o, j, p, f]) => {
        setOverview(o)
        setJobs(j)
        setProviders(p)
        setFlags(f)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading dashboard…</div>
  if (error) return <div className="msg err">{error}</div>
  if (!overview) return null

  const statuses = Object.keys(overview.jobsByStatus)
  const visibleJobs = jobs.filter((j) => jobFilter === 'ALL' || j.status === jobFilter)

  return (
    <>
      <div className="page-head">
        <h2>Admin dashboard</h2>
      </div>

      {/* Overview stat cards */}
      <div className="stat-grid">
        <Stat label="Users" value={overview.totalUsers} />
        <Stat label="Providers" value={overview.totalProviders} />
        <Stat label="Jobs" value={overview.totalJobs} />
        <Stat label="Reviews" value={overview.totalReviews} />
        <Stat label="Avg rating" value={overview.platformAverageRating || '—'} />
      </div>

      {/* Jobs by status */}
      <h3 className="section-title">Jobs by status</h3>
      <div className="pill-row">
        {statuses.map((s) => (
          <div className="pill" key={s}>
            <span className={`status status-${s.toLowerCase()}`}>{statusLabel(s)}</span>
            <span className="pill-num">{overview.jobsByStatus[s]}</span>
          </div>
        ))}
      </div>

      {/* Payments - placeholder until built */}
      <h3 className="section-title">Payments <span className="soon">COMING SOON</span></h3>
      <div className="stat-grid">
        <Stat label="Pending payouts" value={overview.pendingPayouts} muted />
        <Stat label="Held funds" value={formatMoney(overview.heldFundsCents / 100)} muted />
        <Stat label="Payment issues" value={overview.paymentIssues} muted />
      </div>

      {/* Flags */}
      <h3 className="section-title">Needs attention ({flags.length})</h3>
      {flags.length === 0 ? (
        <div className="empty"><p>Nothing flagged. All clear.</p></div>
      ) : (
        <div className="flag-list">
          {flags.map((f, i) => (
            <div className={`flag flag-${f.severity.toLowerCase()}`} key={i}>
              <span className="flag-type">{f.type.replace('_', ' ')}</span>
              <span className="flag-msg">{f.message}</span>
              {f.since && <span className="flag-since">{formatDate(f.since)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* All jobs */}
      <h3 className="section-title">All jobs ({jobs.length})</h3>
      <div className="filters">
        <button className={`filter${jobFilter === 'ALL' ? ' filter-on' : ''}`} onClick={() => setJobFilter('ALL')}>
          All
        </button>
        {statuses.map((s) => (
          <button key={s} className={`filter${jobFilter === s ? ' filter-on' : ''}`} onClick={() => setJobFilter(s)}>
            {statusLabel(s)}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Provider</th>
              <th>Posted</th>
            </tr>
          </thead>
          <tbody>
            {visibleJobs.map((j) => (
              <tr key={j.id}>
                <td>{j.title}</td>
                <td>{statusLabel(j.category)}</td>
                <td><span className={`status status-${j.status.toLowerCase()}`}>{statusLabel(j.status)}</span></td>
                <td>{j.customerName}</td>
                <td>{j.providerName ?? <span className="muted">—</span>}</td>
                <td>{formatDate(j.createdAt)}</td>
              </tr>
            ))}
            {visibleJobs.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center' }}>No jobs</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* All providers */}
      <h3 className="section-title">Providers ({providers.length})</h3>
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Owner</th>
              <th>Area</th>
              <th>Categories</th>
              <th>Rating</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.userId}>
                <td>{p.businessName}</td>
                <td>{p.ownerName}</td>
                <td>{p.serviceArea}</td>
                <td>{p.categories.map((c) => statusLabel(c)).join(', ')}</td>
                <td>{p.reviewCount > 0 ? `${p.averageRating.toFixed(1)} (${p.reviewCount})` : <span className="muted">—</span>}</td>
                <td>{p.active ? 'Yes' : <span className="muted">No</span>}</td>
              </tr>
            ))}
            {providers.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center' }}>No providers</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Stat({ label, value, muted }: { label: string; value: number | string; muted?: boolean }) {
  return (
    <div className={`stat${muted ? ' stat-muted' : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
