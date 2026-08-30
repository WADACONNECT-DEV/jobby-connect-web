import { FormEvent, useEffect, useState } from 'react'
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

const STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT']

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
        setBusinessName(p.businessName)
        setAbn(p.abn ?? '')
        setBio(p.bio ?? '')
        setServiceArea(p.serviceArea)
        setGstRegistered(p.gstRegistered)
        setPlanId(p.subscriptionPlanId ?? '')
        setSelIndustries(new Set(p.industries.map((i) => i.id)))
        setSelSubcats(new Set(p.subcategories.map((s) => s.id)))
        setSelSuburbs(new Map(p.suburbs.map((s) => [s.id, s.name])))
        setSiteTheme(p.siteTheme ?? 'CLASSIC')
        setAboutText(p.aboutText ?? '')
        setContactEmail(p.contactEmail ?? '')
        setContactPhone(p.contactPhone ?? '')
        setContactHours(p.contactHours ?? '')
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
      setOk(isNew ? "You're now a provider — you can quote on jobs." : 'Profile updated.')
      if (isNew) await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.')
    } finally {
      setBusy(false)
    }
  }

  if (profile === undefined) return <div className="loading">Loading…</div>
  const isNew = profile === null

  return (
    <div className="center">
      <form className="card card-wide" onSubmit={onSubmit}>
        <h2>{isNew ? 'Become a provider' : 'Your provider profile'}</h2>
        <div className="card-sub">
          {isNew ? 'Set up your provider profile to start quoting on jobs.' : 'Update your details, industries and service area.'}
        </div>
        {error && <div className="msg err">{error}</div>}
        {ok && <div className="msg ok">{ok}</div>}

        {!isNew && selIndustries.size > 0 && (
          <div className="svc-summary">
            <div className="svc-summary-head">Services you cover</div>
            {Array.from(selIndustries).map((indId) => {
              const ind = industries.find((x) => x.id === indId)
              const subs = (subcatsByIndustry[indId] ?? []).filter((sc) => selSubcats.has(sc.id))
              return (
                <div className="svc-line" key={indId}>
                  <span className="svc-ind">{ind?.name ?? 'Industry'}</span>
                  <span className="svc-subs">
                    {subs.length > 0
                      ? subs.map((sc) => sc.name).join(', ')
                      : 'No subcategories selected'}
                  </span>
                </div>
              )
            })}
            <div className="svc-summary-foot">
              {selSubcats.size} subcategor{selSubcats.size === 1 ? 'y' : 'ies'} across{' '}
              {selIndustries.size} industr{selIndustries.size === 1 ? 'y' : 'ies'}
              {selSuburbs.size > 0 && ` · ${selSuburbs.size} suburb${selSuburbs.size === 1 ? '' : 's'}`}
            </div>
          </div>
        )}

        <label>Business name</label>
        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Rivertown Plumbing" />

        <div className="row2">
          <div>
            <label>ABN</label>
            <input value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="Australian Business Number" />
          </div>
          <div>
            <label>Subscription plan</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Default</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <label className="check-line">
          <input type="checkbox" checked={gstRegistered} onChange={(e) => setGstRegistered(e.target.checked)} />
          <span>My business is registered for GST</span>
        </label>

        <label>Industries you work in</label>
        <div className="cat-check">
          {industries.map((i) => (
            <button key={i.id} type="button" className={`cat-chip${selIndustries.has(i.id) ? ' on' : ''}`} onClick={() => toggleIndustry(i.id)}>
              {i.name}
            </button>
          ))}
        </div>

        {selIndustries.size > 0 && (
          <>
            <label>Subcategories</label>
            {Array.from(selIndustries).map((indId) => {
              const ind = industries.find((x) => x.id === indId)
              const subs = subcatsByIndustry[indId] ?? []
              if (subs.length === 0) return null
              return (
                <div key={indId} className="subcat-group">
                  <div className="subcat-head">{ind?.name}</div>
                  <div className="cat-check">
                    {subs.map((s) => (
                      <button key={s.id} type="button" className={`cat-chip sm${selSubcats.has(s.id) ? ' on' : ''}`} onClick={() => toggleSubcat(s.id)}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}

        <label>Service area (description)</label>
        <input value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="e.g. Inner Melbourne" />

        <label>Serviceable suburbs</label>
        <div className="suburb-picker">
          <select value={suburbState} onChange={(e) => setSuburbState(e.target.value)}>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="cat-check" style={{ marginTop: 8 }}>
            {suburbOptions.length === 0 && <span className="muted-note">No suburbs listed for {suburbState} yet.</span>}
            {suburbOptions.map((s) => (
              <button key={s.id} type="button" className={`cat-chip sm${selSuburbs.has(s.id) ? ' on' : ''}`} onClick={() => toggleSuburb(s)}>
                {s.name}
              </button>
            ))}
          </div>
          {selSuburbs.size > 0 && (
            <div className="selected-suburbs">Selected: {Array.from(selSuburbs.values()).join(', ')}</div>
          )}
        </div>

        <label>Short description (optional)</label>
        <textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="One line customers see in search results…" />

        {/* ---- Public page (UAT Round 1 5.4) ---- */}
        <h3 className="acct-head">Your public page</h3>
        <p className="md-note" style={{ marginTop: 0 }}>
          Customers see this as a small site with Home, About Us, Services and Contact Us pages.
          Your Services page is built from the industries and subcategories you picked above.
        </p>

        <label>Theme</label>
        <select value={siteTheme} onChange={(e) => setSiteTheme(e.target.value as SiteTheme)}>
          {(Object.keys(THEME_LABELS) as SiteTheme[]).map((t) => (
            <option key={t} value={t}>{THEME_LABELS[t]}</option>
          ))}
        </select>

        <label style={{ marginTop: 12 }}>About Us (optional)</label>
        <textarea rows={4} value={aboutText} onChange={(e) => setAboutText(e.target.value)}
                  placeholder="Your story, experience, what you specialise in. Blank lines start a new paragraph." />

        <div className="row2" style={{ marginTop: 12 }}>
          <div>
            <label>Contact phone (optional)</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. 03 9000 0000" />
          </div>
          <div>
            <label>Contact email (optional)</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="e.g. hello@yourbusiness.com.au" />
          </div>
        </div>

        <label style={{ marginTop: 12 }}>Opening hours (optional)</label>
        <input value={contactHours} onChange={(e) => setContactHours(e.target.value)} placeholder="e.g. Mon–Fri 7am–5pm, Sat by appointment" />

        {profile && (
          <button type="button" className="btn btn-ghost-dark btn-sm" style={{ marginTop: 14 }}
                  onClick={() => navigate(`/providers/${profile.userId}`)}>
            Preview my public page
          </button>
        )}

        <button className="btn btn-amber btn-block" type="submit" disabled={busy} style={{ marginTop: 18 }}>
          {busy ? 'Saving…' : isNew ? 'Create provider profile' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
