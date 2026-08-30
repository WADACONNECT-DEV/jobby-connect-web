import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Stars } from '../components/Stars'
import { ListControls } from '../components/ListControls'
import { byDate, byNumber, byText, useListView, type FilterOption } from '../listView'
import { formatDate, type Mate } from '../types'

/** Distinct values across a list-valued field (industries, suburbs). */
function optionsFromList(pick: (m: Mate) => string[]) {
  return (rows: Mate[]): FilterOption[] => {
    const seen = new Set<string>()
    rows.forEach((row) => pick(row).forEach((value) => { if (value) seen.add(value) }))
    return Array.from(seen).sort().map((value) => ({ value, label: value }))
  }
}

export default function Mates() {
  const navigate = useNavigate()
  const [mates, setMates] = useState<Mate[] | null>(null)
  const [error, setError] = useState('')

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
    } catch { /* ignore */ }
  }

  function requestQuote(m: Mate) {
    navigate('/new-request', {
      state: { providers: [{ userId: m.providerUserId, businessName: m.businessName ?? m.providerName }] },
    })
  }

  return (
    <>
      <div className="page-head">
        <h2>Your Jobby Mates</h2>
        <button className="btn btn-amber" onClick={() => navigate('/jobby-mate')}>Invite a Jobby Mate</button>
      </div>
      <p className="page-intro">Providers you've saved. Request a quote from a trusted mate without searching again.</p>

      {error && <div className="msg err">{error}</div>}
      {mates === null && !error && <div className="loading">Loading…</div>}

      {mates !== null && mates.length === 0 && !error && (
        <div className="empty">
          <p>You haven't saved any providers yet. Save a provider while searching to add them here.</p>
          <button className="btn btn-amber" style={{ marginTop: 12 }} onClick={() => navigate('/search')}>Find providers</button>
        </div>
      )}

      {mates && mates.length > 0 && (
        <ListControls list={list} searchPlaceholder="Search your mates" countLabel="mates" />
      )}

      {mates && mates.length > 0 && list.shown === 0 && (
        <div className="empty">
          <p>No mates match these filters.</p>
          <button className="btn btn-ghost-dark" style={{ marginTop: 12 }} onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {list.shown > 0 && (
        <div className="job-list">
          {list.visible.map((m) => (
            <div className="job-card" key={m.providerUserId}>
              <div className="job-top">
                <span className="job-title">{m.businessName ?? m.providerName}</span>
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
                <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate(`/providers/${m.providerUserId}`)}>View profile</button>
                <div className="job-actions">
                  <button className="btn btn-ghost-dark btn-sm" onClick={() => remove(m.providerUserId)}>Remove Jobby Mate</button>
                  <button className="btn btn-amber btn-sm" onClick={() => requestQuote(m)}>Request a quote</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
