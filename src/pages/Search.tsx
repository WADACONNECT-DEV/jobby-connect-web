import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Stars } from '../components/Stars'
import { SuburbPicker } from '../components/SuburbPicker'
import { useMaxProvidersPerRequest } from '../platform'
import {
  CATEGORY_LABELS,
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
    <>
      <div className="page-head">
        <h2>Find a provider</h2>
      </div>
      <p className="page-intro">
        Choose the service you need and the suburb the work is in. You'll see the providers who
        actually cover that industry in that suburb.
      </p>

      <form className="search-filters" onSubmit={onSearch}>
        <div>
          <label htmlFor="search-industry">Service Industry</label>
          <select id="search-industry" value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
            <option value="">Choose an industry…</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="search-suburb">Suburb</label>
          <SuburbPicker id="search-suburb" value={suburbText} onChange={setSuburbText} onSelect={setSuburb} />
        </div>
        <div>
          <label htmlFor="search-sort">Sort by</label>
          <select id="search-sort" value={sort} onChange={(e) => changeSort(e.target.value as ProviderSearchSort)}>
            {SORTS.map((s) => <option key={s} value={s}>{SEARCH_SORT_LABELS[s]}</option>)}
          </select>
        </div>
        <button
          className="btn btn-amber"
          type="submit"
          disabled={!canSearch || searching}
          style={{ alignSelf: 'end' }}
          title={canSearch ? undefined : 'Choose an industry and a suburb first'}
        >
          {searching ? 'Searching…' : 'Apply'}
        </button>
      </form>

      {!canSearch && (
        <p className="field-hint">
          Both a service industry and a suburb are needed before searching — otherwise you'd see
          providers who don't work in your area.
        </p>
      )}

      {error && <div className="msg err">{error}</div>}
      {searching && <div className="loading">Searching…</div>}

      {results !== null && !searching && results.length === 0 && (
        <div className="empty">
          <p>
            No providers cover {industries.find((i) => i.id === industryId)?.name ?? 'that industry'} in{' '}
            {suburb?.name ?? 'that suburb'} yet. Try a nearby suburb, or a different service.
          </p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="job-list" style={{ marginBottom: 90 }}>
          {results.map((p) => (
            <div className={`job-card prov-card${isSelected(p.userId) ? ' prov-selected' : ''}`} key={p.userId}>
              <div className="job-top">
                <span className="job-title">{p.businessName}</span>
                <span className="prov-rating">
                  {p.reviewCount > 0 ? (
                    <><Stars value={p.averageRating} /><span className="prov-rating-num">{p.averageRating.toFixed(1)} ({p.reviewCount})</span></>
                  ) : (<span className="prov-new">No reviews yet</span>)}
                </span>
              </div>

              {/* The three figures the ranking is built on, so the order on
                  screen is explainable rather than mysterious (3.3-3.5). */}
              <div className="job-meta prov-stats">
                {p.reviewCount > 0 && <span><strong>{p.ratingPercent}%</strong> rating</span>}
                <span>{p.jobsCompleted} job{p.jobsCompleted === 1 ? '' : 's'} completed</span>
                {p.promoPoints > 0 && (
                  <span className="prov-points">+{formatMoney(p.promoPoints)} Mate Points offered</span>
                )}
              </div>

              <div className="job-meta"><span>{p.serviceArea}</span></div>
              <div className="prov-cats">
                {p.categories.map((c) => <span className="chip" key={c}>{CATEGORY_LABELS[c]}</span>)}
              </div>
              <div className="job-foot">
                <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate(`/providers/${p.userId}`)}>View profile</button>
                <div className="job-actions">
                  <button className="btn btn-sm btn-ghost-dark" onClick={() => saveMate(p)} disabled={savedMates.has(p.userId)}>
                    {savedMates.has(p.userId) ? '♥ Saved' : '♡ Save'}
                  </button>
                  <button
                    className={`btn btn-sm ${isSelected(p.userId) ? 'btn-green' : 'btn-amber'}`}
                    onClick={() => toggleSelect(p)}
                    disabled={!isSelected(p.userId) && selected.length >= maxProviders}
                  >
                    {isSelected(p.userId) ? '✓ Added' : '+ Add to request'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky selection bar */}
      {selected.length > 0 && (
        <div className="select-bar">
          <span>{selected.length} of {maxProviders} selected: {selected.map((s) => s.businessName).join(', ')}</span>
          <button className="btn btn-amber" onClick={proceed}>Request quotes →</button>
        </div>
      )}
    </>
  )
}
