import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { THEME_LABELS, type SiteTheme } from '../types'
import { useAuth } from '../auth'
import {
  HIGHLIGHT_ICONS,
  HIGHLIGHT_ICON_LABELS,
  type HighlightIcon,
  type MasterIndustry,
  type MasterPlan,
  type MasterSubcategory,
  type MasterSuburb,
  type PremiumAboutSection,
  type PremiumContent,
  type PremiumHighlight,
  type PremiumServiceListing,
  type ProfileMedia,
  type ProviderProfile as Profile,
} from '../types'
import { MediaBox } from '../components/profile/MediaBox'

/**
 * The provider profile editor (redesign step 11, owner's Part M).
 *
 * Still one form and one Save: the five sections only change what is on
 * screen. The save call, what it sends, the required fields and their
 * messages are the same as before. A required-field error opens the section
 * that holds the field.
 */
type Section = 'business' | 'services' | 'area' | 'public' | 'premium'

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'business', label: 'Business details' },
  { key: 'services', label: 'Services' },
  { key: 'area', label: 'Service area' },
  { key: 'public', label: 'Public page' },
  { key: 'premium', label: 'Photos & highlights' },
]

const BIO_MAX = 1000
const ABOUT_MAX = 4000
const HEADLINE_MAX = 160
const INTRO_MAX = 600
const MAX_HIGHLIGHTS = 4
const MAX_ABOUT_SECTIONS = 5

const EMPTY_PREMIUM: PremiumContent = {
  headline: null, intro: null, website: null, videoUrl: null,
  highlights: [], aboutSections: [], serviceListings: [],
}
const MAX_SUGGESTIONS = 8

/** The three public-page themes, as swatches. Colours match the public page. */
const THEMES: { key: SiteTheme; name: string; band: string; wash: string }[] = [
  { key: 'CLASSIC', name: 'Classic navy', band: '#0B2038', wash: '#F5F8FC' },
  { key: 'COASTAL', name: 'Coastal teal', band: '#1F6B7D', wash: '#EEF5F7' },
  { key: 'SLATE', name: 'Slate grey', band: '#3F4A56', wash: '#F4F5F7' },
]

let suburbCache: Promise<MasterSuburb[]> | null = null
function loadSuburbs(): Promise<MasterSuburb[]> {
  if (!suburbCache) suburbCache = api<MasterSuburb[]>('/master/suburbs', 'GET').catch(() => [])
  return suburbCache
}

export default function ProviderProfile() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)

  // basic fields
  const [businessName, setBusinessName] = useState('')
  const [abn, setAbn] = useState('')
  const [payoutBsb, setPayoutBsb] = useState('')
  const [payoutAccount, setPayoutAccount] = useState('')
  const [bio, setBio] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [gstRegistered, setGstRegistered] = useState(false)
  // Promotional Mate Points advertised on quotes (UAT Round 4 3.5). Customers
  // can sort search results by this, so it lives on the profile.
  const [promoPoints, setPromoPoints] = useState('')
  const [planId, setPlanId] = useState('')

  // master lists
  const [industries, setIndustries] = useState<MasterIndustry[]>([])
  const [plans, setPlans] = useState<MasterPlan[]>([])
  const [subcatsByIndustry, setSubcatsByIndustry] = useState<Record<string, MasterSubcategory[]>>({})
  const [allSuburbs, setAllSuburbs] = useState<MasterSuburb[]>([])

  // selections
  const [selIndustries, setSelIndustries] = useState<Set<string>>(new Set())
  const [selSubcats, setSelSubcats] = useState<Set<string>>(new Set())
  const [selSuburbs, setSelSuburbs] = useState<Map<string, string>>(new Map()) // id -> name

  // Public mini-site settings (UAT 5.4)
  const [siteTheme, setSiteTheme] = useState<SiteTheme>('CLASSIC')
  const [aboutText, setAboutText] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactHours, setContactHours] = useState('')

  // Premium page content (step P4): text saved with the profile, photos
  // uploaded straight away through MediaBox.
  const [premium, setPremium] = useState<PremiumContent>(EMPTY_PREMIUM)
  const [media, setMedia] = useState<ProfileMedia[]>([])

  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  // Editor-only state: nothing below is saved.
  const [section, setSection] = useState<Section>('business')
  const [industryQuery, setIndustryQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [suburbQuery, setSuburbQuery] = useState('')
  const [lastSuburb, setLastSuburb] = useState<MasterSuburb | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const topRef = useRef<HTMLDivElement>(null)

  /** Puts the form back to what the server holds (load, and Discard). */
  function applyProfile(p: Profile | null) {
    setBusinessName(p?.businessName ?? '')
    setAbn(p?.abn ?? '')
    setPayoutBsb(p?.payoutBsb ?? '')
    setPayoutAccount(p?.payoutAccount ?? '')
    setBio(p?.bio ?? '')
    setServiceArea(p?.serviceArea ?? '')
    setGstRegistered(p?.gstRegistered ?? false)
    setPromoPoints(p?.promoPoints ? String(p.promoPoints) : '')
    setPlanId(p?.subscriptionPlanId ?? '')
    setSelIndustries(new Set((p?.industries ?? []).map((i) => i.id)))
    setSelSubcats(new Set((p?.subcategories ?? []).map((s) => s.id)))
    setSelSuburbs(new Map((p?.suburbs ?? []).map((s) => [s.id, s.name])))
    setSiteTheme(p?.siteTheme ?? 'CLASSIC')
    setAboutText(p?.aboutText ?? '')
    setContactEmail(p?.contactEmail ?? '')
    setContactPhone(p?.contactPhone ?? '')
    setContactHours(p?.contactHours ?? '')
    setPremium(p?.premium ? { ...p.premium } : EMPTY_PREMIUM)
  }

  function loadMedia() {
    api<ProfileMedia[]>('/provider/profile/media', 'GET').then(setMedia).catch(() => setMedia([]))
  }

  // Load master lists + existing profile once.
  useEffect(() => {
    Promise.all([
      api<MasterIndustry[]>('/master/industries', 'GET'),
      api<MasterPlan[]>('/master/plans', 'GET'),
    ]).then(([inds, pls]) => {
      setIndustries(inds)
      setPlans(pls)
    }).catch(() => { /* ignore */ })

    loadSuburbs().then((rows) => setAllSuburbs(rows.filter((s) => s.active)))

    api<Profile>('/provider/profile', 'GET')
      .then((p) => {
        setProfile(p)
        applyProfile(p)
        setSavedSnapshot(snapshotOf(p))
        loadMedia()
      })
      .catch(() => {
        setProfile(null)
        setSavedSnapshot(snapshotOf(null))
      })
  }, [])

  // Load subcategories for any selected industry we don't have yet.
  useEffect(() => {
    selIndustries.forEach((indId) => {
      if (!subcatsByIndustry[indId]) {
        api<MasterSubcategory[]>(`/master/industries/${indId}/subcategories`, 'GET')
          .then((subs) => setSubcatsByIndustry((prev) => ({ ...prev, [indId]: subs })))
          .catch(() => { /* ignore */ })
      }
    })
  }, [selIndustries, subcatsByIndustry])

  function toggleIndustry(id: string) {
    setSelIndustries((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // Drop that industry's subcategories too — otherwise they stay selected
        // and get saved against an industry the provider no longer works in.
        const orphaned = (subcatsByIndustry[id] ?? []).map((s) => s.id)
        if (orphaned.length > 0) {
          setSelSubcats((subs) => {
            const kept = new Set(subs)
            orphaned.forEach((subId) => kept.delete(subId))
            return kept
          })
        }
      } else {
        next.add(id)
      }
      return next
    })
  }
  function toggleSubcat(id: string) {
    setSelSubcats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function setAllSubcats(indId: string, on: boolean) {
    const ids = (subcatsByIndustry[indId] ?? []).map((s) => s.id)
    setSelSubcats((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
      return next
    })
  }
  function addSuburb(s: MasterSuburb) {
    setSelSuburbs((prev) => new Map(prev).set(s.id, s.name))
    setLastSuburb(s)
    setSuburbQuery('')
  }
  function removeSuburb(id: string) {
    setSelSuburbs((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }
  function addCouncil(lga: string, state: string) {
    setSelSuburbs((prev) => {
      const next = new Map(prev)
      allSuburbs.filter((s) => s.lga === lga && s.state === state).forEach((s) => next.set(s.id, s.name))
      return next
    })
  }

  function snapshotOf(p: Profile | null): string {
    return JSON.stringify([
      p?.businessName ?? '', p?.abn ?? '', p?.payoutBsb ?? '', p?.payoutAccount ?? '',
      p?.bio ?? '', p?.serviceArea ?? '', p?.gstRegistered ?? false,
      p?.promoPoints ? String(p.promoPoints) : '', p?.subscriptionPlanId ?? '',
      (p?.industries ?? []).map((i) => i.id).sort(), (p?.subcategories ?? []).map((s) => s.id).sort(),
      (p?.suburbs ?? []).map((s) => s.id).sort(), p?.siteTheme ?? 'CLASSIC', p?.aboutText ?? '',
      p?.contactEmail ?? '', p?.contactPhone ?? '', p?.contactHours ?? '',
      premiumSnapshot(p?.premium ?? EMPTY_PREMIUM),
    ])
  }
  function premiumSnapshot(c: PremiumContent): string {
    return JSON.stringify([
      c.headline ?? '', c.intro ?? '', c.website ?? '', c.videoUrl ?? '',
      c.highlights.map((h) => [h.icon ?? '', h.title, h.subLine ?? '']),
      c.aboutSections.map((a) => [a.title, a.body ?? '']),
      c.serviceListings.map((s) => [s.id ?? '', s.title, s.description ?? '', s.subcategoryId ?? '']),
    ])
  }
  const currentSnapshot = JSON.stringify([
    businessName, abn, payoutBsb.replace(/\D/g, ''), payoutAccount.replace(/\D/g, ''), bio, serviceArea, gstRegistered, promoPoints, planId,
    Array.from(selIndustries).sort(), Array.from(selSubcats).sort(), Array.from(selSuburbs.keys()).sort(),
    siteTheme, aboutText, contactEmail, contactPhone, contactHours,
    premiumSnapshot(premium),
  ])
  const dirty = profile !== undefined && currentSnapshot !== savedSnapshot

  function discard() {
    applyProfile(profile ?? null)
    setError('')
    // Photos were uploaded as they were chosen, so Discard doesn't undo them.
    setOk(isPremium && media.length > 0 ? 'Changes discarded. Photos already uploaded are kept.' : '')
  }

  function fail(message: string, where: Section) {
    setError(message)
    setSection(where)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(''); setOk('')
    if (!businessName || !serviceArea) {
      fail('Please fill in your business name and service area.', businessName ? 'area' : 'business')
      return
    }
    if (selIndustries.size === 0) { fail('Pick at least one industry you work in.', 'services'); return }
    setBusy(true)
    const body = {
      businessName,
      abn: abn || null,
      payoutBsb: payoutBsb.replace(/\D/g, '') || null,
      payoutAccount: payoutAccount.replace(/\D/g, '') || null,
      bio: bio || null,
      serviceArea,
      gstRegistered,
      promoPoints: promoPoints ? Number(promoPoints) : null,
      subscriptionPlanId: planId || null,
      industryIds: Array.from(selIndustries),
      subcategoryIds: Array.from(selSubcats),
      suburbIds: Array.from(selSuburbs.keys()),
      siteTheme,
      aboutText: aboutText || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      contactHours: contactHours || null,
      // Premium page content (step P3). The server applies it only when the plan grants Premium.
      headline: premium.headline || null,
      intro: premium.intro || null,
      website: premium.website || null,
      videoUrl: premium.videoUrl || null,
      highlights: premium.highlights.filter((h) => h.title.trim()).map((h) => ({ icon: h.icon, title: h.title.trim(), subLine: h.subLine || null })),
      aboutSections: premium.aboutSections.filter((a) => a.title.trim()).map((a) => ({ title: a.title.trim(), body: a.body || null })),
      serviceListings: premium.serviceListings.filter((s) => s.title.trim()).map((s) => ({ id: s.id, title: s.title.trim(), description: s.description || null, subcategoryId: s.subcategoryId })),
    }
    try {
      const isNew = profile === null
      const saved = isNew
        ? await api<Profile>('/provider/profile', 'POST', body)
        : await api<Profile>('/provider/profile', 'PUT', body)
      setProfile(saved)
      applyProfile(saved)
      setSavedSnapshot(snapshotOf(saved))
      loadMedia()
      setOk(isNew ? "You're now a provider — you can quote on jobs." : 'Profile updated.')
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (isNew) await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.')
    } finally {
      setBusy(false)
    }
  }

  /* ---------- derived, display only ---------- */

  const suburbById = useMemo(() => new Map(allSuburbs.map((s) => [s.id, s])), [allSuburbs])
  const industryName = (id: string) => industries.find((x) => x.id === id)?.name ?? 'Industry'
  const selIndustryList = Array.from(selIndustries)
  const selSuburbList = Array.from(selSuburbs.entries())

  // Industries by the owner's 13 groups. If the list carries no groups, one
  // flat A–Z list is shown instead (handoff Part M).
  const hasGroups = industries.some((i) => i.group)
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; order: number; items: MasterIndustry[] }>()
    industries.forEach((i) => {
      const name = i.group ?? 'Other'
      const entry = map.get(name) ?? { name, order: i.groupOrder ?? 999, items: [] }
      entry.items.push(i)
      map.set(name, entry)
    })
    return Array.from(map.values()).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  }, [industries])
  const iq = industryQuery.trim().toLowerCase()
  const industryMatches = iq
    ? industries.filter((i) => i.name.toLowerCase().includes(iq) || (i.group ?? '').toLowerCase().includes(iq))
    : []
  const flatIndustries = useMemo(() => [...industries].sort((a, b) => a.name.localeCompare(b.name)), [industries])

  const sq = suburbQuery.trim().toLowerCase()
  const suburbMatches = sq.length === 0 ? [] : (() => {
    const starts: MasterSuburb[] = []
    const contains: MasterSuburb[] = []
    for (const s of allSuburbs) {
      if (selSuburbs.has(s.id)) continue
      const name = s.name.toLowerCase()
      if (name.startsWith(sq)) starts.push(s)
      else if (name.includes(sq) || (s.postcode ?? '').startsWith(sq)) contains.push(s)
      if (starts.length >= MAX_SUGGESTIONS) break
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS)
  })()

  // "All of {council}" for the council of the suburb just added, while there
  // are suburbs in it still to add.
  const councilLeft = lastSuburb?.lga
    ? allSuburbs.filter((s) => s.lga === lastSuburb.lga && s.state === lastSuburb.state && !selSuburbs.has(s.id)).length
    : 0
  const councilSize = lastSuburb?.lga
    ? allSuburbs.filter((s) => s.lga === lastSuburb.lga && s.state === lastSuburb.state).length
    : 0

  // Premium page (step P4)
  const isPremium = profile?.premiumProfile ?? false
  const premiumPlan = plans.find((p) => p.premiumProfile && p.price !== null && p.price !== undefined)
  const logo = media.find((m) => m.kind === 'LOGO') ?? null
  const hero = media.find((m) => m.kind === 'HERO') ?? null
  const gallery = media.filter((m) => m.kind === 'GALLERY')
  const servicePhoto = (id: string | null) => (id ? media.find((m) => m.kind === 'SERVICE' && m.serviceRef === id) ?? null : null)
  const maxPhotos = plans.find((p) => p.id === (profile?.subscriptionPlanId ?? ''))?.maxImages ?? null
  const pickedSubcats = selIndustryList.flatMap((indId) => (subcatsByIndustry[indId] ?? []).filter((s) => selSubcats.has(s.id)))
  const setP = <K extends keyof PremiumContent>(key: K, value: PremiumContent[K]) => setPremium((prev) => ({ ...prev, [key]: value }))
  const setHighlight = (i: number, patch: Partial<PremiumHighlight>) =>
    setP('highlights', premium.highlights.map((h, n) => (n === i ? { ...h, ...patch } : h)))
  const setAbout = (i: number, patch: Partial<PremiumAboutSection>) =>
    setP('aboutSections', premium.aboutSections.map((a, n) => (n === i ? { ...a, ...patch } : a)))
  const setListing = (i: number, patch: Partial<PremiumServiceListing>) =>
    setP('serviceListings', premium.serviceListings.map((s, n) => (n === i ? { ...s, ...patch } : s)))

  const status: Record<Section, ReactNode> = {
    business: businessName.trim() ? <Tick /> : null,
    services: selIndustries.size > 0
      ? <span className="pf-count" title={`${selIndustries.size} industries · ${selSubcats.size} subcategories`}>{selIndustries.size} · {selSubcats.size}</span>
      : null,
    area: selSuburbs.size > 0 ? <span className="pf-count">{selSuburbs.size}</span> : null,
    public: aboutText.trim() || bio.trim() ? <Tick /> : null,
    premium: isPremium
      ? (media.length + premium.highlights.length > 0
        ? <span className="pf-count">{media.length} photo{media.length === 1 ? '' : 's'} · {premium.highlights.length} highlight{premium.highlights.length === 1 ? '' : 's'}</span>
        : null)
      : <span className="pf-premium">Premium</span>,
  }

  const checklist: { label: string; done: boolean }[] = [
    { label: 'Business name, ABN', done: Boolean(businessName.trim() && abn.trim()) },
    { label: 'Industries & services', done: selIndustries.size > 0 && selSubcats.size > 0 },
    { label: 'Service area', done: selSuburbs.size > 0 && Boolean(serviceArea.trim()) },
    { label: 'About Us text', done: Boolean(aboutText.trim()) },
    { label: 'Opening hours', done: Boolean(contactHours.trim()) },
    ...(isPremium ? [{ label: 'Premium page: logo, hero and a highlight', done: Boolean(logo && hero && premium.highlights.length > 0) }] : []),
  ]

  const previewBand = THEMES.find((t) => t.key === siteTheme)?.band ?? '#0B2038'
  const previewIndustries = selIndustryList.slice(0, 2).map(industryName).join(', ')
  const firstSuburb = selSuburbList[0]?.[1]
  const previewLine = [
    previewIndustries,
    firstSuburb ? `${firstSuburb}${selSuburbs.size > 1 ? ` +${selSuburbs.size - 1} suburb${selSuburbs.size === 2 ? '' : 's'}` : ''}` : '',
  ].filter(Boolean).join(' · ')

  if (profile === undefined) return <div className="loading">Loading…</div>
  const isNew = profile === null
  const sectionLabel = SECTIONS.find((s) => s.key === section)?.label ?? ''

  return (
    <form className="mt pr pf" onSubmit={onSubmit} noValidate>
      <div ref={topRef} className="mt-head">
        <div className="mt-head-copy">
          <div>
            <h2 className="mt-title">{isNew ? 'Become a provider' : 'Your provider profile'}</h2>
            <p className="mt-sub">
              {isNew
                ? 'Set up your provider profile to start quoting on jobs.'
                : 'What customers see, and where and what you work on.'}
            </p>
          </div>
        </div>
        {profile && (
          <button type="button" className="mt-btn-ghost pf-preview-btn" onClick={() => navigate(`/providers/${profile.userId}`)}>
            <EyeIcon /> Preview public page
          </button>
        )}
      </div>

      {error && <div className="jr-msg is-err" role="alert">{error}</div>}
      {ok && <div className="jr-msg is-ok" role="status">{ok}</div>}

      <div className="pf-layout">
        <nav className="pf-menu" aria-label="Profile sections">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`pf-menu-item${section === s.key ? ' is-on' : ''}`}
              aria-current={section === s.key ? 'true' : undefined}
              onClick={() => setSection(s.key)}
            >
              <span>{s.label}</span>
              {status[s.key]}
            </button>
          ))}
        </nav>

        <div className="pf-panel">
          {section === 'business' && (
            <section className="pf-section">
              <h3 className="pf-h">Business details</h3>
              <label className="mt-field">
                <span>Business name</span>
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Rivertown Plumbing" />
              </label>
              <div className="pr-two pf-two">
                <label className="mt-field">
                  <span>ABN</span>
                  <input value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="Australian Business Number" />
                </label>
                <label className="mt-field">
                  <span>Subscription plan</span>
                  <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                    <option value="">Default</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{planLabel(p)}</option>)}
                  </select>
                </label>
              </div>
              <label className="pf-check">
                <input type="checkbox" checked={gstRegistered} onChange={(e) => setGstRegistered(e.target.checked)} />
                <span>My business is registered for GST</span>
              </label>
              <div className="pr-two pf-two">
                <label className="mt-field">
                  <span>Payout BSB</span>
                  <input value={payoutBsb} inputMode="numeric" maxLength={7} onChange={(e) => setPayoutBsb(e.target.value)} placeholder="e.g. 063-000" />
                </label>
                <label className="mt-field">
                  <span>Payout account number</span>
                  <input value={payoutAccount} inputMode="numeric" maxLength={12} onChange={(e) => setPayoutAccount(e.target.value)} placeholder="Where your payouts go" />
                </label>
              </div>
              <p className="pf-hint">Payout receipts show only the last 4 digits of the account.</p>
              <label className="mt-field" htmlFor="promo-points">
                <span>Promotional Mate Points offered (optional)</span>
                <input
                  id="promo-points"
                  type="number"
                  min="0"
                  step="0.01"
                  value={promoPoints}
                  onChange={(e) => setPromoPoints(e.target.value)}
                  placeholder="e.g. 20"
                />
              </label>
              <p className="pr-hint">
                Mate Points you advertise on your quotes. Customers can sort search results by this, so a
                higher offer lifts you up that list. Leave blank if you don't offer any.
              </p>
            </section>
          )}

          {section === 'services' && (
            <section className="pf-section">
              <h3 className="pf-h">Services</h3>
              <p className="pf-lead">The industries you work in, and the services within each. Your Services page is built from these.</p>

              <label className="mt-field">
                <span>Find an industry</span>
                <span className="mt-input">
                  <SearchIcon />
                  <input type="search" value={industryQuery} onChange={(e) => setIndustryQuery(e.target.value)} placeholder="e.g. Plumbing" />
                </span>
              </label>

              {selIndustryList.length > 0 && (
                <div className="pf-chips" aria-label="Your industries">
                  {selIndustryList.map((id) => (
                    <span className="pf-chip is-on" key={id}>
                      {industryName(id)}
                      <button type="button" aria-label={`Remove ${industryName(id)}`} onClick={() => toggleIndustry(id)}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {iq ? (
                <div className="pf-pick">
                  {industryMatches.length === 0 && <p className="pr-hint">No industry matches “{industryQuery}”.</p>}
                  {industryMatches.map((i) => (
                    <button key={i.id} type="button" className={`pf-tick${selIndustries.has(i.id) ? ' is-on' : ''}`}
                      aria-pressed={selIndustries.has(i.id)} onClick={() => toggleIndustry(i.id)}>
                      {i.name}{i.group && <span className="pf-tick-sub">{i.group}</span>}
                    </button>
                  ))}
                </div>
              ) : hasGroups ? (
                <div className="pf-groups">
                  {grouped.map((g) => {
                    const open = openGroups.has(g.name)
                    const picked = g.items.filter((i) => selIndustries.has(i.id)).length
                    return (
                      <div className={`pf-group${open ? ' is-open' : ''}`} key={g.name}>
                        <button type="button" className="pf-group-head" aria-expanded={open}
                          onClick={() => setOpenGroups((prev) => {
                            const next = new Set(prev)
                            if (next.has(g.name)) next.delete(g.name); else next.add(g.name)
                            return next
                          })}>
                          <span className="pf-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
                          <span className="pf-group-name">{g.name}</span>
                          <span className="pf-group-count">{picked > 0 ? `${picked} picked · ` : ''}{g.items.length}</span>
                        </button>
                        {open && (
                          <div className="pf-pick">
                            {g.items.map((i) => (
                              <button key={i.id} type="button" className={`pf-tick${selIndustries.has(i.id) ? ' is-on' : ''}`}
                                aria-pressed={selIndustries.has(i.id)} onClick={() => toggleIndustry(i.id)}>
                                {i.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="pf-pick">
                  {flatIndustries.map((i) => (
                    <button key={i.id} type="button" className={`pf-tick${selIndustries.has(i.id) ? ' is-on' : ''}`}
                      aria-pressed={selIndustries.has(i.id)} onClick={() => toggleIndustry(i.id)}>
                      {i.name}
                    </button>
                  ))}
                </div>
              )}

              {selIndustryList.length > 0 && (
                <div className="pf-subs">
                  {selIndustryList.map((indId) => {
                    const subs = subcatsByIndustry[indId] ?? []
                    return (
                      <div className="pf-sub-card" key={indId}>
                        <div className="pf-sub-head">
                          <strong>{industryName(indId)}</strong>
                          {subs.length > 0 && (
                            <span className="pf-sub-all">
                              <button type="button" className="pr-link" onClick={() => setAllSubcats(indId, true)}>Select all</button>
                              <span aria-hidden="true">/</span>
                              <button type="button" className="pr-link" onClick={() => setAllSubcats(indId, false)}>none</button>
                            </span>
                          )}
                        </div>
                        {subs.length === 0
                          ? <p className="pr-hint">No subcategories listed for this industry.</p>
                          : (
                            <div className="pf-pick">
                              {subs.map((s) => (
                                <button key={s.id} type="button" className={`pf-tick is-sm${selSubcats.has(s.id) ? ' is-on' : ''}`}
                                  aria-pressed={selSubcats.has(s.id)} onClick={() => toggleSubcat(s.id)}>
                                  {selSubcats.has(s.id) && <span aria-hidden="true">✓ </span>}{s.name}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="pf-summary">
                {selSubcats.size} subcategor{selSubcats.size === 1 ? 'y' : 'ies'} across{' '}
                {selIndustries.size} industr{selIndustries.size === 1 ? 'y' : 'ies'}
                {selSuburbs.size > 0 && ` · ${selSuburbs.size} suburb${selSuburbs.size === 1 ? '' : 's'}`}
              </p>
            </section>
          )}

          {section === 'area' && (
            <section className="pf-section">
              <h3 className="pf-h">Service area</h3>
              <p className="pf-lead">You'll only get requests from customers in the suburbs you pick. Customers just see the suburb names.</p>

              <div className="mt-field">
                <span>Add suburbs</span>
                <div className="typeahead pf-typeahead">
                  <input
                    value={suburbQuery}
                    autoComplete="off"
                    placeholder="Type a suburb or postcode"
                    aria-label="Add suburbs"
                    onChange={(e) => setSuburbQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (suburbMatches[0]) addSuburb(suburbMatches[0])
                      } else if (e.key === 'Escape') setSuburbQuery('')
                    }}
                  />
                  {suburbMatches.length > 0 && (
                    <ul className="typeahead-list" role="listbox">
                      {suburbMatches.map((s) => (
                        <li key={s.id} role="option" aria-selected="false" className="typeahead-item"
                          onMouseDown={(e) => { e.preventDefault(); addSuburb(s) }}>
                          <span className="typeahead-name">{s.name}</span>
                          <span className="typeahead-sub">{s.state}{s.postcode ? ` ${s.postcode}` : ''}{s.lga ? ` · ${s.lga}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {lastSuburb?.lga && councilLeft > 0 && (
                <button type="button" className="pf-quick" onClick={() => addCouncil(lastSuburb.lga as string, lastSuburb.state)}>
                  + All of {lastSuburb.lga} council ({councilSize})
                </button>
              )}

              <div className="pf-chips-head">
                <span>Your suburbs · {selSuburbs.size}</span>
                {selSuburbs.size > 0 && <button type="button" className="pr-link" onClick={() => setSelSuburbs(new Map())}>Clear all</button>}
              </div>
              {selSuburbs.size === 0
                ? <p className="pr-hint">No suburbs yet. Start typing above to add them.</p>
                : (
                  <div className="pf-chips">
                    {selSuburbList.map(([id, name]) => {
                      const st = suburbById.get(id)?.state
                      return (
                        <span className="pf-chip" key={id}>
                          {name}{st ? `, ${st}` : ''}
                          <button type="button" aria-label={`Remove ${name}`} onClick={() => removeSuburb(id)}>×</button>
                        </span>
                      )
                    })}
                  </div>
                )}

              <label className="mt-field">
                <span>Area description (shown on your page)</span>
                <input value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="e.g. Inner Melbourne" />
              </label>
            </section>
          )}

          {section === 'public' && (
            <section className="pf-section">
              <h3 className="pf-h">Public page</h3>
              <p className="pf-lead">
                Customers see this as a small site with Home, About Us, Services and Contact Us pages.
                Your Services page is built from the industries and subcategories you picked.
              </p>

              <div className="mt-field">
                <span>Theme</span>
                <div className="pf-themes" role="radiogroup" aria-label="Theme">
                  {THEMES.map((t) => (
                    <button key={t.key} type="button" role="radio" aria-checked={siteTheme === t.key}
                      className={`pf-theme${siteTheme === t.key ? ' is-on' : ''}`} title={THEME_LABELS[t.key]}
                      onClick={() => setSiteTheme(t.key)}>
                      <span className="pf-theme-mini" style={{ background: t.wash }}>
                        <span className="pf-theme-band" style={{ background: t.band }}>
                          <span className="pf-theme-dot" />
                          <span className="pf-theme-line" />
                        </span>
                        <span className="pf-theme-rows"><span /><span /><span /></span>
                      </span>
                      <span className="pf-theme-name">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="mt-field">
                <span>Short description <em className="pf-n">{bio.length} / {BIO_MAX}</em></span>
                <textarea rows={2} maxLength={BIO_MAX} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="One line customers see in search results…" />
              </label>
              <label className="mt-field">
                <span>About us <em className="pf-n">{aboutText.length} / {ABOUT_MAX}</em></span>
                <textarea rows={6} maxLength={ABOUT_MAX} value={aboutText} onChange={(e) => setAboutText(e.target.value)}
                  placeholder="Your story, experience, what you specialise in. Blank lines start a new paragraph." />
              </label>
              <div className="pr-two pf-two">
                <label className="mt-field">
                  <span>Contact phone (optional)</span>
                  <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. 03 9000 0000" />
                </label>
                <label className="mt-field">
                  <span>Contact email (optional)</span>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="e.g. hello@yourbusiness.com.au" />
                </label>
              </div>
              <label className="mt-field">
                <span>Opening hours (optional)</span>
                <input value={contactHours} onChange={(e) => setContactHours(e.target.value)} placeholder="e.g. Mon–Fri 7am–5pm, Sat by appointment" />
              </label>
            </section>
          )}

          {section === 'premium' && !isPremium && (
            <section className="pf-section">
              <h3 className="pf-h">Photos &amp; highlights <span className="pf-premium">Premium</span></h3>
              <p className="pf-lead">
                Premium adds pictures and highlights to your public page.
                {premiumPlan
                  ? <> It's part of the <strong>{planLabel(premiumPlan)}</strong> plan — pick it under Business details.</>
                  : <> It's part of the Premium plan, which isn't available yet.</>}
              </p>
              <div className="pf-locked" aria-disabled="true">
                {[
                  ['Logo', 'Your square logo in place of your initials.'],
                  ['Hero photo', 'A large photo at the top of your page, with a headline.'],
                  ['Service photos', 'A card for each service, with a photo and a short description.'],
                  ['Gallery', 'Photos of your work on your About Us page.'],
                  ['Highlights', 'Up to four, e.g. “11+ years in business”.'],
                ].map(([title, sub]) => (
                  <div className="pf-locked-item" key={title}>
                    <span className="pf-locked-ico" aria-hidden="true"><LockIcon /></span>
                    <span><strong>{title}</strong><span className="pr-hint">{sub}</span></span>
                  </div>
                ))}
                <span className="pf-soon">{premiumPlan ? 'Premium plan' : 'Coming soon'}</span>
              </div>
            </section>
          )}

          {section === 'premium' && isPremium && (
            <section className="pf-section pf-prem">
              <h3 className="pf-h">Photos &amp; highlights <span className="pf-premium">Premium</span></h3>
              <p className="pf-lead">Photos upload as soon as you choose them. Text here is saved with the rest of your profile.</p>

              {/* 1. Logo and hero */}
              <div className="pf-prem-row">
                <MediaBox kind="LOGO" item={logo} shape="square" label="LOGO" onChange={loadMedia} />
                <MediaBox kind="HERO" item={hero} shape="wide" label="HERO PHOTO" onChange={loadMedia} />
              </div>
              <label className="mt-field">
                <span>HEADLINE <em className="pf-n">{(premium.headline ?? '').length} / {HEADLINE_MAX}</em></span>
                <input maxLength={HEADLINE_MAX} value={premium.headline ?? ''} onChange={(e) => setP('headline', e.target.value)}
                  placeholder="e.g. Pakenham's plumbers since 2012" />
              </label>
              <label className="mt-field">
                <span>INTRO <em className="pf-n">{(premium.intro ?? '').length} / {INTRO_MAX}</em></span>
                <textarea rows={3} maxLength={INTRO_MAX} value={premium.intro ?? ''} onChange={(e) => setP('intro', e.target.value)}
                  placeholder="A short paragraph under the headline." />
              </label>

              {/* 2. Highlights */}
              <div className="pf-prem-head">
                <h4>Highlights <span className="pr-hint">up to {MAX_HIGHLIGHTS}</span></h4>
                {premium.highlights.length < MAX_HIGHLIGHTS && (
                  <button type="button" className="pr-link is-add" onClick={() => setP('highlights', [...premium.highlights, { icon: 'YEARS', title: '', subLine: null }])}>+ Add highlight</button>
                )}
              </div>
              {premium.highlights.length > 0 && (
                <div className="pf-hl-strip" aria-label="Highlights preview">
                  {premium.highlights.map((h, i) => (
                    <span className="pf-hl" key={i}>
                      <HighlightGlyph icon={h.icon} />
                      <span><strong>{h.title || 'Title'}</strong>{h.subLine && <small>{h.subLine}</small>}</span>
                    </span>
                  ))}
                </div>
              )}
              {premium.highlights.map((h, i) => (
                <div className="pf-prem-line" key={i}>
                  <select value={h.icon ?? ''} onChange={(e) => setHighlight(i, { icon: (e.target.value || null) as HighlightIcon | null })} aria-label="Icon">
                    {HIGHLIGHT_ICONS.map((ic) => <option key={ic} value={ic}>{HIGHLIGHT_ICON_LABELS[ic]}</option>)}
                  </select>
                  <input maxLength={60} value={h.title} placeholder="Title, e.g. 11+ years in business" aria-label="Highlight title"
                    onChange={(e) => setHighlight(i, { title: e.target.value })} />
                  <input maxLength={120} value={h.subLine ?? ''} placeholder="Sub-line (optional)" aria-label="Highlight sub-line"
                    onChange={(e) => setHighlight(i, { subLine: e.target.value })} />
                  <button type="button" className="pr-x" aria-label="Remove highlight"
                    onClick={() => setP('highlights', premium.highlights.filter((_, n) => n !== i))}>×</button>
                </div>
              ))}

              {/* 3. Service listings */}
              <div className="pf-prem-head">
                <h4>Our services <span className="pr-hint">a card each on your Services page</span></h4>
                <button type="button" className="pr-link is-add"
                  onClick={() => setP('serviceListings', [...premium.serviceListings, { id: null, title: '', description: null, subcategoryId: null }])}>+ Add service</button>
              </div>
              {premium.serviceListings.map((sl, i) => (
                <div className="pf-svc" key={sl.id ?? `new-${i}`}>
                  <MediaBox kind="SERVICE" item={servicePhoto(sl.id)} serviceRef={sl.id} shape="tile" onChange={loadMedia}
                    disabledNote={sl.id ? undefined : 'Save changes first, then add a photo'} />
                  <div className="pf-svc-fields">
                    <input maxLength={80} value={sl.title} placeholder="Service name, e.g. Hot water systems" aria-label="Service name"
                      onChange={(e) => setListing(i, { title: e.target.value })} />
                    <textarea rows={2} maxLength={600} value={sl.description ?? ''} placeholder="A sentence or two about this service" aria-label="Service description"
                      onChange={(e) => setListing(i, { description: e.target.value })} />
                    <div className="pf-svc-foot">
                      <select value={sl.subcategoryId ?? ''} onChange={(e) => setListing(i, { subcategoryId: e.target.value || null })} aria-label="Linked service">
                        <option value="">Link to a service (optional)</option>
                        {pickedSubcats.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                        {/* A link to a service no longer picked under Services stays visible, so it can be changed. */}
                        {sl.subcategoryId && !pickedSubcats.some((sc) => sc.id === sl.subcategoryId) && (
                          <option value={sl.subcategoryId}>{sl.subcategoryName ?? 'Linked service'} (not under Services any more)</option>
                        )}
                      </select>
                      <button type="button" className="pr-link" onClick={() => setP('serviceListings', premium.serviceListings.filter((_, n) => n !== i))}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
              {premium.serviceListings.length === 0 && <p className="pr-hint">No services listed yet. Customers can start a quote request from a listed service.</p>}

              {/* 4. Gallery */}
              <div className="pf-prem-head">
                <h4>Gallery <span className="pr-hint">{gallery.length}{maxPhotos !== null ? ` of ${maxPhotos}` : ''} photo{gallery.length === 1 ? '' : 's'}</span></h4>
              </div>
              <div className="pf-gallery">
                {gallery.map((g) => <MediaBox key={g.id} kind="GALLERY" item={g} shape="tile" onChange={loadMedia} />)}
                {(maxPhotos === null || gallery.length < maxPhotos) && <MediaBox kind="GALLERY" item={null} shape="tile" onChange={loadMedia} />}
              </div>

              {/* 5. About sub-sections */}
              <div className="pf-prem-head">
                <h4>About Us sections <span className="pr-hint">up to {MAX_ABOUT_SECTIONS}, e.g. Our History, Our Team</span></h4>
                {premium.aboutSections.length < MAX_ABOUT_SECTIONS && (
                  <button type="button" className="pr-link is-add" onClick={() => setP('aboutSections', [...premium.aboutSections, { title: '', body: null }])}>+ Add section</button>
                )}
              </div>
              {premium.aboutSections.map((a, i) => (
                <div className="pf-about" key={i}>
                  <div className="pf-about-head">
                    <input maxLength={80} value={a.title} placeholder="Section title" aria-label="Section title"
                      onChange={(e) => setAbout(i, { title: e.target.value })} />
                    <button type="button" className="pr-x" aria-label="Remove section"
                      onClick={() => setP('aboutSections', premium.aboutSections.filter((_, n) => n !== i))}>×</button>
                  </div>
                  <textarea rows={4} maxLength={ABOUT_MAX} value={a.body ?? ''} placeholder="Blank lines start a new paragraph." aria-label="Section text"
                    onChange={(e) => setAbout(i, { body: e.target.value })} />
                </div>
              ))}

              {/* 6. Links */}
              <div className="pr-two pf-two">
                <label className="mt-field">
                  <span>Website (optional)</span>
                  <input maxLength={200} value={premium.website ?? ''} onChange={(e) => setP('website', e.target.value)} placeholder="https://" />
                </label>
                <label className="mt-field">
                  <span>Video link (optional)</span>
                  <input maxLength={300} value={premium.videoUrl ?? ''} onChange={(e) => setP('videoUrl', e.target.value)} placeholder="A YouTube or Vimeo link" />
                </label>
              </div>
            </section>
          )}
        </div>

        <aside className="pf-side" aria-label="Preview">
          <div className="pf-mini">
            <div className="pf-mini-band" style={{ background: previewBand }}>
              <strong>{businessName.trim() || 'Your business name'}</strong>
              <span>{previewLine || 'Your industries · your suburbs'}</span>
            </div>
            <div className="pf-mini-body">
              <p className="pr-hint">Live preview of your public page header and chips.</p>
              {selSuburbs.size > 0 && (
                <div className="pf-chips is-mini">
                  {selSuburbList.slice(0, 2).map(([id, name]) => <span className="pf-chip" key={id}>{name}</span>)}
                  {selSuburbs.size > 2 && <span className="pf-chip">+{selSuburbs.size - 2}</span>}
                </div>
              )}
            </div>
            <div className="pf-check-list">
              <strong>Profile checklist</strong>
              <ul>
                {checklist.map((c) => (
                  <li key={c.label} className={c.done ? 'is-done' : ''}>
                    <span aria-hidden="true">{c.done ? '✓' : '!'}</span> {c.label}
                    <span className="mc-sr">{c.done ? ' — done' : ' — to do'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <div className="pf-bar">
        <span className="pf-bar-text">
          {dirty ? `Unsaved changes${isNew ? '' : ` in ${sectionLabel}`}` : isNew ? 'Fill in each section, then create your profile.' : 'All changes saved'}
        </span>
        <div className="pf-bar-actions">
          <button type="button" className="mt-btn-ghost" onClick={discard} disabled={!dirty || busy}>Discard</button>
          <button type="submit" className="mt-continue" disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Create provider profile' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  )
}

/** "Premium — $29.00 / month" when the plan is priced; otherwise just its name. */
function planLabel(p: MasterPlan): string {
  if (p.price === null || p.price === undefined) return p.name
  const period = p.billingPeriod === 'YEARLY' ? 'year' : p.billingPeriod === 'MONTHLY' ? 'month' : null
  return `${p.name} — $${p.price.toFixed(2)}${period ? ` / ${period}` : ''}`
}

/** The small icon in front of a highlight. */
export function HighlightGlyph({ icon }: { icon: HighlightIcon | null }) {
  const d: Record<HighlightIcon, string> = {
    YEARS: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v5l3 2',
    LICENSED: 'M5 3h14v18l-7-4-7 4z M9 9h6',
    INSURED: 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z M9 12l2 2 4-4',
    FAST_REPLY: 'M13 2L4 14h7l-1 8 9-12h-7z',
    LOCAL: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z M12 9m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
    GUARANTEE: 'M12 2l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 16.3 6.5 19.2l1-6.2L3 8.6l6.2-.9z',
    AWARD: 'M8 21l4-3 4 3v-7H8z M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
    TEAM: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2 21c0-4 3-7 7-7s7 3 7 7 M16 14c3 0 6 2.5 6 6',
  }
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d[icon ?? 'YEARS']} /></svg>
  )
}

/* ---------- icons (decorative) ---------- */

const Tick = () => <span className="pf-tickmark" aria-label="complete">✓</span>

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6E86"
      strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" /></svg>
  )
}
function EyeIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
