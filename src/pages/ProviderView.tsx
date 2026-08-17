import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Stars } from '../components/Stars'
import { CATEGORY_LABELS, formatDate, type ProviderPublic } from '../types'

export default function ProviderView() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [provider, setProvider] = useState<ProviderPublic | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!userId) return
    api<ProviderPublic>(`/providers/${userId}`, 'GET')
      .then(setProvider)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this provider.'))
  }, [userId])

  async function saveMate() {
    if (!provider) return
    try {
      await api(`/mates/${provider.userId}`, 'POST')
      setSaved(true)
    } catch { /* ignore */ }
  }

  function requestQuote() {
    if (!provider) return
    navigate('/new-request', { state: { providers: [{ userId: provider.userId, businessName: provider.businessName }] } })
  }

  return (
    <>
      <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</button>

      {error && <div className="msg err">{error}</div>}
      {provider === null && !error && <div className="loading">Loading…</div>}

      {provider && (
        <>
          <div className="welcome">
            <div className="job-top">
              <h2>{provider.businessName}</h2>
              <span className="prov-rating">
                {provider.reviewCount > 0 ? (
                  <><Stars value={provider.averageRating} /><span className="prov-rating-num">{provider.averageRating.toFixed(1)} ({provider.reviewCount})</span></>
                ) : (<span className="prov-new">No reviews yet</span>)}
              </span>
            </div>
            <p style={{ marginTop: 6 }}>{provider.serviceArea}</p>
            <div className="prov-cats" style={{ marginTop: 10 }}>
              {provider.categories.map((c) => <span className="chip" key={c}>{CATEGORY_LABELS[c]}</span>)}
            </div>
            {provider.bio && <p className="prov-bio">{provider.bio}</p>}
            <div className="job-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-ghost-dark btn-sm" onClick={saveMate} disabled={saved}>{saved ? '♥ Saved as Mate' : '♡ Save as Mate'}</button>
              <button className="btn btn-amber btn-sm" onClick={requestQuote}>Request a quote</button>
            </div>
          </div>

          <h3 className="section-title">Reviews</h3>
          {provider.reviews.length === 0 && (<div className="empty"><p>This provider has no reviews yet.</p></div>)}
          {provider.reviews.length > 0 && (
            <div className="job-list">
              {provider.reviews.map((r) => (
                <div className="job-card" key={r.id}>
                  <div className="job-top">
                    <span className="quote-provider">{r.reviewerName}</span>
                    <Stars value={r.rating} />
                  </div>
                  {r.comment && <p className="review-comment">"{r.comment}"</p>}
                  <div className="job-meta" style={{ marginTop: 6 }}>
                    <span className="job-date">{formatDate(r.createdAt)} · {r.jobTitle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
