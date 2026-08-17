import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Stars } from '../components/Stars'
import {
  CATEGORY_LABELS,
  parseSearch,
  type ProviderSummary,
  type ServiceCategory,
} from '../types'

interface Selected {
  userId: string
  businessName: string
}

export default function Search() {
  const navigate = useNavigate()
  const [chat, setChat] = useState('')
  const [category, setCategory] = useState<ServiceCategory | ''>('')
  const [suburb, setSuburb] = useState('')
  const [results, setResults] = useState<ProviderSummary[] | null>(null)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Selected[]>([])
  const [savedMates, setSavedMates] = useState<Set<string>>(new Set())

  const categories = Object.keys(CATEGORY_LABELS) as ServiceCategory[]

  async function runSearch(cat: ServiceCategory | '', sub: string) {
    setError('')
    setSearching(true)
    try {
      const params = new URLSearchParams()
      if (cat) params.set('category', cat)
      if (sub.trim()) params.set('suburb', sub.trim())
      const qs = params.toString()
      const found = await api<ProviderSummary[]>(`/providers/search${qs ? `?${qs}` : ''}`, 'GET')
      setResults(found)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  function onStructuredSearch(e: FormEvent) {
    e.preventDefault()
    runSearch(category, suburb)
  }

  function onChatSearch(e: FormEvent) {
    e.preventDefault()
    const parsed = parseSearch(chat)
    if (parsed.category) setCategory(parsed.category)
    if (parsed.suburb) setSuburb(parsed.suburb)
    runSearch(parsed.category ?? category, parsed.suburb ?? suburb)
  }

  function toggleSelect(p: ProviderSummary) {
    setSelected((prev) => {
      const exists = prev.find((s) => s.userId === p.userId)
      if (exists) return prev.filter((s) => s.userId !== p.userId)
      if (prev.length >= 3) return prev // cap at 3
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

      {/* Chat-style search */}
      <form className="search-chat" onSubmit={onChatSearch}>
        <input
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          placeholder="Describe your job — e.g. “vacate cleaning in Pakenham”"
        />
        <button className="btn btn-amber" type="submit">Search</button>
      </form>

      {/* Structured filters */}
      <form className="search-filters" onSubmit={onStructuredSearch}>
        <div>
          <label>Service</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory | '')}>
            <option value="">Any service</option>
            {categories.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Suburb</label>
          <input value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="e.g. Pakenham" />
        </div>
        <button className="btn btn-ghost-dark" type="submit" style={{ alignSelf: 'end' }}>Apply</button>
      </form>

      {error && <div className="msg err">{error}</div>}
      {searching && <div className="loading">Searching…</div>}

      {results !== null && !searching && results.length === 0 && (
        <div className="empty"><p>No providers matched. Try a different service or suburb.</p></div>
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
              <div className="job-meta"><span>{p.serviceArea}</span></div>
              <div className="prov-cats">
                {p.categories.map((c) => <span className="chip" key={c}>{CATEGORY_LABELS[c]}</span>)}
              </div>
              <div className="job-foot">
                <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate(`/providers/${p.userId}`)}>View profile</button>
                <div className="job-actions">
                  <button
                    className={`btn btn-sm ${savedMates.has(p.userId) ? 'btn-ghost-dark' : 'btn-ghost-dark'}`}
                    onClick={() => saveMate(p)}
                    disabled={savedMates.has(p.userId)}
                  >
                    {savedMates.has(p.userId) ? '♥ Saved' : '♡ Save'}
                  </button>
                  <button
                    className={`btn btn-sm ${isSelected(p.userId) ? 'btn-green' : 'btn-amber'}`}
                    onClick={() => toggleSelect(p)}
                    disabled={!isSelected(p.userId) && selected.length >= 3}
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
          <span>{selected.length} of 3 selected: {selected.map((s) => s.businessName).join(', ')}</span>
          <button className="btn btn-amber" onClick={proceed}>Request quotes →</button>
        </div>
      )}
    </>
  )
}
