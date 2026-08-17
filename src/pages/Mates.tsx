import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Stars } from '../components/Stars'
import { type Mate } from '../types'

export default function Mates() {
  const navigate = useNavigate()
  const [mates, setMates] = useState<Mate[] | null>(null)
  const [error, setError] = useState('')

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
      <div className="page-head"><h2>Your Jobby Mates</h2></div>
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
        <div className="job-list">
          {mates.map((m) => (
            <div className="job-card" key={m.providerUserId}>
              <div className="job-top">
                <span className="job-title">{m.businessName ?? m.providerName}</span>
                <span className="prov-rating">
                  {m.reviewCount > 0 ? (
                    <><Stars value={m.averageRating} /><span className="prov-rating-num">{m.averageRating.toFixed(1)} ({m.reviewCount})</span></>
                  ) : (<span className="prov-new">No reviews yet</span>)}
                </span>
              </div>
              {m.serviceArea && <div className="job-meta"><span>{m.serviceArea}</span></div>}
              <div className="job-foot">
                <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate(`/providers/${m.providerUserId}`)}>View profile</button>
                <div className="job-actions">
                  <button className="btn btn-ghost-dark btn-sm" onClick={() => remove(m.providerUserId)}>Remove</button>
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
