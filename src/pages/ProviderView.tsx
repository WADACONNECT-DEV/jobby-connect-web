import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Stars } from '../components/Stars'
import { usePersistedValue } from '../listView'
import { formatDate, type ProviderPublic } from '../types'
import { initialsOf } from '../components/PageParts'
import { ContactRows, RatingBox, SideBox, SuburbChips, shortName } from '../components/PublicProfileParts'

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

  // Display values built from what the page already received.
  // Industries and services also arrive in no fixed order, so they're shown A-Z.
  const byName = (a: string, b: string) => a.localeCompare(b)
  const services = provider
    ? [...provider.services].sort((a, b) => byName(a.industry, b.industry))
        .map((s) => ({ ...s, subcategories: [...s.subcategories].sort(byName) }))
    : []
  const industries = services.map((s) => s.industry)
  const whatWeDo = Array.from(new Set(services.flatMap((s) => s.subcategories))).sort(byName)
  // Suburbs arrive as "Name, STATE" in no fixed order. Shown A–Z, and without the
  // state when they're all in the same one (as in the design). Display only.
  const rawSuburbs = [...(provider?.suburbs ?? [])].sort((a, b) => a.localeCompare(b))
  const states = new Set(rawSuburbs.map((s) => (s.includes(',') ? s.split(',').pop()!.trim() : '')))
  const suburbs = states.size === 1 && !states.has('')
    ? rawSuburbs.map((s) => s.slice(0, s.lastIndexOf(',')).trim())
    : rawSuburbs
  const tagline = provider
    ? [
        industries.join(', '),
        suburbs.length > 0
          ? `${suburbs.slice(0, 3).join(', ')}${suburbs.length > 3 ? ` +${suburbs.length - 3} suburbs` : ''}`
          : provider.serviceArea,
      ].filter(Boolean).join(' · ')
    : ''
  const hasReviews = (provider?.reviewCount ?? 0) > 0

  return (
    <div className="pv">
      <button type="button" className="pv-back" onClick={() => navigate(-1)}>← Back</button>

      {error && <div className="pg-error" role="alert">{error}</div>}
      {provider === null && !error && <div className="loading">Loading…</div>}

      {provider && (
        <div className={`pv-site site-${theme}`}>
          <header className="pv-hero">
            <span className="pv-initials" aria-hidden="true">{initialsOf(provider.businessName)}</span>
            <div className="pv-hero-main">
              <h1 className="pv-name">{provider.businessName}</h1>
              {tagline && <p className="pv-tagline">{tagline}</p>}
            </div>
            <div className="pv-hero-rating">
              {hasReviews ? (
                <>
                  <Stars value={provider.averageRating} />
                  <span>
                    <strong>{provider.averageRating.toFixed(1)}</strong> ({provider.reviewCount} review{provider.reviewCount === 1 ? '' : 's'})
                  </span>
                </>
              ) : (
                <span className="pv-new">No reviews yet</span>
              )}
            </div>
          </header>

          <nav className="pv-tabs" role="tablist" aria-label={`${provider.businessName} pages`}>
            {PAGES.map((p) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={page === p.key}
                className={`pv-tab${page === p.key ? ' on' : ''}`}
                onClick={() => setPage(p.key)}
              >
                {p.label}
              </button>
            ))}
          </nav>

          <div className="pv-body">
            {page === 'home' && (
              <div className="pv-cols">
                <div className="pv-main">
                  {provider.bio && <p className="pv-lead">{provider.bio}</p>}
                  {whatWeDo.length > 0 && (
                    <>
                      <h3 className="pv-label">What we do</h3>
                      <div className="pv-chips">
                        {whatWeDo.map((s) => <span className="pv-chip" key={s}>{s}</span>)}
                      </div>
                    </>
                  )}

                  <h3 className="pv-h3">Recent reviews</h3>
                  {provider.reviews.length === 0 && <p className="pv-muted">No reviews yet.</p>}
                  {provider.reviews.length > 0 && (
                    <ul className="pv-reviews">
                      {provider.reviews.slice(0, 3).map((r) => (
                        <li className="pv-review" key={r.id}>
                          <div className="pv-review-top">
                            <span className="pv-review-name">{shortName(r.reviewerName)}</span>
                            <Stars value={r.rating} />
                          </div>
                          <span className="pv-review-meta">{formatDate(r.createdAt)} · {r.jobTitle}</span>
                          {r.comment && <p className="pv-review-text">"{r.comment}"</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <aside className="pv-side">
                  {hasReviews && <RatingBox average={provider.averageRating} count={provider.reviewCount} />}
                  {(suburbs.length > 0 || provider.serviceArea) && (
                    <SideBox title="Where we work">
                      {provider.serviceArea && <p className="pv-area">{provider.serviceArea}</p>}
                      {suburbs.length > 0 && <SuburbChips suburbs={suburbs} limit={5} />}
                    </SideBox>
                  )}
                  {hasContact && (
                    <SideBox title="Get in touch">
                      <ContactRows phone={provider.contactPhone} email={provider.contactEmail} hours={provider.contactHours} />
                    </SideBox>
                  )}
                </aside>
              </div>
            )}

            {page === 'about' && (
              <div className="pv-narrow">
                <h3 className="pv-h3 first">About {provider.businessName}</h3>
                {provider.aboutText ? (
                  provider.aboutText.split('\n').filter(Boolean).map((para, i) => (
                    <p className="pv-para" key={i}>{para}</p>
                  ))
                ) : provider.bio ? (
                  <p className="pv-para">{provider.bio}</p>
                ) : (
                  <p className="pv-muted">This provider hasn't written an About page yet.</p>
                )}
                {suburbs.length > 0 && (
                  <>
                    <h3 className="pv-h3">Where we work</h3>
                    {provider.serviceArea && <p className="pv-area">{provider.serviceArea}</p>}
                    <SuburbChips suburbs={suburbs} />
                  </>
                )}
              </div>
            )}

            {page === 'services' && (
              <div className="pv-narrow">
                <h3 className="pv-h3 first">What we do</h3>
                {services.length === 0 && <p className="pv-muted">No services listed yet.</p>}
                {services.map((svc) => (
                  <section className="pv-service" key={svc.industry}>
                    <h4 className="pv-service-name">{svc.industry}</h4>
                    {svc.subcategories.length > 0 ? (
                      <div className="pv-chips">
                        {svc.subcategories.map((sc) => <span className="pv-chip" key={sc}>{sc}</span>)}
                      </div>
                    ) : (
                      <p className="pv-muted">General {svc.industry.toLowerCase()} work.</p>
                    )}
                  </section>
                ))}
              </div>
            )}

            {page === 'contact' && (
              <div className="pv-narrow">
                <h3 className="pv-h3 first">Get in touch</h3>
                {hasContact ? (
                  <div className="pv-box pv-contact-box">
                    <ContactRows phone={provider.contactPhone} email={provider.contactEmail} hours={provider.contactHours} />
                  </div>
                ) : (
                  <p className="pv-muted">
                    This provider hasn't published contact details. Request a quote and they'll come back to you.
                  </p>
                )}
                <p className="pv-para pv-surest">
                  The surest way to reach {provider.businessName} is to send a quote request — it goes
                  straight to them with your job details.
                </p>
              </div>
            )}
          </div>

          <footer className="pv-foot">
            <span className="pv-foot-msg">Want this provider? Your request goes only to them.</span>
            <span className="pv-foot-actions">
              <button type="button" className="pg-btn pg-btn-ghost" onClick={saveMate} disabled={saved}>
                {saved ? '♥ Saved as Mate' : '♡ Save as Mate'}
              </button>
              <button type="button" className="pg-btn pg-btn-yellow" onClick={requestQuote}>Request a quote →</button>
            </span>
          </footer>
        </div>
      )}
    </div>
  )
}
