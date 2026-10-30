import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { CheckIcon, EmptyState, GridIcon, ListIcon, PageHead, SearchIcon, SelectionBar } from '../components/PageParts'
import { ProviderCard } from '../components/ProviderCard'
import { usePersistedValue } from '../listView'
import { SuburbPicker } from '../components/SuburbPicker'
import { useMaxProvidersPerRequest } from '../platform'
import {
  SEARCH_SORT_LABELS,
  formatMoney,
  type MasterIndustry,
  type MasterSuburb,
  type ProviderSearchSort,
  type ProviderSummary,
} from '../types'

interface Selected {
  userId: string
  businessName: string
}

const SORTS: ProviderSearchSort[] = ['RATING', 'JOB_COUNT', 'POINTS_OFFERED']

export default function Search() {
  const navigate = useNavigate()

  // Industry and suburb both come from the platform master lists, and both are
  // required before a search can run (UAT Round 4 3.1). The provider's own
  // tagging of those two is what decides who is returned (3.2) - which is why a
  // free-text suburb is no longer enough.
  const [industries, setIndustries] = useState<MasterIndustry[]>([])
  const [industryId, setIndustryId] = useState('')
  const [suburbText, setSuburbText] = useState('')
  const [suburb, setSuburb] = useState<MasterSuburb | null>(null)
  const [sort, setSort] = useState<ProviderSearchSort>('RATING')

  const [results, setResults] = useState<ProviderSummary[] | null>(null)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Selected[]>([])
  const [savedMates, setSavedMates] = useState<Set<string>>(new Set())

  // The cap is admin-managed (UAT Round 2 open item 7.2) - never a literal here.
  const maxProviders = useMaxProvidersPerRequest()
  const capTip = `You can request up to ${maxProviders} providers at once`

  // List / Grid, remembered the same way as Your Jobby Mates. Display only; default List.
  const [layout, setLayout] = usePersistedValue<'list' | 'grid'>('customer.find.layout', 'list')

  useEffect(() => {
    api<MasterIndustry[]>('/master/industries', 'GET')
      .then((rows) => setIndustries(rows.filter((i) => i.active)))
      .catch(() => setError('Could not load the service industries.'))
  }, [])

  const canSearch = Boolean(industryId) && Boolean(suburb)

  async function runSearch(nextSort?: ProviderSearchSort) {
    if (!industryId || !suburb) return
    const chosenSort = nextSort ?? sort
    setError('')
    setSearching(true)
    try {
      const params = new URLSearchParams({ industryId, suburbId: suburb.id, sort: chosenSort })
      const found = await api<ProviderSummary[]>(`/providers/search?${params.toString()}`, 'GET')
      setResults(found)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault()
    runSearch()
  }

  /** Re-sorting is a fresh search, so the server's tie-break chain is the one used. */
  function changeSort(next: ProviderSearchSort) {
    setSort(next)
    if (results !== null) runSearch(next)
  }

  function toggleSelect(p: ProviderSummary) {
    setSelected((prev) => {
      const exists = prev.find((s) => s.userId === p.userId)
      if (exists) return prev.filter((s) => s.userId !== p.userId)
      // BUGFIX: this guard was still a hard-coded 3 while the button beside it
      // used the configured cap, so a fourth pick silently did nothing.
      if (prev.length >= maxProviders) return prev
      return [...prev, { userId: p.userId, businessName: p.businessName }]
    })
  }

  async function saveMate(p: ProviderSummary) {
    try {
      await api(`/mates/${p.userId}`, 'POST')
      setSavedMates((prev) => new Set(prev).add(p.userId))
    } catch {
      /* ignore - non-critical */
    }
  }

  function proceed() {
    if (selected.length === 0) return
    navigate('/new-request', { state: { providers: selected } })
  }

  const isSelected = (id: string) => selected.some((s) => s.userId === id)

  return (
    <div className="pg fd">
      <PageHead
        icon={<SearchIcon size={44} />}
        title="Find & Request Quotes"
        intro="Choose the service and the suburb — you'll see providers who cover both."
      />

      <form className="pg-searchrow fd-search" onSubmit={onSearch} role="search">
        <div className="pg-field">
          <label htmlFor="search-industry">Service industry</label>
          <select id="search-industry" value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
            <option value="">Choose an industry…</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        <div className="pg-field">
          <label htmlFor="search-suburb">Suburb</label>
          <SuburbPicker id="search-suburb" value={suburbText} onChange={setSuburbText} onSelect={setSuburb} />
        </div>
        <div className="pg-field">
          <label htmlFor="search-sort">Sort by</label>
          <select id="search-sort" value={sort} onChange={(e) => changeSort(e.target.value as ProviderSearchSort)}>
            {SORTS.map((s) => <option key={s} value={s}>{SEARCH_SORT_LABELS[s]}</option>)}
          </select>
        </div>
        <button
          className="pg-btn pg-btn-navy pg-searchbtn"
          type="submit"
          disabled={!canSearch || searching}
          title={canSearch ? undefined : 'Choose an industry and a suburb first'}
        >
          <SearchIcon /> {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {!canSearch && (
        <p className="fd-hint">
          Both a service industry and a suburb are needed before searching — otherwise you'd see
          providers who don't work in your area.
        </p>
      )}

      {error && <div className="pg-error" role="alert">{error}</div>}

      {results === null && !searching && (
        <EmptyState>Your results will appear here.</EmptyState>
      )}
      {searching && <div className="pg-loading" role="status">Searching…</div>}

      {results !== null && !searching && results.length === 0 && (
        <EmptyState>
          No providers cover {industries.find((i) => i.id === industryId)?.name ?? 'that industry'} in{' '}
          {suburb?.name ?? 'that suburb'} yet. Try a nearby suburb, or a different service.
        </EmptyState>
      )}

      {selected.length > 0 && (
        <SelectionBar
          count={selected.length}
          cap={maxProviders}
          onContinue={proceed}
          onClear={() => setSelected([])}
        />
      )}

      {results && results.length > 0 && (
        <>
          <div className="pg-toolbar">
            <h3 className="pg-count">{results.length} provider{results.length === 1 ? '' : 's'} found</h3>
            <div className="pg-toolbar-end">
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

          {/* Category chips are left off: the six old categories are empty for
              the new industries (BACKEND-REQUESTS.md). The three ranking figures
              stay, so the order on screen is explainable (UAT Round 4 3.3-3.5). */}
          <div className={layout === 'grid' ? 'pc-grid' : 'pc-list'}>
            {results.map((p) => {
              const sel = isSelected(p.userId)
              const blocked = !sel && selected.length >= maxProviders
              const saved = savedMates.has(p.userId)
              const small = layout === 'grid'
              return (
                <ProviderCard
                  key={p.userId}
                  compact={small}
                  name={p.businessName}
                  selected={sel}
                  selectDisabled={blocked}
                  selectTitle={blocked ? capTip : 'Include in one request'}
                  onToggle={() => toggleSelect(p)}
                  badges={p.promoPoints > 0
                    ? <span className="pg-chip pg-chip-saved">+{formatMoney(p.promoPoints)} Mate Points offered</span>
                    : undefined}
                  industries={[]}
                  suburbs={[]}
                  serviceArea={p.serviceArea}
                  averageRating={p.averageRating}
                  reviewCount={p.reviewCount}
                  ratingPercent={p.ratingPercent}
                  jobsCompleted={p.jobsCompleted}
                  actions={
                    <>
                      <button
                        type="button"
                        className={`pg-btn ${sel ? 'pg-btn-yellow' : 'pg-btn-navy'}`}
                        disabled={blocked}
                        title={blocked ? capTip : undefined}
                        aria-pressed={sel}
                        onClick={() => toggleSelect(p)}
                      >
                        {sel ? <><CheckIcon /> Selected</> : 'Add to request'}
                      </button>
                      <button
                        type="button"
                        className={small ? 'pg-link' : 'pg-btn pg-btn-ghost'}
                        onClick={() => navigate(`/providers/${p.userId}`)}
                      >
                        View profile
                      </button>
                      <button
                        type="button"
                        className={small ? 'pg-link' : 'pg-btn pg-btn-ghost'}
                        onClick={() => saveMate(p)}
                        disabled={saved}
                        aria-label={saved ? 'Saved as a Jobby Mate' : `Save ${p.businessName} as a Jobby Mate`}
                      >
                        {saved ? '♥ Saved' : small ? '♡ Save' : '♡ Save as Jobby Mate'}
                      </button>
                    </>
                  }
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
