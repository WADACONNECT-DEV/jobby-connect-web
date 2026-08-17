import { FormEvent, useEffect, useState } from 'react'
import { api } from '../api'
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

        <label>About your business (optional)</label>
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell customers about your experience, what you specialise in…" />

        <button className="btn btn-amber btn-block" type="submit" disabled={busy} style={{ marginTop: 18 }}>
          {busy ? 'Saving…' : isNew ? 'Create provider profile' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
