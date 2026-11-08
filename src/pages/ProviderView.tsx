import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, apiObjectUrl } from '../api'
import { Stars } from '../components/Stars'
import { usePersistedValue } from '../listView'
import { CATEGORY_LABELS, formatDate, type PremiumServiceListing, type ProfileMedia, type ProviderPublic } from '../types'
import { HighlightGlyph } from './ProviderProfile'
import { initialsOf } from '../components/mates/MateCard'

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

  // Premium page (step P5): the photos, and object URLs for them.
  const [media, setMedia] = useState<ProfileMedia[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    api<ProviderPublic>(`/providers/${userId}`, 'GET')
      .then((p) => {
        setProvider(p)
        if (p.premiumProfile) {
          api<ProfileMedia[]>(`/providers/${userId}/media`, 'GET').then(setMedia).catch(() => setMedia([]))
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this provider.'))
  }, [userId])

  // Photos come through the authenticated endpoint, so each is fetched as a
  // blob; the hero at full size, the rest as thumbnails. Revoked on unmount.
  useEffect(() => {
    let cancelled = false
    const made: string[] = []
    media.forEach((m) => {
      const thumb = m.kind !== 'HERO'
      apiObjectUrl(`/profile-media/${m.id}?thumb=${thumb}`)
        .then((u) => {
          if (cancelled) { URL.revokeObjectURL(u); return }
          made.push(u)
          setUrls((prev) => ({ ...prev, [m.id]: u }))
        })
        .catch(() => { /* a missing photo shouldn't break the page */ })
    })
    return () => { cancelled = true; made.forEach((u) => URL.revokeObjectURL(u)) }
  }, [media])

  async function openFull(id: string) {
    try { setLightbox(await apiObjectUrl(`/profile-media/${id}`)) } catch { /* ignore */ }
  }

  async function saveMate() {
    if (!provider) return
    try {
      await api(`/mates/${provider.userId}`, 'POST')
      setSaved(true)
    } catch { /* ignore */ }
  }

  function requestQuote(service?: PremiumServiceListing) {
    if (!provider) return
    // From a service card: the form starts on that service and its industry.
    const industryName = service?.subcategoryName
      ? provider.services.find((svc) => svc.subcategories.includes(service.subcategoryName as string))?.industry
      : undefined
    navigate('/new-request', {
      state: {
        providers: [{ userId: provider.userId, businessName: provider.businessName }],
        service: service?.title,
        industryName,
      },
    })
  }

  const premium = provider?.premiumProfile ? provider.premium ?? null : null
  const logo = media.find((m) => m.kind === 'LOGO') ?? null
  const hero = media.find((m) => m.kind === 'HERO') ?? null
  const gallery = media.filter((m) => m.kind === 'GALLERY')
  const servicePhoto = (id: string | null) => (id ? media.find((m) => m.kind === 'SERVICE' && m.serviceRef === id) ?? null : null)
  const video = embedUrl(premium?.videoUrl ?? null)

  const theme = (provider?.siteTheme ?? 'CLASSIC').toLowerCase()
  const hasContact = Boolean(provider?.contactEmail || provider?.contactPhone || provider?.contactHours)

  // Header line and chips from what the page already receives (redesign step 11).
  const industryNames = provider ? provider.services.map((svc) => svc.industry) : []
  const headIndustries = industryNames.length > 0
    ? industryNames.join(', ')
    : (provider?.categories ?? []).map((c) => CATEGORY_LABELS[c]).join(', ')
  const suburbs = provider?.suburbs ?? []
  const headSuburbs = suburbs.length > 0
    ? `${suburbs.slice(0, 3).join(', ')}${suburbs.length > 3 ? ` +${suburbs.length - 3} suburb${suburbs.length === 4 ? '' : 's'}` : ''}`
    : provider?.serviceArea ?? ''
  const whatWeDo = provider
    ? provider.services.flatMap((svc) => (svc.subcategories.length > 0 ? svc.subcategories : [svc.industry]))
    : []

  const whereWeWork = (limit: number) => suburbs.length === 0 ? null : (
    <div className="pv-chips">
      {suburbs.slice(0, limit).map((sb) => <span className="pv-chip" key={sb}>{sb}</span>)}
      {suburbs.length > limit && <span className="pv-chip">+{suburbs.length - limit}</span>}
    </div>
  )

  const contactRows = provider && hasContact && (
    <div className="pv-contact">
      {provider.contactPhone && <div className="pv-contact-row"><PhoneIcon /><span>{provider.contactPhone}</span></div>}
      {provider.contactEmail && <div className="pv-contact-row"><MailIcon /><span>{provider.contactEmail}</span></div>}
      {provider.contactHours && <div className="pv-contact-row"><ClockIcon /><span>{provider.contactHours}</span></div>}
    </div>
  )

  return (
    <div className="pv">
      <button className="app-back" onClick={() => navigate(-1)}>← Back</button>

      {error && <div className="msg err">{error}</div>}
      {provider === null && !error && <div className="loading">Loading…</div>}

      {provider && (
        <div className={`pv-site pv-${theme}`}>
          <header className="pv-hero">
            {logo && urls[logo.id]
              ? <img className="pv-logo" src={urls[logo.id]} alt="" />
              : <span className="pv-initials" aria-hidden="true">{initialsOf(provider.businessName)}</span>}
            <div className="pv-hero-main">
              <h1 className="pv-name">{provider.businessName}{premium && <span className="pv-premium">Premium</span>}</h1>
              {(headIndustries || headSuburbs) && (
                <p className="pv-line">{[headIndustries, headSuburbs].filter(Boolean).join(' · ')}</p>
              )}
            </div>
            <span className="pv-rating">
              {provider.reviewCount > 0 ? (
                <><Stars value={provider.averageRating} /><span><strong>{provider.averageRating.toFixed(1)}</strong> ({provider.reviewCount} review{provider.reviewCount === 1 ? '' : 's'})</span></>
              ) : (<span>No reviews yet</span>)}
            </span>
          </header>

          <nav className="pv-nav" role="tablist">
            {PAGES.map((p) => (
              <button
                key={p.key}
                role="tab"
                aria-selected={page === p.key}
                className={`pv-navlink${page === p.key ? ' is-on' : ''}`}
                onClick={() => setPage(p.key)}
              >
                {p.label}
              </button>
            ))}
          </nav>

          {premium && page === 'home' && (premium.headline || premium.intro || hero) && (
            <section className={`pv-prem-hero${hero ? ' has-photo' : ''}`}>
              <div className="pv-prem-text">
                {premium.headline && <h2 className="pv-headline">{premium.headline}</h2>}
                {premium.intro && <p className="pv-intro">{premium.intro}</p>}
                {(premium.serviceListings.length > 0 || whatWeDo.length > 0) && (
                  <ul className="pv-key">
                    {(premium.serviceListings.length > 0 ? premium.serviceListings.map((s) => s.title) : whatWeDo).slice(0, 6).map((name, i) => (
                      <li key={`${name}-${i}`}><TickIcon /> {name}</li>
                    ))}
                  </ul>
                )}
                <div className="pv-prem-actions">
                  <button className="mt-continue" onClick={() => requestQuote()}>Request a quote →</button>
                  <button className="mt-btn-ghost" onClick={saveMate} disabled={saved}>{saved ? '♥ Saved as Mate' : '♡ Save as Mate'}</button>
                </div>
              </div>
              {hero && (
                <div className="pv-prem-photo">
                  {urls[hero.id] ? <img src={urls[hero.id]} alt="" /> : <span className="pv-photo-wait" />}
                </div>
              )}
            </section>
          )}

          {premium && page === 'home' && premium.highlights.length > 0 && (
            <ul className="pv-highlights" aria-label="Highlights">
              {premium.highlights.map((h, i) => (
                <li key={i}>
                  <HighlightGlyph icon={h.icon} />
                  <span><strong>{h.title}</strong>{h.subLine && <small>{h.subLine}</small>}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="pv-body">
            {page === 'home' && (
              <div className="pv-two">
                <div className="pv-main">
                  {provider.bio && <p className="pv-lead">{provider.bio}</p>}
                  {whatWeDo.length > 0 && (
                    <>
                      <h3 className="pv-label">What we do</h3>
                      <div className="pv-chips">
                        {whatWeDo.map((w, i) => <span className="pv-chip" key={`${w}-${i}`}>{w}</span>)}
                      </div>
                    </>
                  )}

                  <h3 className="pv-h3">Recent reviews</h3>
                  {provider.reviews.length === 0 && <p className="pv-muted">No reviews yet.</p>}
                  {provider.reviews.slice(0, 3).map((r) => (
                    <div className="pv-review" key={r.id}>
                      <div className="pv-review-top">
                        <strong>{shortName(r.reviewerName)}</strong>
                        <Stars value={r.rating} />
                      </div>
                      <span className="pv-review-meta">{formatDate(r.createdAt)} · {r.jobTitle}</span>
                      {r.comment && <p className="pv-review-text">"{r.comment}"</p>}
                    </div>
                  ))}
                </div>

                <aside className="pv-side">
                  {provider.reviewCount > 0 && (
                    <div className="pv-box pv-stats">
                      <div className="pv-stat"><strong>{provider.averageRating.toFixed(1)} ★</strong><span>{provider.reviewCount} review{provider.reviewCount === 1 ? '' : 's'}</span></div>
                      {/* % rating = average ÷ 5, display only (handoff Part N). */}
                      <div className="pv-stat"><strong>{Math.round((provider.averageRating / 5) * 100)}%</strong><span>rating</span></div>
                    </div>
                  )}
                  {suburbs.length > 0 && (
                    <div className="pv-box">
                      <h3 className="pv-h4">Where we work</h3>
                      {whereWeWork(5)}
                    </div>
                  )}
                  {hasContact && (
                    <div className="pv-box">
                      <h3 className="pv-h4">Get in touch</h3>
                      {contactRows}
                    </div>
                  )}
                </aside>
              </div>
            )}

            {page === 'about' && (
              <div className="pv-single">
                <h3 className="pv-h3">About {provider.businessName}</h3>
                {provider.aboutText ? (
                  provider.aboutText.split('\n').filter(Boolean).map((para, i) => (
                    <p className="pv-para" key={i}>{para}</p>
                  ))
                ) : provider.bio ? (
                  <p className="pv-para">{provider.bio}</p>
                ) : (
                  <p className="pv-muted">This provider hasn't written an About page yet.</p>
                )}
                {premium?.aboutSections.map((sec, i) => (
                  <div className="pv-about-sec" key={i}>
                    <h4 className="pv-h4">{sec.title}</h4>
                    {(sec.body ?? '').split('\n').filter(Boolean).map((para, n) => <p className="pv-para" key={n}>{para}</p>)}
                  </div>
                ))}
                {premium && gallery.length > 0 && (
                  <>
                    <h3 className="pv-h3">Our work</h3>
                    <div className="pv-gallery">
                      {gallery.map((g) => (
                        <button type="button" className="pv-tile" key={g.id} onClick={() => openFull(g.id)} aria-label="Open photo">
                          {urls[g.id] ? <img src={urls[g.id]} alt="" /> : <span className="pv-photo-wait" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {suburbs.length > 0 && (
                  <>
                    <h3 className="pv-h3">Where we work</h3>
                    {whereWeWork(suburbs.length)}
                  </>
                )}
              </div>
            )}

            {page === 'services' && (
              <div className="pv-single">
                {premium && premium.serviceListings.length > 0 && (
                  <>
                    <h3 className="pv-h3">Our services</h3>
                    <p className="pv-muted">Tap a service to request a quote for it.</p>
                    <div className="pv-svc-grid">
                      {premium.serviceListings.map((sl) => {
                        const photo = servicePhoto(sl.id)
                        return (
                          <button type="button" className="pv-svc" key={sl.id ?? sl.title} onClick={() => requestQuote(sl)}>
                            <span className="pv-svc-photo">
                              {photo && urls[photo.id] ? <img src={urls[photo.id]} alt="" /> : <span className="pv-svc-blank"><ToolIcon /></span>}
                            </span>
                            <span className="pv-svc-body">
                              <strong>{sl.title}</strong>
                              {sl.description && <span>{sl.description}</span>}
                              <em>Request a quote →</em>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
                <h3 className="pv-h3">What we do</h3>
                {provider.services.length === 0 && <p className="pv-muted">No services listed yet.</p>}
                {provider.services.map((svc) => (
                  <div className="pv-service" key={svc.industry}>
                    <h4 className="pv-service-name">{svc.industry}</h4>
                    {svc.subcategories.length > 0 ? (
                      <div className="pv-chips">
                        {svc.subcategories.map((sc) => <span className="pv-chip" key={sc}>{sc}</span>)}
                      </div>
                    ) : (
                      <p className="pv-muted">General {svc.industry.toLowerCase()} work.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {page === 'contact' && (
              <div className="pv-single">
                <h3 className="pv-h3">Get in touch</h3>
                {hasContact ? contactRows : (
                  <p className="pv-muted">
                    This provider hasn't published contact details. Request a quote and they'll come back to you.
                  </p>
                )}
                {premium?.website && (
                  <div className="pv-contact">
                    <div className="pv-contact-row"><GlobeIcon /><a href={withScheme(premium.website)} target="_blank" rel="noopener noreferrer">{premium.website}</a></div>
                  </div>
                )}
                {video && (
                  <div className="pv-video">
                    <iframe src={video} title="Video" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
                  </div>
                )}
                <p className="pv-para pv-surest">
                  The surest way to reach {provider.businessName} is to send a quote request — it goes
                  straight to them with your job details.
                </p>
              </div>
            )}
          </div>

          <footer className="pv-foot">
            <span>Want this provider? Your request goes only to them.</span>
            <div className="pv-foot-actions">
              <button className="mt-btn-ghost" onClick={saveMate} disabled={saved}>
                {saved ? '♥ Saved as Mate' : '♡ Save as Mate'}
              </button>
              <button className="mt-continue" onClick={() => requestQuote()}>Request a quote →</button>
            </div>
          </footer>
        </div>
      )}

      {lightbox && (
        <div className="pv-lightbox" role="dialog" aria-label="Photo" onClick={() => { URL.revokeObjectURL(lightbox); setLightbox(null) }}>
          <img src={lightbox} alt="" />
          <button type="button" className="pv-lightbox-close" aria-label="Close">×</button>
        </div>
      )}
    </div>
  )
}

/** A website typed without a scheme still opens. */
function withScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

/** YouTube and Vimeo links as embeddable players; anything else is not embedded. */
function embedUrl(url: string | null): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

/** "Archie Knight" → "Archie K." for reviews on the public page. */
function shortName(full: string): string {
  const parts = full.trim().split(/\s+/)
  if (parts.length < 2) return parts[0] ?? ''
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`
}

/* ---------- icons (decorative) ---------- */

const Svg = ({ children }: { children: ReactNode }) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const PhoneIcon = () => <Svg><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></Svg>
const MailIcon = () => <Svg><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Svg>
const ClockIcon = () => <Svg><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
const GlobeIcon = () => <Svg><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Svg>
const TickIcon = () => <Svg><path d="M5 12l4 4L19 7" /></Svg>
const ToolIcon = () => <Svg><path d="M14.7 6.3a4 4 0 0 0 5 5L13 18l-3-3 6.7-6.7z M4 20l5-5" /></Svg>
