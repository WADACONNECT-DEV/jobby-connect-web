import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { MateCard } from '../components/mates/MateCard'
import { CardGrid } from '../components/ListCard'
import { StickyBar } from '../components/StickyBar'
import { byDate, byNumber, byText, useListView, usePersistedValue, type FilterOption } from '../listView'
import { useMaxProvidersPerRequest } from '../platform'
import { type Mate } from '../types'

/** Distinct values across a list-valued field (industries, services, suburbs). */
function optionsFromList(pick: (m: Mate) => string[]) {
  return (rows: Mate[]): FilterOption[] => {
    const seen = new Set<string>()
    rows.forEach((row) => pick(row).forEach((value) => { if (value) seen.add(value) }))
    return Array.from(seen).sort().map((value) => ({ value, label: value }))
  }
}

/** Fixed choices for the Rating filter - "Any rating" is the empty value. */
const RATING_OPTIONS: FilterOption[] = [
  { value: '4', label: '4.0 and above' },
  { value: '4.5', label: '4.5 and above' },
]

type Layout = 'grid' | 'list'

/**
 * Your Jobby Mates (redesign step 3, owner's mates design).
 *
 * Same data and actions as before: GET /mates, DELETE /mates/{id}, and the
 * selected providers handed to /new-request. The per-card "Request a quote"
 * button is replaced by "Add to request" + "Continue with n" (owner decision),
 * which uses the same hand-off.
 *
 * New: a Rating filter, and - from three fields added to GET /mates - the
 * provider's description, service tags with a SERVICE filter, and an
 * "Offering bonus points" filter. Every filter and the sort and layout are
 * remembered when the customer comes Back (UAT Round 1 §5.3).
 */
export default function Mates() {
  const navigate = useNavigate()
  const [mates, setMates] = useState<Mate[] | null>(null)
  const [error, setError] = useState('')
  const resultsRef = useRef<HTMLHeadingElement | null>(null)

  // Grid is the default: the first screen should show several providers at a
  // glance (UAT Round 2 §4.2). The choice is remembered for the session.
  const [layout, setLayout] = usePersistedValue<Layout>('customer.mates.layout', 'grid')
  const topBlock = useRef<HTMLFormElement | null>(null)

  // Which mates are ticked for a single multi-provider request. Deliberately
  // NOT persisted - a stale selection surviving a page revisit would be a
  // surprise, and the customer is choosing it in the moment.
  const [selected, setSelected] = useState<string[]>([])

  // Admin-managed cap, same number the API enforces (open item 7.2).
  const maxProviders = useMaxProvidersPerRequest()

  const list = useListView<Mate>('customer.mates', mates, {
    search: (m) => `${m.businessName ?? ''} ${m.providerName} ${m.serviceArea ?? ''} ${m.bio ?? ''} ${m.industries.join(' ')} ${(m.services ?? []).join(' ')} ${m.suburbs.join(' ')}`,
    filters: [
      {
        key: 'industry',
        label: 'industries',
        options: optionsFromList((m) => m.industries),
        match: (m, value) => m.industries.includes(value),
      },
      {
        key: 'service',
        label: 'services',
        options: optionsFromList((m) => m.services ?? []),
        match: (m, value) => (m.services ?? []).includes(value),
      },
      {
        key: 'suburb',
        label: 'suburbs',
        options: optionsFromList((m) => m.suburbs),
        match: (m, value) => m.suburbs.includes(value),
      },
      {
        key: 'rating',
        label: 'rating',
        options: () => RATING_OPTIONS,
        match: (m, value) => m.reviewCount > 0 && m.averageRating >= Number(value),
      },
      {
        key: 'bonus',
        label: 'bonus points',
        options: () => [{ value: 'yes', label: 'Offering bonus points' }],
        match: (m) => (m.promoPoints ?? 0) > 0,
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

  const optionsFor = (key: string) => list.filters.find((f) => f.key === key)?.options ?? []
  const filterValue = (key: string) => list.view.filters[key] ?? ''

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

  /** Ask everyone currently ticked, in one request (UAT Round 2 §6.1). */
  function requestFromSelected() {
    if (!mates || selected.length === 0) return
    const chosen = selected
      .map((id) => mates.find((m) => m.providerUserId === id))
      .filter((m): m is Mate => Boolean(m))
      // Their industries come along, so the request form can start on the one they share (step J1).
      .map((m) => ({ userId: m.providerUserId, businessName: nameOf(m), industries: m.industries }))
    navigate('/new-request', { state: { providers: chosen } })
  }

  /** Filtering is already instant; the button takes the customer to the results. */
  function goToResults() {
    resultsRef.current?.focus()
    resultsRef.current?.scrollIntoView({ block: 'nearest' })
  }

  const atCap = selected.length >= maxProviders
  const capTitle = `You can request up to ${maxProviders} providers at once`
  const hasMates = mates !== null && mates.length > 0

  return (
    <div className="mt">
      {/* Header */}
      <div className="mt-head">
        <div className="mt-head-copy">
          <PeopleHeartIcon />
          <div>
            <h2 className="mt-title">Your Jobby Mates</h2>
            <p className="mt-sub">Providers you've saved. Request a quote without searching again.</p>
          </div>
        </div>
        <button className="mt-invite" onClick={() => navigate('/home/referrals')}>
          <InviteIcon /> Invite a Jobby Mate
        </button>
      </div>

      {error && <div className="msg err">{error}</div>}
      {mates === null && !error && <div className="loading">Loading…</div>}

      {mates !== null && mates.length === 0 && !error && (
        <div className="mt-empty">
          <p>You haven't saved any providers yet. Save a provider while searching to add them here.</p>
          <button className="mt-btn-navy" onClick={() => navigate('/home/find')}>Find providers</button>
        </div>
      )}

      {hasMates && (
        <>
          {/* Search row */}
          <form className="mt-search is-row" role="search" ref={topBlock} onSubmit={(e) => { e.preventDefault(); goToResults() }}>
            <label className="mt-field is-wide">
              <span>Search your mates</span>
              <span className="mt-input">
                <SearchIcon />
                <input type="search" value={list.view.search} placeholder="Provider name or keyword"
                  onChange={(e) => list.setSearch(e.target.value)} />
              </span>
            </label>
            <label className="mt-field">
              <span>Industry</span>
              <select value={filterValue('industry')} onChange={(e) => list.setFilter('industry', e.target.value)}>
                <option value="">All industries</option>
                {optionsFor('industry').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="mt-field">
              <span>Service</span>
              <select value={filterValue('service')} onChange={(e) => list.setFilter('service', e.target.value)}>
                <option value="">All services</option>
                {optionsFor('service').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="mt-field">
              <span>Suburb</span>
              <select value={filterValue('suburb')} onChange={(e) => list.setFilter('suburb', e.target.value)}>
                <option value="">All suburbs</option>
                {optionsFor('suburb').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="mt-field">
              <span>Rating</span>
              <select value={filterValue('rating')} onChange={(e) => list.setFilter('rating', e.target.value)}>
                <option value="">Any rating</option>
                {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="mt-check">
              <input type="checkbox" checked={filterValue('bonus') === 'yes'}
                onChange={(e) => list.setFilter('bonus', e.target.checked ? 'yes' : '')} />
              Bonus points only
            </label>
          </form>

          <StickyBar anchor={topBlock}>
            <span className="mt-input">
              <SearchIcon />
              <input type="search" value={list.view.search} placeholder="Provider name or keyword" aria-label="Search your mates"
                onChange={(e) => list.setSearch(e.target.value)} />
            </span>
            <span className="sb-field">
              <select value={filterValue('industry')} aria-label="Industry" onChange={(e) => list.setFilter('industry', e.target.value)}>
                <option value="">All industries</option>
                {optionsFor('industry').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </span>
            <span className="sb-count">{list.shown === list.total ? `${list.total} saved mate${list.total === 1 ? '' : 's'}` : `${list.shown} of ${list.total} saved mates`}{selected.length > 0 ? ` · ${selected.length} selected` : ''}</span>
          </StickyBar>

            <section className="mt-main">
              {selected.length > 0 && (
                <div className="mt-selbar" role="status">
                  <span className="mt-selbar-count">{selected.length} of {maxProviders} providers selected</span>
                  <span className="mt-selbar-note">Only selected providers will receive your request.</span>
                  <span className="mt-selbar-actions">
                    <button type="button" className="mt-clear" onClick={() => setSelected([])}>Clear</button>
                    <button type="button" className="mt-continue" onClick={requestFromSelected}>
                      Continue with {selected.length} <ArrowIcon />
                    </button>
                  </span>
                </div>
              )}

              <div className="mt-toolbar">
                <h3 className="mt-count" ref={resultsRef} tabIndex={-1}>
                  {list.shown === list.total
                    ? `${list.total} saved mate${list.total === 1 ? '' : 's'}`
                    : `${list.shown} of ${list.total} saved mates`}
                </h3>
                <div className="mt-toolbar-end">
                  <label className="mt-sort">
                    <span>Sort by</span>
                    <select value={list.view.sortKey} onChange={(e) => list.setSort(e.target.value)}>
                      {list.sorts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </label>
                  <div className="mt-view" role="group" aria-label="View">
                    <button type="button" className={layout === 'list' ? 'is-on' : ''} aria-pressed={layout === 'list'}
                      onClick={() => setLayout('list')}><ListIcon /> List</button>
                    <button type="button" className={layout === 'grid' ? 'is-on' : ''} aria-pressed={layout === 'grid'}
                      onClick={() => setLayout('grid')}><GridIcon /> Grid</button>
                  </div>
                </div>
              </div>

              {list.shown === 0 ? (
                <div className="mt-empty">
                  <p>No mates match these filters.</p>
                  <button className="mt-btn-ghost" onClick={list.clear}>Clear filters</button>
                </div>
              ) : (
                <CardGrid layout={layout}>
                  {list.visible.map((m) => {
                    const isSelected = selected.includes(m.providerUserId)
                    return (
                      <MateCard
                        key={m.providerUserId}
                        mate={m}
                        name={nameOf(m)}
                        layout={layout}
                        selected={isSelected}
                        blocked={!isSelected && atCap}
                        blockedTitle={capTitle}
                        onToggle={() => toggle(m.providerUserId)}
                        onViewProfile={() => navigate(`/providers/${m.providerUserId}`)}
                        onRemove={() => remove(m.providerUserId)}
                      />
                    )
                  })}
                </CardGrid>
              )}

              <div className="mt-more">
                <SearchIcon />
                <span><strong>Need someone new?</strong>{' '}
                  <button type="button" className="mt-more-link" onClick={() => navigate('/home/find')}>
                    Find more providers →
                  </button></span>
              </div>
            </section>
        </>
      )}
    </div>
  )
}

/* ---------- icons (decorative) ---------- */

function PeopleHeartIcon() {
  return (
    <svg aria-hidden="true" className="mt-head-ico" width="52" height="52" viewBox="0 0 48 48" fill="none"
      stroke="#0B2038" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 40L9.5 26a8.5 8.5 0 0 1 12-12L24 16.5l2.5-2.5a8.5 8.5 0 0 1 12 12" />
      <circle cx="33" cy="29" r="4.5" />
      <path d="M25 44c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5" />
    </svg>
  )
}
function InviteIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7M19 8v6M16 11h6" /></svg>
  )
}
function SearchIcon({ light = false }: { light?: boolean }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={light ? '#FFFFFF' : '#5A6E86'}
      strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" /></svg>
  )
}
function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  )
}
function ListIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>
  )
}
function GridIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>
  )
}
