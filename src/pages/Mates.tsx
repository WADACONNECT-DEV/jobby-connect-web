import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Stars } from '../components/Stars'
import { ListControls } from '../components/ListControls'
import { byDate, byNumber, byText, useListView, usePersistedValue, type FilterOption } from '../listView'
import { useMaxProvidersPerRequest } from '../platform'
import { formatDate, type Mate } from '../types'

/** Distinct values across a list-valued field (industries, suburbs). */
function optionsFromList(pick: (m: Mate) => string[]) {
  return (rows: Mate[]): FilterOption[] => {
    const seen = new Set<string>()
    rows.forEach((row) => pick(row).forEach((value) => { if (value) seen.add(value) }))
    return Array.from(seen).sort().map((value) => ({ value, label: value }))
  }
}

type Layout = 'grid' | 'list'

export default function Mates() {
  const navigate = useNavigate()
  const [mates, setMates] = useState<Mate[] | null>(null)
  const [error, setError] = useState('')

  // Grid is the default: the first screen should show several providers at a
  // glance (UAT Round 2 §4.2). The choice is remembered for the session, which
  // is also what keeps it intact when the customer comes back from a provider's
  // mini-site or the request form (Round 1 §5.3, Round 2 open item 7.3).
  const [layout, setLayout] = usePersistedValue<Layout>('customer.mates.layout', 'grid')

  // Which mates are ticked for a single multi-provider request. Deliberately
  // NOT persisted — a stale selection surviving a page revisit would be a
  // surprise, and the customer is choosing it in the moment.
  const [selected, setSelected] = useState<string[]>([])

  // Admin-managed cap, same number the API enforces (open item 7.2).
  const maxProviders = useMaxProvidersPerRequest()

  const list = useListView<Mate>('customer.mates', mates, {
    search: (m) => `${m.businessName ?? ''} ${m.providerName} ${m.serviceArea ?? ''} ${m.industries.join(' ')} ${m.suburbs.join(' ')}`,
    filters: [
      {
        key: 'industry',
        label: 'industries',
        options: optionsFromList((m) => m.industries),
        match: (m, value) => m.industries.includes(value),
      },
      {
        key: 'suburb',
        label: 'suburbs',
        options: optionsFromList((m) => m.suburbs),
        match: (m, value) => m.suburbs.includes(value),
      },
    ],
    sorts: [
      { key: 'rating', label: 'Rating', compare: byNumber<Mate>((m) => m.averageRating), defaultDir: 'desc' },
      { key: 'jobs', label: 'Jobs completed', compare: byNumber<Mate>((m) => m.jobsCompleted), defaultDir: 'desc' },
      { key: 'used', label: 'Recently used', compare: byDate<Mate>((m) => m.lastJobAt), defaultDir: 'desc' },
      { key: 'saved', label: 'Recently saved', compare: byDate<Mate>((m) => m.savedAt), defaultDir: 'desc' },
      { key: 'name', label: 'Name', compare: byText<Mate>((m) => m.businessName ?? m.providerName), defaultDir: 'asc' },
    ],
    defaultSortKey: 'saved',
    defaultSortDir: 'desc',
  })

  function load() {
    return api<Mate[]>('/mates', 'GET')
      .then(setMates)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your mates.'))
  }

  useEffect(() => { load() }, [])

  async function remove(providerUserId: string) {
    try {
      await api(`/mates/${providerUserId}`, 'DELETE')
      setMates((prev) => (prev ? prev.filter((m) => m.providerUserId !== providerUserId) : prev))
      setSelected((prev) => prev.filter((id) => id !== providerUserId))
    } catch { /* ignore */ }
  }

  const nameOf = (m: Mate) => m.businessName ?? m.providerName

  function toggle(providerUserId: string) {
    setSelected((prev) => {
      if (prev.includes(providerUserId)) return prev.filter((id) => id !== providerUserId)
      if (prev.length >= maxProviders) return prev
      return [...prev, providerUserId]
    })
  }

  /** Ask one mate for a quote — the per-card action, unchanged. */
  function requestQuote(m: Mate) {
    navigate('/new-request', {
      state: { providers: [{ userId: m.providerUserId, businessName: nameOf(m) }] },
    })
  }

  /** Ask everyone currently ticked, in one request (UAT Round 2 §6.1). */
  function requestFromSelected() {
    if (!mates || selected.length === 0) return
    const chosen = selected
      .map((id) => mates.find((m) => m.providerUserId === id))
      .filter((m): m is Mate => Boolean(m))
      .map((m) => ({ userId: m.providerUserId, businessName: nameOf(m) }))
    navigate('/new-request', { state: { providers: chosen } })
  }

  const atCap = selected.length >= maxProviders
  const selectedNames = mates
    ? selected.map((id) => mates.find((m) => m.providerUserId === id)).filter(Boolean).map((m) => nameOf(m as Mate))
    : []

  return (
    <>
      {/* Back to wherever they came from — the dashboard, a provider's mini-site
          or the request form (UAT Round 2 §4.1). */}
      <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 14 }}>← Back</button>

      <div className="page-head">
        <h2>Your Jobby Mates</h2>
        <button className="btn btn-amber" onClick={() => navigate('/home/referrals')}>Invite a Jobby Mate</button>
      </div>
      <p className="page-intro">Providers you've saved. Request a quote from a trusted mate without searching again.</p>

      {error && <div className="msg err">{error}</div>}
      {mates === null && !error && <div className="loading">Loading…</div>}

      {mates !== null && mates.length === 0 && !error && (
        <div className="empty">
          <p>You haven't saved any providers yet. Save a provider while searching to add them here.</p>
          <button className="btn btn-amber" style={{ marginTop: 12 }} onClick={() => navigate('/home/find')}>Find providers</button>
        </div>
      )}

      {mates && mates.length > 0 && (
        <div className="mates-controls">
          <ListControls list={list} searchPlaceholder="Search your mates" countLabel="mates" />
          <div className="view-toggle" role="group" aria-label="View">
            <button
              type="button"
              className={`view-btn${layout === 'grid' ? ' on' : ''}`}
              aria-pressed={layout === 'grid'}
              onClick={() => setLayout('grid')}
            >
              Grid
            </button>
            <button
              type="button"
              className={`view-btn${layout === 'list' ? ' on' : ''}`}
              aria-pressed={layout === 'list'}
              onClick={() => setLayout('list')}
            >
              List
            </button>
          </div>
        </div>
      )}

      {mates && mates.length > 0 && list.shown === 0 && (
        <div className="empty">
          <p>No mates match these filters.</p>
          <button className="btn btn-ghost-dark" style={{ marginTop: 12 }} onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {list.shown > 0 && (
        <div className={layout === 'grid' ? 'mate-grid' : 'job-list'}>
          {list.visible.map((m) => {
            const isSelected = selected.includes(m.providerUserId)
            return (
              <div className={`job-card mate-card${isSelected ? ' mate-selected' : ''}`} key={m.providerUserId}>
                <div className="job-top">
                  <label className="mate-pick" title={!isSelected && atCap ? `You can request up to ${maxProviders} providers at once` : 'Include in one request'}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!isSelected && atCap}
                      onChange={() => toggle(m.providerUserId)}
                    />
                    <span className="job-title">{nameOf(m)}</span>
                  </label>
                  <span className="prov-rating">
                    {m.reviewCount > 0 ? (
                      <><Stars value={m.averageRating} /><span className="prov-rating-num">{m.averageRating.toFixed(1)} ({m.reviewCount})</span></>
                    ) : (<span className="prov-new">No reviews yet</span>)}
                  </span>
                </div>
                <div className="job-meta">
                  {m.industries.map((industry) => <span className="chip" key={industry}>{industry}</span>)}
                  {m.serviceArea && <span>{m.serviceArea}</span>}
                  {m.jobsCompleted > 0 && <span>· {m.jobsCompleted} job{m.jobsCompleted > 1 ? 's' : ''} completed</span>}
                  {m.lastJobAt && <span className="job-date">· last used {formatDate(m.lastJobAt)}</span>}
                </div>
                <div className="job-foot">
                  <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate(`/providers/${m.providerUserId}`)}>Profile</button>
                  <div className="job-actions">
                    <button className="btn btn-ghost-dark btn-sm" onClick={() => remove(m.providerUserId)}>Remove</button>
                    <button className="btn btn-amber btn-sm" onClick={() => requestQuote(m)}>Request a quote</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* One request to several mates at once, so the "sent to" list on the
          request can genuinely show more than one name (UAT Round 2 §6.1). */}
      {selected.length > 0 && (
        <div className="mate-selectbar">
          <span>
            {selected.length} of {maxProviders} selected: <strong>{selectedNames.join(', ')}</strong>
          </span>
          <div className="job-actions">
            <button className="btn btn-ghost-dark btn-sm" onClick={() => setSelected([])}>Clear selection</button>
            <button className="btn btn-amber btn-sm" onClick={requestFromSelected}>
              Request quotes from {selected.length}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
