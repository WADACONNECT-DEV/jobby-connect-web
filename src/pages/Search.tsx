import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ProviderResultCard } from '../components/mates/ProviderResultCard'
import { SuburbPicker } from '../components/SuburbPicker'
import { useMaxProvidersPerRequest } from '../platform'
import {
  SEARCH_SORT_LABELS,
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
    // The industry searched for comes along, so the request form starts on it (step J1).
    navigate('/new-request', { state: { providers: selected, industryId } })
  }

  const isSelected = (id: string) => selected.some((s) => s.userId === id)
  const atCap = selected.length >= maxProviders

  /**
   * Find & Request Quotes (redesign step 4), in the Your Jobby Mates look.
   * Same search call, industries, suburb picker, sorts, selection cap, save and
   * hand-off to the request form as before. Result cards no longer show the
   * six old categories; they show the provider's industries, services and
   * suburbs, now returned by the search.
   */
  return (
    <div className="mt">
      <div className="mt-head">
        <div className="mt-head-copy">
          <MagnifierIcon />
          <div>
            <h2 className="mt-title">Find &amp; Request Quotes</h2>
            <p className="mt-sub">Choose the service and the suburb — you'll see providers who cover both.</p>
          </div>
        </div>
      </div>

      <form className="mt-search fq-search" onSubmit={onSearch}>
        <label className="mt-field" htmlFor="search-industry">
          <span>SERVICE INDUSTRY</span>
          <select id="search-industry" value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
            <option value="">Choose an industry…</option>
            {industries.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </label>
        <div className="mt-field fq-suburb">
          <span><label htmlFor="search-suburb">SUBURB</label></span>
          <SuburbPicker id="search-suburb" value={suburbText} onChange={setSuburbText} onSelect={setSuburb} />
        </div>
        <label className="mt-field" htmlFor="search-sort">
          <span>SORT BY</span>
          <select id="search-sort" value={sort} onChange={(e) => changeSort(e.target.value as ProviderSearchSort)}>
            {SORTS.map((s) => <option key={s} value={s}>{SEARCH_SORT_LABELS[s]}</option>)}
          </select>
        </label>
        <button
          className="mt-search-btn"
          type="submit"
          disabled={!canSearch || searching}
          title={canSearch ? undefined : 'Choose an industry and a suburb first'}
        >
          <SearchIcon /> {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {!canSearch && (
        <p className="fq-hint">
          Both a service industry and a suburb are needed before searching — otherwise you'd see
          providers who don't work in your area.
        </p>
      )}

      {error && <div className="msg err">{error}</div>}

      {selected.length > 0 && (
        <div className="mt-selbar" role="status">
          <span className="mt-selbar-count">{selected.length} of {maxProviders} providers selected</span>
          <span className="mt-selbar-note">Only selected providers will receive your request.</span>
          <span className="mt-selbar-actions">
            <button type="button" className="mt-clear" onClick={() => setSelected([])}>Clear</button>
            <button type="button" className="mt-continue" onClick={proceed}>
              Continue with {selected.length} <ArrowIcon />
            </button>
          </span>
        </div>
      )}

      {searching && <div className="mt-empty"><p>Searching…</p></div>}

      {results === null && !searching && (
        <div className="mt-empty">
          <p>Choose a service industry and a suburb, then press Search.</p>
        </div>
      )}

      {results !== null && !searching && results.length === 0 && (
        <div className="mt-empty">
          <p>
            No providers cover {industries.find((i) => i.id === industryId)?.name ?? 'that industry'} in{' '}
            {suburb?.name ?? 'that suburb'} yet. Try a nearby suburb, or a different service.
          </p>
        </div>
      )}

      {results && results.length > 0 && !searching && (
        <>
          <h3 className="mt-count">{results.length} provider{results.length === 1 ? '' : 's'} found</h3>
          <div className="mt-list">
            {results.map((p) => (
              <ProviderResultCard
                key={p.userId}
                provider={p}
                selected={isSelected(p.userId)}
                blocked={!isSelected(p.userId) && atCap}
                blockedTitle={`You can request up to ${maxProviders} providers at once`}
                saved={savedMates.has(p.userId)}
                onToggle={() => toggleSelect(p)}
                onViewProfile={() => navigate(`/providers/${p.userId}`)}
                onSave={() => saveMate(p)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ---------- icons (decorative) ---------- */

function MagnifierIcon() {
  return (
    <svg aria-hidden="true" className="mt-head-ico" width="46" height="46" viewBox="0 0 24 24" fill="none"
      stroke="#0F2A4A" strokeWidth="1.9" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" stroke="#D9A400" strokeWidth="2.4" /></svg>
  )
}
function SearchIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF"
      strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" /></svg>
  )
}
function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  )
}
