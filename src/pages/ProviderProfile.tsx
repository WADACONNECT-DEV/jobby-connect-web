import { FormEvent, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { THEME_LABELS, type SiteTheme } from '../types'
import { useAuth } from '../auth'
import {
  type MasterIndustry,
  type MasterPlan,
  type MasterSubcategory,
  type MasterSuburb,
  type ProviderProfile as Profile,
} from '../types'
import { SearchIcon } from '../components/PageParts'
import { ToolboxIcon } from '../components/AccountParts'
import {
  CharCount, ChipX, PremiumLocked, ProfileChecklist, ProfilePreview, SectionCard, SectionMenu, SuburbAdd, ThemeSwatch,
  type SectionItem,
} from '../components/ProfileParts'

const STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']

// Validation messages from onSubmit. Used only to show the right section when one appears.
const MSG_NAME_AREA = 'Please fill in your business name and service area.'
const MSG_INDUSTRY = 'Pick at least one industry you work in.'

// Placeholder: the owner will supply the real address for new-service requests.
const ADMIN_EMAIL = '[ADMIN EMAIL]'

const SECTION_NAMES: Record<number, string> = {
  1: 'Business details',
  2: 'Services',
  3: 'Service area',
  4: 'Public page',
  5: 'Photos & highlights',
}

const THEME_NOTES: Record<SiteTheme, string> = {
  CLASSIC: 'Navy & amber',
  COASTAL: 'Teal',
  SLATE: 'Muted grey',
}

/** Every form value, in one plain object, so the form can be compared and reset. */
interface Fields {
  businessName: string
  abn: string
  bio: string
  serviceArea: string
  gstRegistered: boolean
  promoPoints: string
  planId: string
  selIndustries: string[]
  selSubcats: string[]
  selSuburbs: [string, string][]
  siteTheme: SiteTheme
  aboutText: string
  contactEmail: string
  contactPhone: string
  contactHours: string
}

/** The loaded profile as form values. Same mapping the page has always used on load. */
function fieldsFrom(p: Profile | null): Fields {
  if (!p) {
    return {
      businessName: '', abn: '', bio: '', serviceArea: '', gstRegistered: false, promoPoints: '', planId: '',
      selIndustries: [], selSubcats: [], selSuburbs: [], siteTheme: 'CLASSIC',
      aboutText: '', contactEmail: '', contactPhone: '', contactHours: '',
    }
  }
  return {
    businessName: p.businessName,
    abn: p.abn ?? '',
    bio: p.bio ?? '',
    serviceArea: p.serviceArea,
    gstRegistered: p.gstRegistered,
    promoPoints: p.promoPoints ? String(p.promoPoints) : '',
    planId: p.subscriptionPlanId ?? '',
    selIndustries: p.industries.map((i) => i.id),
    selSubcats: p.subcategories.map((s) => s.id),
    selSuburbs: p.suburbs.map((s) => [s.id, s.name] as [string, string]),
    siteTheme: p.siteTheme ?? 'CLASSIC',
    aboutText: p.aboutText ?? '',
    contactEmail: p.contactEmail ?? '',
    contactPhone: p.contactPhone ?? '',
    contactHours: p.contactHours ?? '',
  }
}

/** Which section each field lives in, for "Unsaved changes in …". */
const FIELD_SECTION: Record<keyof Fields, number> = {
  businessName: 1, abn: 1, planId: 1, gstRegistered: 1, promoPoints: 1,
  selIndustries: 2, selSubcats: 2,
  selSuburbs: 3, serviceArea: 3,
  siteTheme: 4, bio: 4, aboutText: 4, contactPhone: 4, contactEmail: 4, contactHours: 4,
}

function sameValue(a: Fields[keyof Fields], b: Fields[keyof Fields]): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    const key = (v: unknown) => (Array.isArray(v) ? String(v[0]) : String(v))
    const sa = a.map(key).sort()
    const sb = b.map(key).sort()
    return sa.length === sb.length && sa.every((v, i) => v === sb[i])
  }
  return a === b
}

export default function ProviderProfile() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)

  // basic fields
  const [businessName, setBusinessName] = useState('')
  const [abn, setAbn] = useState('')
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
  const [suburbState, setSuburbState] = useState('VIC')
  const [suburbOptions, setSuburbOptions] = useState<MasterSuburb[]>([])

  // selections
  const [selIndustries, setSelIndustries] = useState<Set<string>>(new Set())
  const [selSubcats, setSelSubcats] = useState<Set<string>>(new Set())

  // Public mini-site settings (UAT 5.4)
  const [siteTheme, setSiteTheme] = useState<SiteTheme>('CLASSIC')
  const [aboutText, setAboutText] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactHours, setContactHours] = useState('')
  const [selSuburbs, setSelSuburbs] = useState<Map<string, string>>(new Map()) // id -> label

  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  // Display only: which section is on screen, the industry search text, and the
  // values the form was last loaded or saved with (for "Unsaved changes" / Discard).
  const [section, setSection] = useState(1)
  const [industryQuery, setIndustryQuery] = useState('')
  const [askOpen, setAskOpen] = useState(false)
  const [baseline, setBaseline] = useState<Fields>(() => fieldsFrom(null))
  const topRef = useRef<HTMLDivElement>(null)

  function fillFrom(f: Fields) {
    setBusinessName(f.businessName)
    setAbn(f.abn)
    setBio(f.bio)
    setServiceArea(f.serviceArea)
    setGstRegistered(f.gstRegistered)
    setPromoPoints(f.promoPoints)
    setPlanId(f.planId)
    setSelIndustries(new Set(f.selIndustries))
    setSelSubcats(new Set(f.selSubcats))
    setSelSuburbs(new Map(f.selSuburbs))
    setSiteTheme(f.siteTheme)
    setAboutText(f.aboutText)
    setContactEmail(f.contactEmail)
    setContactPhone(f.contactPhone)
    setContactHours(f.contactHours)
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

    api<Profile>('/provider/profile', 'GET')
      .then((p) => {
        setProfile(p)
        const f = fieldsFrom(p)
        fillFrom(f)
        setBaseline(f)
      })
      .catch(() => setProfile(null))
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

  // Load suburbs when the state filter changes.
  useEffect(() => {
    api<MasterSuburb[]>(`/master/suburbs?state=${suburbState}`, 'GET')
      .then(setSuburbOptions)
      .catch(() => setSuburbOptions([]))
  }, [suburbState])

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
  function toggleSuburb(s: MasterSuburb) {
    setSelSuburbs((prev) => {
      const next = new Map(prev)
      if (next.has(s.id)) next.delete(s.id)
      else next.set(s.id, s.name)
      return next
    })
  }

  // ---- display values computed from the form ----
  const current: Fields = {
    businessName, abn, bio, serviceArea, gstRegistered, promoPoints, planId,
    selIndustries: Array.from(selIndustries),
    selSubcats: Array.from(selSubcats),
    selSuburbs: Array.from(selSuburbs.entries()),
    siteTheme, aboutText, contactEmail, contactPhone, contactHours,
  }
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(''); setOk('')
    if (!businessName || !serviceArea) { setError('Please fill in your business name and service area.'); return }
    if (selIndustries.size === 0) { setError('Pick at least one industry you work in.'); return }
    setBusy(true)
    const body = {
      businessName,
      abn: abn || null,
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
    }
    try {
      const isNew = profile === null
      const saved = isNew
        ? await api<Profile>('/provider/profile', 'POST', body)
        : await api<Profile>('/provider/profile', 'PUT', body)
      setProfile(saved)
      setBaseline(current) // display only: the form now matches what was saved
      setOk(isNew ? "You're now a provider — you can quote on jobs." : 'Profile updated.')
      if (isNew) await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.')
    } finally {
      setBusy(false)
    }
  }

  // A required-field message shows the section that field is in.
  useEffect(() => {
    if (error === MSG_NAME_AREA) setSection(!businessName ? 1 : 3)
    else if (error === MSG_INDUSTRY) setSection(2)
    if (error || ok) topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, ok])

  const changedSections = Array.from(new Set(
    (Object.keys(FIELD_SECTION) as (keyof Fields)[])
      .filter((k) => !sameValue(current[k], baseline[k]))
      .map((k) => FIELD_SECTION[k]),
  )).sort()
  const dirty = changedSections.length > 0

  // The browser's own checks (email format, Mate Points not below 0) can flag a
  // field in a hidden section. Show that section so the browser can point at it.
  function showInvalidField(e: React.FormEvent<HTMLFormElement>) {
    const box = (e.target as HTMLElement).closest('[data-section]')
    const n = Number(box?.getAttribute('data-section'))
    if (n && n !== section) flushSync(() => setSection(n))
  }

  function discard() {
    fillFrom(baseline)
    setError(''); setOk('')
  }

  if (profile === undefined) return <div className="loading">Loading…</div>
  const isNew = profile === null

  const industryName = (id: string) => industries.find((x) => x.id === id)?.name ?? 'Industry'
  const selIndustryIds = Array.from(selIndustries)
  // Saved suburbs come back labelled "Name, STATE"; ones picked here carry just the
  // name, so add the state on screen to match. Display only; the saved ids are unchanged.
  const suburbLabel = (id: string, name: string) => {
    if (name.includes(',')) return name
    const opt = suburbOptions.find((s) => s.id === id)
    return opt ? `${name}, ${opt.state}` : name
  }
  const suburbNames = Array.from(selSuburbs.entries()).map(([id, name]) => suburbLabel(id, name))
  const q = industryQuery.trim().toLowerCase()
  const industryList = [...industries]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((i) => !q || i.name.toLowerCase().includes(q))

  const menu: SectionItem[] = [
    { key: 1, label: 'Business details', status: businessName.trim() ? 'check' : undefined },
    { key: 2, label: 'Services', status: selIndustries.size > 0 ? `${selSubcats.size} · ${selIndustries.size}` : undefined },
    { key: 3, label: 'Service area', status: selSuburbs.size > 0 ? String(selSuburbs.size) : undefined },
    { key: 4, label: 'Public page', status: aboutText.trim() ? 'check' : undefined },
    { key: 5, label: 'Photos & highlights', status: 'premium' },
  ]

  // Selected industries that have services to tick but none ticked yet. A reminder
  // only: saving is not blocked. Industries with no subcategories are skipped.
  const untickedIndustries = selIndustryIds.filter((id) => {
    const subs = subcatsByIndustry[id] ?? []
    return subs.length > 0 && !subs.some((s) => selSubcats.has(s.id))
  })

  const checklist = [
    { label: 'Business name, ABN', done: Boolean(businessName.trim() && abn.trim()) },
    { label: 'Industries & services', done: selIndustries.size > 0 && selSubcats.size > 0 },
    { label: 'Services ticked for every industry', done: selIndustries.size > 0 && untickedIndustries.length === 0 },
    { label: 'Service area', done: selSuburbs.size > 0 && Boolean(serviceArea.trim()) },
    { label: 'About Us text', done: Boolean(aboutText.trim()) },
    { label: 'Opening hours', done: Boolean(contactHours.trim()) },
  ]

  const summary = (
    <p className="pf-summary">
      {selSubcats.size} subcategor{selSubcats.size === 1 ? 'y' : 'ies'} across{' '}
      {selIndustries.size} industr{selIndustries.size === 1 ? 'y' : 'ies'}
      {selSuburbs.size > 0 && ` · ${selSuburbs.size} suburb${selSuburbs.size === 1 ? '' : 's'}`}
    </p>
  )

  return (
    <form className="pg pf" onSubmit={onSubmit} onInvalidCapture={showInvalidField}>
      <div ref={topRef} className="pf-top">
        <div className="pg-head">
          <span className="pg-head-ico"><ToolboxIcon /></span>
          <div className="pg-head-txt">
            <h2>{isNew ? 'Become a provider' : 'Your provider profile'}</h2>
            <p>{isNew ? 'Set up your provider profile to start quoting on jobs.' : 'What customers see, and where and what you work on.'}</p>
          </div>
          {profile && (
            <div className="pg-head-action">
              <button type="button" className="pg-btn pg-btn-ghost" onClick={() => navigate(`/providers/${profile.userId}`)}>
                <EyeIcon /> Preview public page
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="pg-error" role="alert">{error}</div>}
      {ok && <div className="pf-ok" role="status">{ok}</div>}

      <div className="pf-grid">
        <SectionMenu items={menu} active={section} onPick={setSection} />

        <div className="pf-main">
          <div data-section={1} hidden={section !== 1}>
            <SectionCard title="Business details" intro="Your business as customers and Jobby-Connect see it.">
              <div className="pf-field">
                <label htmlFor="pf-name">Business name</label>
                <input id="pf-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Rivertown Plumbing" />
              </div>
              <div className="pf-row2">
                <div className="pf-field">
                  <label htmlFor="pf-abn">ABN</label>
                  <input id="pf-abn" value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="Australian Business Number" />
                </div>
                <div className="pf-field">
                  <label htmlFor="pf-plan">Subscription plan</label>
                  <select id="pf-plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                    <option value="">Default</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <label className="pf-check">
                <input type="checkbox" checked={gstRegistered} onChange={(e) => setGstRegistered(e.target.checked)} />
                <span>My business is registered for GST</span>
              </label>
              <div className="pf-field">
                <label htmlFor="promo-points">Promotional Mate Points offered (optional)</label>
                <input
                  id="promo-points"
                  type="number"
                  min="0"
                  step="0.01"
                  value={promoPoints}
                  onChange={(e) => setPromoPoints(e.target.value)}
                  placeholder="e.g. 20"
                />
                <p className="pf-hint">
                  Mate Points you advertise on your quotes. Customers can sort search results by this, so a
                  higher offer lifts you up that list. Leave blank if you don't offer any.
                </p>
              </div>
            </SectionCard>
          </div>

          <div data-section={2} hidden={section !== 2}>
            <SectionCard title="Services" intro="The industries you work in and the jobs you do in each. Customers find you by these.">
              {selIndustryIds.length > 0 && (
                <div className="pf-block">
                  <div className="pf-subhead">Your industries · {selIndustryIds.length}</div>
                  <div className="pf-chips">
                    {selIndustryIds.map((id) => (
                      <ChipX key={id} label={industryName(id)} onRemove={() => toggleIndustry(id)} />
                    ))}
                  </div>
                </div>
              )}

              <div className="pf-field">
                <label htmlFor="pf-ind-q">Find an industry</label>
                <span className="pg-input-ico pf-search">
                  <SearchIcon />
                  <input id="pf-ind-q" type="search" value={industryQuery} onChange={(e) => setIndustryQuery(e.target.value)}
                         placeholder="e.g. Plumbing, Tax, Cleaning" />
                </span>
                <button type="button" className="pg-link pf-ask-link" aria-expanded={askOpen} aria-controls="pf-ask"
                        onClick={() => setAskOpen((o) => !o)}>
                  Can't find your service? Ask us to add it
                </button>
              </div>
              {askOpen && (
                <div id="pf-ask" className="pf-ask" role="region" aria-label="Ask us to add a service">
                  <div className="pf-ask-head">
                    <strong>Ask us to add a service</strong>
                    <button type="button" className="pf-chip-x" onClick={() => setAskOpen(false)} aria-label="Close">×</button>
                  </div>
                  <p>
                    Our team adds new services to the list. For now, email us at <strong>{ADMIN_EMAIL}</strong> with
                    your industry and the service name.
                  </p>
                </div>
              )}
              <div className="pf-ind-list">
                {industryList.length === 0 && <p className="pf-hint">No industry matches "{industryQuery}".</p>}
                <div className="cat-check">
                  {industryList.map((i) => (
                    <button key={i.id} type="button" aria-pressed={selIndustries.has(i.id)}
                            className={`cat-chip sm${selIndustries.has(i.id) ? ' on' : ''}`} onClick={() => toggleIndustry(i.id)}>
                      {selIndustries.has(i.id) ? '✓ ' : '+ '}{i.name}
                    </button>
                  ))}
                </div>
              </div>

              {selIndustryIds.map((indId) => {
                const subs = subcatsByIndustry[indId] ?? []
                if (subs.length === 0) return null
                const picked = subs.filter((s) => selSubcats.has(s.id)).length
                return (
                  <details key={indId} className="pf-subcats" open>
                    <summary>
                      <span className="pf-subcats-name">{industryName(indId)}</span>
                      <span className="pf-subcats-count">{picked} of {subs.length}</span>
                    </summary>
                    {picked === 0 && (
                      <p className="pf-warn">Tick at least one service so customers know what you do.</p>
                    )}
                    <div className="pf-subcats-tools">
                      <button type="button" className="pg-link"
                              onClick={() => subs.forEach((s) => { if (!selSubcats.has(s.id)) toggleSubcat(s.id) })}>
                        Select all
                      </button>
                      <span aria-hidden="true">/</span>
                      <button type="button" className="pg-link"
                              onClick={() => subs.forEach((s) => { if (selSubcats.has(s.id)) toggleSubcat(s.id) })}>
                        none
                      </button>
                    </div>
                    <div className="cat-check">
                      {subs.map((s) => (
                        <button key={s.id} type="button" aria-pressed={selSubcats.has(s.id)}
                                className={`cat-chip sm${selSubcats.has(s.id) ? ' on' : ''}`} onClick={() => toggleSubcat(s.id)}>
                          {selSubcats.has(s.id) && '✓ '}{s.name}
                        </button>
                      ))}
                    </div>
                  </details>
                )
              })}

              {selIndustries.size > 0 && summary}
            </SectionCard>
          </div>

          <div data-section={3} hidden={section !== 3}>
            <SectionCard
              title="Service area"
              intro="You'll only get requests from customers in the suburbs you pick. Kept private — customers just see the suburb names."
            >
              <div className="pf-subhead">Add suburbs</div>
              <div className="pf-addrow">
                <div className="pf-field pf-state">
                  <label htmlFor="pf-state">State</label>
                  <select id="pf-state" value={suburbState} onChange={(e) => setSuburbState(e.target.value)}>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="pf-field pf-grow">
                  <label htmlFor="pf-suburb">Suburb or postcode</label>
                  {suburbOptions.length === 0
                    ? <p className="pf-hint">No suburbs listed for {suburbState} yet.</p>
                    : <SuburbAdd id="pf-suburb" options={suburbOptions} chosen={selSuburbs} onPick={toggleSuburb} />}
                </div>
              </div>

              <div className="pf-block">
                <div className="pf-subhead-row">
                  <span className="pf-subhead">Your suburbs · {selSuburbs.size}</span>
                  {selSuburbs.size > 0 && (
                    <button type="button" className="pg-link" onClick={() => setSelSuburbs(new Map())}>Clear all</button>
                  )}
                </div>
                {selSuburbs.size === 0
                  ? <p className="pf-hint">No suburbs yet. Type above to add the ones you cover.</p>
                  : (
                    <div className="pf-chips">
                      {Array.from(selSuburbs.entries()).map(([id, name]) => (
                        <ChipX key={id} label={suburbLabel(id, name)}
                               onRemove={() => setSelSuburbs((prev) => { const next = new Map(prev); next.delete(id); return next })} />
                      ))}
                    </div>
                  )}
              </div>

              <div className="pf-field">
                <label htmlFor="pf-area">Area description (shown on your page)</label>
                <input id="pf-area" value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="e.g. Inner Melbourne" />
              </div>
            </SectionCard>
          </div>

          <div data-section={4} hidden={section !== 4}>
            <SectionCard
              title="Public page"
              intro="Customers see this as a small site with Home, About Us, Services and Contact Us pages. Your Services page is built from the industries and subcategories you picked."
            >
              <div className="pf-subhead">Theme</div>
              <div className="pf-swatches" role="group" aria-label="Theme">
                {(Object.keys(THEME_LABELS) as SiteTheme[]).map((t) => (
                  <ThemeSwatch key={t} theme={t} on={siteTheme === t} onPick={() => setSiteTheme(t)} note={THEME_NOTES[t]} />
                ))}
              </div>

              <div className="pf-field">
                <div className="pf-label-row">
                  <label htmlFor="pf-bio">Short description (optional)</label>
                  <CharCount value={bio} max={1000} />
                </div>
                <textarea id="pf-bio" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="One line customers see in search results…" />
              </div>

              <div className="pf-field">
                <div className="pf-label-row">
                  <label htmlFor="pf-about">About Us (optional)</label>
                  <CharCount value={aboutText} max={4000} />
                </div>
                <textarea id="pf-about" rows={5} value={aboutText} onChange={(e) => setAboutText(e.target.value)}
                          placeholder="Your story, experience, what you specialise in. Blank lines start a new paragraph." />
              </div>

              <div className="pf-row2">
                <div className="pf-field">
                  <label htmlFor="pf-phone">Contact phone (optional)</label>
                  <input id="pf-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. 03 9000 0000" />
                </div>
                <div className="pf-field">
                  <label htmlFor="pf-email">Contact email (optional)</label>
                  <input id="pf-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="e.g. hello@yourbusiness.com.au" />
                </div>
              </div>

              <div className="pf-field">
                <label htmlFor="pf-hours">Opening hours (optional)</label>
                <input id="pf-hours" value={contactHours} onChange={(e) => setContactHours(e.target.value)} placeholder="e.g. Mon–Fri 7am–5pm, Sat by appointment" />
              </div>
            </SectionCard>
          </div>

          <div data-section={5} hidden={section !== 5}>
            <SectionCard title="Photos & highlights">
              <PremiumLocked />
            </SectionCard>
          </div>
        </div>

        <aside className="pf-side" aria-label="Preview and checklist">
          <div className="pf-side-card">
            <ProfilePreview
              theme={siteTheme}
              name={businessName}
              industry={selIndustryIds.length > 0 ? industryName(selIndustryIds[0]) : null}
              suburbs={suburbNames}
            />
            <ProfileChecklist items={checklist} />
          </div>
        </aside>
      </div>

      <div className="pf-savebar">
        <span className="pf-savebar-msg" aria-live="polite">
          {dirty
            ? `Unsaved changes in ${changedSections.map((s) => SECTION_NAMES[s]).join(', ')}`
            : isNew ? 'Fill in each section, then create your profile.' : 'All changes saved.'}
        </span>
        <span className="pf-savebar-actions">
          {!isNew || dirty ? (
            <button type="button" className="pg-btn pg-btn-ghost" onClick={discard} disabled={!dirty || busy}>Discard</button>
          ) : null}
          <button className="pg-btn pg-btn-yellow" type="submit" disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Create provider profile' : 'Save changes'}
          </button>
        </span>
      </div>
    </form>
  )
}

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
)
