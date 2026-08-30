import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Stars } from '../components/Stars'
import { usePersistedValue } from '../listView'
import { CATEGORY_LABELS, formatDate, type ProviderPublic } from '../types'

type Page = 'home' | 'about' | 'services' | 'contact'

const PAGES: { key: Page; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'about', label: 'About Us' },
  { key: 'services', label: 'Services' },
  { key: 'contact', label: 'Contact Us' },
]

/**
 * A provider's public presence: a small four-page mini-site rather than a single
 * profile card (UAT Round 1 §5.4). The provider picks one of the built-in
 * themes; every theme stays inside the Jobby-Connect palette so the page still
 * reads as part of the product rather than a stranger's website.
 */
export default function ProviderView() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [provider, setProvider] = useState<ProviderPublic | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [page, setPage] = usePersistedValue<Page>('provider.site.page', 'home')

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

  const theme = (provider?.siteTheme ?? 'CLASSIC').toLowerCase()
  const hasContact = Boolean(provider?.contactEmail || provider?.contactPhone || provider?.contactHours)

  return (
    <>
      <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</button>

      {error && <div className="msg err">{error}</div>}
      {provider === null && !error && <div className="loading">Loading…</div>}

      {provider && (
        <div className={`site site-${theme}`}>
          <header className="site-hero">
            <div className="site-hero-main">
              <h2>{provider.businessName}</h2>
              <p className="site-tagline">{provider.serviceArea}</p>
            </div>
            <span className="prov-rating">
              {provider.reviewCount > 0 ? (
                <><Stars value={provider.averageRating} /><span className="prov-rating-num">{provider.averageRating.toFixed(1)} ({provider.reviewCount})</span></>
              ) : (<span className="prov-new">No reviews yet</span>)}
            </span>
          </header>

          <nav className="site-nav" role="tablist">
            {PAGES.map((p) => (
              <button
                key={p.key}
                role="tab"
                aria-selected={page === p.key}
                className={`site-navlink${page === p.key ? ' on' : ''}`}
                onClick={() => setPage(p.key)}
              >
                {p.label}
              </button>
            ))}
          </nav>

          <div className="site-body">
            {page === 'home' && (
              <>
                {provider.bio && <p className="site-lead">{provider.bio}</p>}
                <div className="prov-cats">
                  {provider.categories.map((c) => <span className="chip" key={c}>{CATEGORY_LABELS[c]}</span>)}
                </div>

                <h3 className="site-h3">Recent reviews</h3>
                {provider.reviews.length === 0 && <p className="site-muted">No reviews yet.</p>}
                {provider.reviews.slice(0, 3).map((r) => (
                  <div className="site-review" key={r.id}>
                    <div className="job-top">
                      <span className="quote-provider">{r.reviewerName}</span>
                      <Stars value={r.rating} />
                    </div>
                    {r.comment && <p className="review-comment">"{r.comment}"</p>}
                    <span className="job-date">{formatDate(r.createdAt)} · {r.jobTitle}</span>
                  </div>
                ))}
              </>
            )}

            {page === 'about' && (
              <>
                <h3 className="site-h3">About {provider.businessName}</h3>
                {provider.aboutText ? (
                  provider.aboutText.split('\n').filter(Boolean).map((para, i) => (
                    <p className="site-para" key={i}>{para}</p>
                  ))
                ) : provider.bio ? (
                  <p className="site-para">{provider.bio}</p>
                ) : (
                  <p className="site-muted">This provider hasn't written an About page yet.</p>
                )}
                {provider.suburbs.length > 0 && (
                  <>
                    <h3 className="site-h3">Where we work</h3>
                    <div className="prov-cats">
                      {provider.suburbs.map((s) => <span className="chip" key={s}>{s}</span>)}
                    </div>
                  </>
                )}
              </>
            )}

            {page === 'services' && (
              <>
                <h3 className="site-h3">What we do</h3>
                {provider.services.length === 0 && <p className="site-muted">No services listed yet.</p>}
                {provider.services.map((svc) => (
                  <div className="site-service" key={svc.industry}>
                    <div className="site-service-name">{svc.industry}</div>
                    {svc.subcategories.length > 0 ? (
                      <div className="prov-cats">
                        {svc.subcategories.map((sc) => <span className="chip" key={sc}>{sc}</span>)}
                      </div>
                    ) : (
                      <p className="site-muted">General {svc.industry.toLowerCase()} work.</p>
                    )}
                  </div>
                ))}
              </>
            )}

            {page === 'contact' && (
              <>
                <h3 className="site-h3">Get in touch</h3>
                {hasContact ? (
                  <div className="site-contact">
                    {provider.contactPhone && (
                      <div className="acct-row"><span className="acct-label">Phone</span><span className="acct-value">{provider.contactPhone}</span></div>
                    )}
                    {provider.contactEmail && (
                      <div className="acct-row"><span className="acct-label">Email</span><span className="acct-value">{provider.contactEmail}</span></div>
                    )}
                    {provider.contactHours && (
                      <div className="acct-row"><span className="acct-label">Hours</span><span className="acct-value">{provider.contactHours}</span></div>
                    )}
                  </div>
                ) : (
                  <p className="site-muted">
                    This provider hasn't published contact details. Request a quote and they'll come back to you.
                  </p>
                )}
                <p className="site-para" style={{ marginTop: 14 }}>
                  The surest way to reach {provider.businessName} is to send a quote request — it goes
                  straight to them with your job details.
                </p>
              </>
            )}
          </div>

          <footer className="site-foot-bar">
            <button className="btn btn-ghost-dark btn-sm" onClick={saveMate} disabled={saved}>
              {saved ? '♥ Saved as Mate' : '♡ Save as Mate'}
            </button>
            <button className="btn btn-amber btn-sm" onClick={requestQuote}>Request a quote</button>
          </footer>
        </div>
      )}
    </>
  )
}
