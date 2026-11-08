import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { StatCards } from '../components/StepLine'
import { StickyBar } from '../components/StickyBar'
import {
  CATEGORY_LABELS,
  formatDate,
  formatMoney,
  statusLabel,
  type AdminFlag,
  type AdminJobRow,
  type AdminOverview,
  type AdminProviderRow,
  type ServiceCategory,
} from '../types'

export default function Admin() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [jobs, setJobs] = useState<AdminJobRow[]>([])
  const [providers, setProviders] = useState<AdminProviderRow[]>([])
  const [flags, setFlags] = useState<AdminFlag[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [jobFilter, setJobFilter] = useState<string>('ALL')
  const topBlock = useRef<HTMLDivElement | null>(null)

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
  const weeks = completedPerWeek(jobs)
  const weekMax = Math.max(1, ...weeks.map((w) => w.count))

  return (
    <>
      <div className="mt-head">
        <div>
          <h2 className="mt-title">Overview</h2>
          <p className="mt-sub">{today()}</p>
        </div>
      </div>

      <StatCards items={[
        { label: 'Users', value: overview.totalUsers.toLocaleString('en-AU') },
        { label: 'Providers', value: overview.totalProviders.toLocaleString('en-AU') },
        { label: 'Jobs', value: overview.totalJobs.toLocaleString('en-AU') },
        { label: 'Reviews', value: overview.totalReviews.toLocaleString('en-AU') },
        { label: 'Average rating', value: overview.platformAverageRating ? overview.platformAverageRating.toFixed(1) : '—' },
      ]} />

      <div className="adm-two">
        <section className="md-panel adm-chart">
          <h3 className="sub">Jobs completed per week</h3>
          {weeks.every((w) => w.count === 0) ? (
            <p className="muted small">No completed jobs in the last 14 weeks.</p>
          ) : (
            <>
              <div className="adm-bars" role="img" aria-label={`Jobs completed per week, last 14 weeks: ${weeks.map((w) => w.count).join(', ')}`}>
                {weeks.map((w, i) => (
                  <i key={w.start} className={i === weeks.length - 1 ? 'is-now' : ''} style={{ height: `${Math.round((w.count / weekMax) * 100)}%` }} title={`Week of ${formatDate(w.start)}: ${w.count}`} />
                ))}
              </div>
              <div className="adm-bars-x muted small">
                <span>{formatDate(weeks[0].start)}</span>
                <span>{formatDate(weeks[weeks.length - 1].start)}</span>
              </div>
            </>
          )}
        </section>

        <aside className="adm-side">
          <section className="md-panel">
            <h3 className="sub">Needs attention</h3>
            {flags.length === 0 ? (
              <p className="muted small">Nothing flagged. All clear.</p>
            ) : (
              <ul className="adm-lines">
                {flags.map((f, i) => (
                  <li key={i}>
                    <span>{f.message}{f.since && <span className="muted small"> · {formatDate(f.since)}</span>}</span>
                    <span className={`chip ${f.severity === 'WARN' ? 'chip-r' : 'chip-y'}`}>{f.type.replace(/_/g, ' ').toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="md-panel">
            <h3 className="sub">Payments</h3>
            <ul className="adm-lines">
              <li><span>Pending payouts</span><span>{overview.pendingPayouts}</span></li>
              <li><span>Held funds</span><span>{formatMoney(overview.heldFundsCents / 100)}</span></li>
              <li><span>Payment issues</span><span className={overview.paymentIssues > 0 ? 'chip chip-r' : ''}>{overview.paymentIssues}</span></li>
            </ul>
          </section>
          <section className="md-panel">
            <h3 className="sub">Jobs by status</h3>
            <ul className="adm-lines">
              {statuses.map((s) => (
                <li key={s}><span className="adm-cap">{statusLabel(s)}</span><span>{overview.jobsByStatus[s].toLocaleString('en-AU')}</span></li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {/* All jobs */}
      <h3 className="sub adm-sec">All jobs ({jobs.length})</h3>
      <div className="filters" ref={topBlock}>
        <button className={`filter${jobFilter === 'ALL' ? ' filter-on' : ''}`} onClick={() => setJobFilter('ALL')}>
          All
        </button>
        {statuses.map((s) => (
          <button key={s} className={`filter${jobFilter === s ? ' filter-on' : ''}`} onClick={() => setJobFilter(s)}>
            {statusLabel(s)}
          </button>
        ))}
      </div>
      {visibleJobs.length > 10 && (
        <StickyBar anchor={topBlock}>
          <div className="filters" style={{ margin: 0 }}>
            <button className={`filter${jobFilter === 'ALL' ? ' filter-on' : ''}`} onClick={() => setJobFilter('ALL')}>All</button>
            {statuses.map((s) => (
              <button key={s} className={`filter${jobFilter === s ? ' filter-on' : ''}`} onClick={() => setJobFilter(s)}>{statusLabel(s)}</button>
            ))}
          </div>
          <span className="sb-count">{visibleJobs.length} job{visibleJobs.length === 1 ? '' : 's'}</span>
        </StickyBar>
      )}
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
                {/* The industry name (step J1), or the old category's label on older jobs. */}
                <td>{CATEGORY_LABELS[j.category as ServiceCategory] ?? j.category}</td>
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
      <h3 className="sub adm-sec">Providers ({providers.length})</h3>
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

/** Completed jobs per week for the last 14 weeks (Monday starts), from the jobs list already loaded. */
function completedPerWeek(jobs: AdminJobRow[]): { start: string; count: number }[] {
  const now = new Date()
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const weeks: { start: string; from: number; to: number; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const from = new Date(monday); from.setDate(monday.getDate() - i * 7)
    const to = new Date(from); to.setDate(from.getDate() + 7)
    weeks.push({ start: from.toISOString(), from: from.getTime(), to: to.getTime(), count: 0 })
  }
  for (const j of jobs) {
    if (j.status !== 'COMPLETED') continue
    const t = new Date(j.updatedAt).getTime()
    const w = weeks.find((x) => t >= x.from && t < x.to)
    if (w) w.count++
  }
  return weeks.map(({ start, count }) => ({ start, count }))
}

function today(): string {
  const d = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${days[d.getDay()]} ${formatDate(d.toISOString())}`
}
