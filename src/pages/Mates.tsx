import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { byDate, byNumber, byText, useListView, usePersistedValue, type FilterOption } from '../listView'
import { useMaxProvidersPerRequest } from '../platform'
import { formatDate, type Mate } from '../types'
import {
  ArrowIcon,
  CheckIcon,
  EmptyState,
  FilterIcon,
  GridIcon,
  HeartIcon,
  HeartPeopleIcon,
  ListIcon,
  PageHead,
  SearchIcon,
  SelectionBar,
  UserPlusIcon,
} from '../components/PageParts'
import { ProviderCard } from '../components/ProviderCard'

/** Distinct values across a list-valued field (industries, suburbs). */
function optionsFromList(pick: (m: Mate) => string[]) {
  return (rows: Mate[]): FilterOption[] => {
    const seen = new Set<string>()
    rows.forEach((row) => pick(row).forEach((value) => { if (value) seen.add(value) }))
    return Array.from(seen).sort().map((value) => ({ value, label: value }))
  }
}

/** Rating filter (HANDOFF-mates Part B): a minimum average, on rows already loaded. */
const RATING_OPTIONS: FilterOption[] = [
  { value: '4', label: '4.0 and above' },
  { value: '4.5', label: '4.5 and above' },
]

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
      {
        key: 'rating',
        label: 'ratings',
        options: () => RATING_OPTIONS,
        match: (m, value) => m.reviewCount > 0 && m.averageRating >= Number(value),
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

  /* ---------- display-only helpers ---------- */

  // Small screens hide the Refine panel behind a "Filters" button.
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Filtering is instant; the Search button just takes you to the results.
  const resultsHead = useRef<HTMLHeadingElement | null>(null)
  function onSearch(e: FormEvent) {
    e.preventDefault()
    resultsHead.current?.focus()
  }

  const filterDef = (key: string) => list.filters.find((f) => f.key === key)
  const industryFilter = filterDef('industry')
  const suburbFilter = filterDef('suburb')
  const ratingValue = list.view.filters.rating ?? ''
  const capTip = `You can request up to ${maxProviders} providers at once`

  return (
    <div className="pg">
      {/* The Back button that used to sit here moved up to the dashboard in
          UAT Round 7 §3, where it now sits beneath the tab bar for both roles.
          Two Back buttons stacked on this one tab would be worse than none. */}

      <PageHead
        icon={<HeartPeopleIcon />}
        title="Your Jobby Mates"
        intro="Providers you've saved. Request a quote without searching again."
        action={
          <button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/home/referrals')}>
            <UserPlusIcon /> Invite a Jobby Mate
          </button>
        }
      />

      {error && <div className="pg-error" role="alert">{error}</div>}
      {mates === null && !error && <div className="pg-loading">Loading…</div>}

      {mates !== null && mates.length === 0 && !error && (
        <EmptyState
          action={<button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/home/find')}>Find providers</button>}
        >
          You haven't saved any providers yet. Save a provider while searching to add them here.
        </EmptyState>
      )}

      {mates && mates.length > 0 && (
        <>
          {/* ---- Search row ---- */}
          <form className="pg-searchrow" onSubmit={onSearch} role="search">
            <div className="pg-field pg-field-grow">
              <label htmlFor="mates-search">Search your mates</label>
              <span className="pg-input-ico">
                <SearchIcon />
                <input
                  id="mates-search"
                  type="search"
                  value={list.view.search}
                  placeholder="Provider name or keyword"
                  onChange={(e) => list.setSearch(e.target.value)}
                />
              </span>
            </div>
            {industryFilter && (
              <div className="pg-field">
                <label htmlFor="mates-industry">Industry</label>
                <select id="mates-industry" value={list.view.filters.industry ?? ''} onChange={(e) => list.setFilter('industry', e.target.value)}>
                  <option value="">All industries</option>
                  {industryFilter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            {suburbFilter && (
              <div className="pg-field">
                <label htmlFor="mates-suburb">Suburb</label>
                <select id="mates-suburb" value={list.view.filters.suburb ?? ''} onChange={(e) => list.setFilter('suburb', e.target.value)}>
                  <option value="">All suburbs</option>
                  {suburbFilter.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            <button type="submit" className="pg-btn pg-btn-navy pg-searchbtn">
              <SearchIcon /> Search
            </button>
          </form>

          <div className="pg-layout">
            {/* ---- Refine panel ---- */}
            <aside className="pg-side">
              <button
                type="button"
                className="pg-btn pg-btn-ghost pg-filters-toggle"
                aria-expanded={filtersOpen}
                aria-controls="mates-refine"
                onClick={() => setFiltersOpen((o) => !o)}
              >
                <FilterIcon /> Filters
              </button>
              <div id="mates-refine" className={`pg-refine${filtersOpen ? ' is-open' : ''}`}>
                <div className="pg-refine-head">
                  <h3>Refine your mates</h3>
                  {list.dirty && <button type="button" className="pg-link" onClick={list.clear}>Reset</button>}
                </div>
                <fieldset className="pg-radios">
                  <legend>Rating</legend>
                  {[{ value: '', label: 'Any rating' }, ...RATING_OPTIONS].map((o) => (
                    <label key={o.value || 'any'}>
                      <input
                        type="radio"
                        name="mates-rating"
                        value={o.value}
                        checked={ratingValue === o.value}
                        onChange={() => list.setFilter('rating', o.value)}
                      />
                      {o.label}
                    </label>
                  ))}
                </fieldset>
              </div>
              <div className="pg-note">
                <HeartIcon size={22} color="#1F6FD1" />
                <span><strong>Your saved providers</strong><br />Keep your favourites close.</span>
              </div>
            </aside>

            {/* ---- Results ---- */}
            <section className="pg-results" aria-labelledby="mates-count">
              {selected.length > 0 && (
                <SelectionBar
                  count={selected.length}
                  cap={maxProviders}
                  onContinue={requestFromSelected}
                  onClear={() => setSelected([])}
                />
              )}

              <div className="pg-toolbar">
                <h3 id="mates-count" ref={resultsHead} tabIndex={-1} className="pg-count">
                  {list.shown === list.total ? `${list.total} saved mates` : `${list.shown} of ${list.total} saved mates`}
                </h3>
                <div className="pg-toolbar-end">
                  <label className="pg-sort">
                    <span>Sort by</span>
                    <select value={list.view.sortKey} onChange={(e) => list.setSort(e.target.value)}>
                      {list.sorts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="pg-dir"
                    aria-label={list.view.sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
                    title={list.view.sortDir === 'asc' ? 'Lowest first' : 'Highest first'}
                    onClick={list.toggleDir}
                  >
                    {list.view.sortDir === 'asc' ? '↑' : '↓'}
                  </button>
                  <div className="pg-seg" role="group" aria-label="View">
                    <button type="button" className={layout === 'list' ? 'on' : ''} aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>
                      <ListIcon /> List
                    </button>
                    <button type="button" className={layout === 'grid' ? 'on' : ''} aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>
                      <GridIcon /> Grid
                    </button>
                  </div>
                </div>
              </div>

              {list.shown === 0 && (
                <EmptyState action={<button type="button" className="pg-btn pg-btn-ghost" onClick={list.clear}>Clear filters</button>}>
                  No mates match these filters.
                </EmptyState>
              )}

              {list.shown > 0 && (
                <div className={layout === 'grid' ? 'pc-grid' : 'pc-list'}>
                  {list.visible.map((m) => {
                    const isSelected = selected.includes(m.providerUserId)
                    const blocked = !isSelected && atCap
                    return (
                      <ProviderCard
                        key={m.providerUserId}
                        compact={layout === 'grid'}
                        name={nameOf(m)}
                        selected={isSelected}
                        selectDisabled={blocked}
                        selectTitle={blocked ? capTip : 'Include in one request'}
                        onToggle={() => toggle(m.providerUserId)}
                        badges={<span className="pg-chip pg-chip-saved"><HeartIcon size={14} /> Saved</span>}
                        industries={m.industries}
                        suburbs={m.suburbs}
                        serviceArea={m.serviceArea}
                        note={m.lastJobAt ? `Last used ${formatDate(m.lastJobAt)}` : null}
                        averageRating={m.averageRating}
                        reviewCount={m.reviewCount}
                        jobsCompleted={m.jobsCompleted}
                        actions={
                          <>
                            <button
                              type="button"
                              className={`pg-btn ${isSelected ? 'pg-btn-yellow' : 'pg-btn-navy'}`}
                              disabled={blocked}
                              title={blocked ? capTip : undefined}
                              aria-pressed={isSelected}
                              onClick={() => toggle(m.providerUserId)}
                            >
                              {isSelected ? <><CheckIcon /> Selected</> : 'Add to request'}
                            </button>
                            {/* Grid: a small link beside "Remove mate". List: a button, as before. */}
                            <button
                              type="button"
                              className={layout === 'grid' ? 'pg-link' : 'pg-btn pg-btn-ghost'}
                              onClick={() => navigate(`/providers/${m.providerUserId}`)}
                            >
                              View profile
                            </button>
                            <button type="button" className="pg-link" onClick={() => remove(m.providerUserId)}>
                              Remove mate
                            </button>
                          </>
                        }
                      />
                    )
                  })}
                </div>
              )}

              <div className="pg-morestrip">
                <SearchIcon size={22} />
                <span><strong>Need someone new?</strong></span>
                <button type="button" className="pg-link" onClick={() => navigate('/home/find')}>
                  Find more providers <ArrowIcon />
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
