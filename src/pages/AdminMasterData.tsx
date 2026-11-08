import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { StickyBar } from '../components/StickyBar'
import { clearPlatformSettings } from '../platform'
import {
  bpsToPercent,
  formatDate,
  percentToBps,
  type BusinessDetails,
  type PlatformSettings,
  type MasterIndustry,
  type MasterPlan,
  type MasterRate,
  type MasterSubcategory,
  type MasterSuburb,
} from '../types'

type Tab = 'industries' | 'subcategories' | 'suburbs' | 'plans' | 'rates' | 'settings'
const TABS: { key: Tab; label: string }[] = [
  { key: 'industries', label: 'Industries' },
  { key: 'subcategories', label: 'Subcategories' },
  { key: 'suburbs', label: 'Suburbs' },
  { key: 'plans', label: 'Plans' },
  { key: 'rates', label: 'Rates' },
  { key: 'settings', label: 'Settings' },
]

export default function AdminMasterData() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('industries')
  const topBlock = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState('')

  return (
    <>
      <div className="page-head">
        <h2>Master data</h2>
        <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/admin')}>← Dashboard</button>
      </div>
      <p className="page-intro">Manage the platform catalogue and rates. Changes take effect immediately.</p>

      <div className="md-tabs" ref={topBlock}>
        {TABS.map((t) => (
          <button key={t.key} className={`md-tab${tab === t.key ? ' on' : ''}`} onClick={() => { setTab(t.key); setError('') }}>
            {t.label}
          </button>
        ))}
      </div>
      <StickyBar anchor={topBlock}>
        <div className="md-tabs" style={{ margin: 0, border: 0 }}>
          {TABS.map((t) => (
            <button key={t.key} className={`md-tab${tab === t.key ? ' on' : ''}`} onClick={() => { setTab(t.key); setError('') }}>
              {t.label}
            </button>
          ))}
        </div>
        <span className="sb-count">Master data</span>
      </StickyBar>

      {error && <div className="msg err">{error}</div>}

      {tab === 'industries' && <Industries onError={setError} />}
      {tab === 'subcategories' && <Subcategories onError={setError} />}
      {tab === 'suburbs' && <Suburbs onError={setError} />}
      {tab === 'plans' && <Plans onError={setError} />}
      {tab === 'rates' && <Rates onError={setError} />}
      {tab === 'settings' && <><Settings onError={setError} /><Business onError={setError} /></>}
    </>
  )
}

function useReporter(onError: (m: string) => void) {
  return (e: unknown) => onError(e instanceof Error ? e.message : 'Something went wrong.')
}

/* ---------------- Industries ---------------- */
function Industries({ onError }: { onError: (m: string) => void }) {
  const report = useReporter(onError)
  const [rows, setRows] = useState<MasterIndustry[]>([])
  const [name, setName] = useState('')
  const [sort, setSort] = useState('0')

  const load = () => api<MasterIndustry[]>('/admin/master/industries', 'GET').then(setRows).catch(report)
  useEffect(() => { load() }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await api('/admin/master/industries', 'POST', { name, sortOrder: Number(sort) || 0, active: true })
      setName(''); setSort('0'); load()
    } catch (e) { report(e) }
  }
  async function toggle(r: MasterIndustry) {
    try { await api(`/admin/master/industries/${r.id}`, 'PUT', { active: !r.active }); load() } catch (e) { report(e) }
  }

  return (
    <div className="md-panel">
      <table className="md-table">
        <thead><tr><th>Name</th><th>Code</th><th>Sort</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.active ? '' : 'md-inactive'}>
              <td>{r.name}</td><td>{r.code ?? '—'}</td><td>{r.sortOrder}</td>
              <td>{r.active ? 'Yes' : 'No'}</td>
              <td><button className="btn btn-ghost-dark btn-xs" onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="md-add" onSubmit={add}>
        <input placeholder="New industry name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="md-sort" type="number" placeholder="Sort" value={sort} onChange={(e) => setSort(e.target.value)} />
        <button className="btn btn-amber btn-sm" type="submit">Add</button>
      </form>
    </div>
  )
}

/* ---------------- Subcategories ---------------- */
function Subcategories({ onError }: { onError: (m: string) => void }) {
  const report = useReporter(onError)
  const [industries, setIndustries] = useState<MasterIndustry[]>([])
  const [industryId, setIndustryId] = useState('')
  const [rows, setRows] = useState<MasterSubcategory[]>([])
  const [name, setName] = useState('')

  useEffect(() => {
    api<MasterIndustry[]>('/admin/master/industries', 'GET')
      .then((inds) => { setIndustries(inds); if (inds[0]) setIndustryId(inds[0].id) })
      .catch(report)
  }, [])

  const load = (id: string) => {
    if (!id) return
    api<MasterSubcategory[]>(`/admin/master/industries/${id}/subcategories`, 'GET').then(setRows).catch(report)
  }
  useEffect(() => { load(industryId) }, [industryId])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !industryId) return
    try {
      await api('/admin/master/subcategories', 'POST', { industryId, name, active: true })
      setName(''); load(industryId)
    } catch (e) { report(e) }
  }
  async function toggle(r: MasterSubcategory) {
    try { await api(`/admin/master/subcategories/${r.id}`, 'PUT', { active: !r.active }); load(industryId) } catch (e) { report(e) }
  }

  return (
    <div className="md-panel">
      <label>Industry</label>
      <select value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
        {industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select>
      <table className="md-table" style={{ marginTop: 12 }}>
        <thead><tr><th>Name</th><th>Sort</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.active ? '' : 'md-inactive'}>
              <td>{r.name}</td><td>{r.sortOrder}</td><td>{r.active ? 'Yes' : 'No'}</td>
              <td><button className="btn btn-ghost-dark btn-xs" onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="md-empty">No subcategories yet.</td></tr>}
        </tbody>
      </table>
      <form className="md-add" onSubmit={add}>
        <input placeholder="New subcategory name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-amber btn-sm" type="submit">Add</button>
      </form>
    </div>
  )
}

/* ---------------- Suburbs ---------------- */
function Suburbs({ onError }: { onError: (m: string) => void }) {
  const report = useReporter(onError)
  const [rows, setRows] = useState<MasterSuburb[]>([])
  const [name, setName] = useState('')
  const [state, setState] = useState('VIC')
  const [postcode, setPostcode] = useState('')

  const load = () => api<MasterSuburb[]>('/admin/master/suburbs', 'GET').then(setRows).catch(report)
  useEffect(() => { load() }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await api('/admin/master/suburbs', 'POST', { name, state, postcode: postcode || null, active: true })
      setName(''); setPostcode(''); load()
    } catch (e) { report(e) }
  }
  async function toggle(r: MasterSuburb) {
    try { await api(`/admin/master/suburbs/${r.id}`, 'PUT', { active: !r.active }); load() } catch (e) { report(e) }
  }

  return (
    <div className="md-panel">
      <table className="md-table">
        <thead><tr><th>Suburb</th><th>State</th><th>Postcode</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.active ? '' : 'md-inactive'}>
              <td>{r.name}</td><td>{r.state}</td><td>{r.postcode ?? '—'}</td><td>{r.active ? 'Yes' : 'No'}</td>
              <td><button className="btn btn-ghost-dark btn-xs" onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="md-empty">No suburbs yet.</td></tr>}
        </tbody>
      </table>
      <form className="md-add" onSubmit={add}>
        <input placeholder="Suburb name" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={state} onChange={(e) => setState(e.target.value)}>
          {['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="md-sort" placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
        <button className="btn btn-amber btn-sm" type="submit">Add</button>
      </form>
    </div>
  )
}

/* ---------------- Plans ---------------- */
function Plans({ onError }: { onError: (m: string) => void }) {
  const report = useReporter(onError)
  const [rows, setRows] = useState<MasterPlan[]>([])
  const [name, setName] = useState('')
  const [sort, setSort] = useState('0')
  // Per-tier image limits, edited inline (Series 2 work order 4.2).
  const [editing, setEditing] = useState<string | null>(null)
  const [minImg, setMinImg] = useState('0')
  const [maxImg, setMaxImg] = useState('5')
  const [maxMb, setMaxMb] = useState('10')
  // Premium provider profile (V39, owner decision 5): price and billing period
  // are admin settings; the switch can't go on without a price.
  const [price, setPrice] = useState('')
  const [period, setPeriod] = useState('')

  const load = () => api<MasterPlan[]>('/admin/master/plans', 'GET').then(setRows).catch(report)
  useEffect(() => { load() }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await api('/admin/master/plans', 'POST', { name, sortOrder: Number(sort) || 0, active: true })
      setName(''); setSort('0'); load()
    } catch (e) { report(e) }
  }
  async function toggle(r: MasterPlan) {
    try { await api(`/admin/master/plans/${r.id}`, 'PUT', { active: !r.active }); load() } catch (e) { report(e) }
  }

  function startEdit(r: MasterPlan) {
    setEditing(r.id)
    setMinImg(String(r.minImages)); setMaxImg(String(r.maxImages)); setMaxMb(String(r.maxImageMb))
    setPrice(r.price === null || r.price === undefined ? '' : String(r.price)); setPeriod(r.billingPeriod ?? '')
  }

  async function saveLimits(r: MasterPlan) {
    try {
      await api(`/admin/master/plans/${r.id}`, 'PUT', {
        minImages: Number(minImg) || 0,
        maxImages: Number(maxImg) || 0,
        maxImageMb: Number(maxMb) || 1,
        price: price.trim() === '' ? undefined : Number(price),
        billingPeriod: period,
      })
      setEditing(null); load()
    } catch (e) { report(e) }
  }

  /** Switch the Premium profile on or off. The API refuses "on" without a price. */
  async function togglePremium(r: MasterPlan) {
    try { await api(`/admin/master/plans/${r.id}`, 'PUT', { premiumProfile: !r.premiumProfile }); load() } catch (e) { report(e) }
  }

  /** Only one plan governs customer uploads; setting it clears the others. */
  async function makeCustomerDefault(r: MasterPlan) {
    try { await api(`/admin/master/plans/${r.id}`, 'PUT', { customerDefault: true }); load() } catch (e) { report(e) }
  }

  return (
    <div className="md-panel">
      <table className="md-table">
        <thead>
          <tr>
            <th>Plan</th><th>Sort</th><th>Min images</th><th>Max images</th><th>Max MB</th>
            <th>Price</th><th>Billing</th><th>Premium profile</th>
            <th>Customer uploads</th><th>Active</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.active ? '' : 'md-inactive'}>
              <td>{r.name}</td>
              <td>{r.sortOrder}</td>
              {editing === r.id ? (
                <>
                  <td><input className="md-sort" type="number" min="0" value={minImg} onChange={(e) => setMinImg(e.target.value)} /></td>
                  <td><input className="md-sort" type="number" min="0" value={maxImg} onChange={(e) => setMaxImg(e.target.value)} /></td>
                  <td><input className="md-sort" type="number" min="1" value={maxMb} onChange={(e) => setMaxMb(e.target.value)} /></td>
                  <td><input className="md-sort" type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Price" /></td>
                  <td>
                    <select className="md-sort" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Billing period">
                      <option value="">—</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </td>
                </>
              ) : (
                <>
                  <td>{r.minImages}</td><td>{r.maxImages}</td><td>{r.maxImageMb}</td>
                  <td>{r.price === null || r.price === undefined ? <span className="muted">—</span> : `$${r.price.toFixed(2)}`}</td>
                  <td>{r.billingPeriod === 'MONTHLY' ? 'Monthly' : r.billingPeriod === 'YEARLY' ? 'Yearly' : <span className="muted">—</span>}</td>
                </>
              )}
              <td>
                {r.premiumProfile
                  ? <><span className="tag-ok">On</span>{' '}<button className="btn btn-ghost-dark btn-xs" onClick={() => togglePremium(r)}>Switch off</button></>
                  : <button className="btn btn-ghost-dark btn-xs" onClick={() => togglePremium(r)} disabled={r.price === null || r.price === undefined}
                      title={r.price === null || r.price === undefined ? 'Enter a price first (Limits)' : undefined}>Switch on</button>}
              </td>
              <td>
                {r.customerDefault
                  ? <span className="tag-ok">Uses this plan</span>
                  : <button className="btn btn-ghost-dark btn-xs" onClick={() => makeCustomerDefault(r)}>Use this</button>}
              </td>
              <td>{r.active ? 'Yes' : 'No'}</td>
              <td>
                {editing === r.id ? (
                  <>
                    <button className="btn btn-amber btn-xs" onClick={() => saveLimits(r)}>Save</button>{' '}
                    <button className="btn btn-ghost-dark btn-xs" onClick={() => setEditing(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost-dark btn-xs" onClick={() => startEdit(r)}>Edit</button>{' '}
                    <button className="btn btn-ghost-dark btn-xs" onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="md-add" onSubmit={add}>
        <input placeholder="New plan name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="md-sort" type="number" placeholder="Sort" value={sort} onChange={(e) => setSort(e.target.value)} />
        <button className="btn btn-amber btn-sm" type="submit">Add</button>
      </form>
      <p className="md-note">
        Image limits apply per subscription tier. Customers hold no subscription, so job-request
        photos use whichever plan is marked "Uses this plan".
      </p>
      <p className="md-note">
        Premium profile: enter the plan's price and billing period with Edit, then switch it on. Providers on
        that plan get the Premium public profile (logo, photos, highlights). It stays off until a price is
        entered. Charging for the plan is not built yet; the price is shown to providers only.
      </p>
    </div>
  )
}

/* ---------------- Rates ---------------- */
function Rates({ onError }: { onError: (m: string) => void }) {
  const report = useReporter(onError)
  const [rows, setRows] = useState<MasterRate[]>([])
  const [industries, setIndustries] = useState<MasterIndustry[]>([])
  const [suburbs, setSuburbs] = useState<MasterSuburb[]>([])
  const [plans, setPlans] = useState<MasterPlan[]>([])

  const [industryId, setIndustryId] = useState('')
  const [suburbId, setSuburbId] = useState('')
  const [planId, setPlanId] = useState('')
  const [commission, setCommission] = useState('10')
  const [points, setPoints] = useState('5')
  const [promo, setPromo] = useState('')
  // Effective window: the matrix is dated, so a rate change can be scheduled
  // without disturbing the rate that historical quotes were priced on.
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const loadRates = () => api<MasterRate[]>('/admin/master/rates', 'GET').then(setRows).catch(report)
  useEffect(() => {
    loadRates()
    api<MasterIndustry[]>('/admin/master/industries', 'GET').then((inds) => { setIndustries(inds); if (inds[0]) setIndustryId(inds[0].id) }).catch(report)
    api<MasterSuburb[]>('/admin/master/suburbs', 'GET').then(setSuburbs).catch(report)
    api<MasterPlan[]>('/admin/master/plans', 'GET').then(setPlans).catch(report)
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!industryId) return
    try {
      await api('/admin/master/rates', 'POST', {
        industryId,
        suburbId: suburbId || null,
        planId: planId || null,
        commissionBps: percentToBps(Number(commission) || 0),
        matePointsBps: percentToBps(Number(points) || 0),
        promoLabel: promo || null,
        active: true,
        effectiveFrom: from ? new Date(from).toISOString() : null,
        effectiveTo: to ? new Date(to).toISOString() : null,
      })
      setPromo(''); setFrom(''); setTo(''); loadRates()
    } catch (e) { report(e) }
  }
  async function toggle(r: MasterRate) {
    try { await api(`/admin/master/rates/${r.id}`, 'PUT', { active: !r.active }); loadRates() } catch (e) { report(e) }
  }

  return (
    <div className="md-panel">
      <table className="md-table">
        <thead><tr><th>Industry</th><th>Suburb</th><th>Plan</th><th>Commission</th><th>Points</th><th>Effective</th><th>Promo</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.active ? '' : 'md-inactive'}>
              <td>{r.industryName}</td>
              <td>{r.suburbName ?? 'Any'}</td>
              <td>{r.planName ?? 'Any'}</td>
              <td>{bpsToPercent(r.commissionBps)}%</td>
              <td>{bpsToPercent(r.matePointsBps)}%</td>
              <td className="rate-window">
                {rateWindow(r)}
                {r.active && !inForce(r) && <div className="rate-note">not in force</div>}
              </td>
              <td>{r.promoLabel ?? '—'}</td>
              <td>{r.active ? 'Yes' : 'No'}</td>
              <td><button className="btn btn-ghost-dark btn-xs" onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={9} className="md-empty">No rates yet.</td></tr>}
        </tbody>
      </table>

      <form className="md-rate-form" onSubmit={add}>
        <div className="md-rate-grid">
          <div><label>Industry</label>
            <select value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
              {industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div><label>Suburb (optional)</label>
            <select value={suburbId} onChange={(e) => setSuburbId(e.target.value)}>
              <option value="">Any</option>
              {suburbs.map((s) => <option key={s.id} value={s.id}>{s.name}, {s.state}</option>)}
            </select>
          </div>
          <div><label>Plan (optional)</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Any</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label>Commission %</label>
            <input type="number" step="0.01" min="0" max="100" value={commission} onChange={(e) => setCommission(e.target.value)} />
          </div>
          <div><label>Mate Points %</label>
            <input type="number" step="0.01" min="0" max="100" value={points} onChange={(e) => setPoints(e.target.value)} />
          </div>
          <div><label>Promo label</label>
            <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="e.g. New suburb" />
          </div>
          <div><label>Effective from (optional)</label>
            <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div><label>Effective to (optional)</label>
            <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-amber btn-sm" type="submit" style={{ marginTop: 10 }}>Add rate</button>
      </form>
      <p className="md-note">
        The most specific active rate wins: a row with a suburb and plan beats an industry-only row.
        Leave the dates blank for a rate that applies from now on. Changing a rate never alters
        quotes already sent — each quote stores the rate row it was priced on.
      </p>
    </div>
  )
}

/** Human-readable effective window for a rate row. */
function rateWindow(r: MasterRate): string {
  if (!r.effectiveFrom && !r.effectiveTo) return 'Always'
  const from = r.effectiveFrom ? formatDate(r.effectiveFrom) : 'Always'
  const to = r.effectiveTo ? formatDate(r.effectiveTo) : 'ongoing'
  return `${from} → ${to}`
}

/** Whether a rate row applies right now, so a scheduled or expired row is obvious. */
function inForce(r: MasterRate): boolean {
  const now = Date.now()
  if (r.effectiveFrom && Date.parse(r.effectiveFrom) > now) return false
  if (r.effectiveTo && Date.parse(r.effectiveTo) <= now) return false
  return true
}

/* ---------------- Jobby-Connect business details ---------------- */
/**
 * Jobby-Connect's own details for its invoices and receipts (ledger spec Part
 * 1.8): the "from" block of every charges tax invoice and payout receipt, and the
 * foot of the customer receipt. Each document copies them when issued.
 */
function Business({ onError }: { onError: (m: string) => void }) {
  const report = useReporter(onError)
  const [form, setForm] = useState<Omit<BusinessDetails, 'updatedAt'>>({
    legalName: '', abn: '', address: '', email: '', phone: '', collectedNote: '',
  })
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const apply = (b: BusinessDetails) => {
    setForm({
      legalName: b.legalName ?? '', abn: b.abn ?? '', address: b.address ?? '',
      email: b.email ?? '', phone: b.phone ?? '', collectedNote: b.collectedNote ?? '',
    })
    setUpdatedAt(b.updatedAt)
  }
  useEffect(() => { api<BusinessDetails>('/admin/master/business', 'GET').then(apply).catch(report) }, [])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      apply(await api<BusinessDetails>('/admin/master/business', 'PUT', form))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) { report(err) } finally { setBusy(false) }
  }

  return (
    <div className="md-panel md-business">
      <h3 className="md-business-title">Jobby-Connect business details</h3>
      <form className="md-business-form" onSubmit={save}>
        <label>Legal name<input value={form.legalName ?? ''} onChange={set('legalName')} placeholder="Registered business name" /></label>
        <label>ABN<input value={form.abn ?? ''} onChange={set('abn')} placeholder="11 digits" /></label>
        <label className="is-wide">Business address<input value={form.address ?? ''} onChange={set('address')} /></label>
        <label>Contact email<input type="email" value={form.email ?? ''} onChange={set('email')} /></label>
        <label>Phone (optional)<input value={form.phone ?? ''} onChange={set('phone')} /></label>
        <label className="is-wide">"Collected on behalf of the provider" note
          <textarea rows={2} value={form.collectedNote ?? ''} onChange={set('collectedNote')}
            placeholder="Left blank, receipts say: Collected by Jobby-Connect for {provider}." />
        </label>
        <div className="md-business-actions">
          <button className="btn btn-amber btn-sm" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          {saved && <span className="md-saved">Saved</span>}
          {updatedAt && <span className="md-note-inline">Last changed {formatDate(updatedAt)}</span>}
        </div>
      </form>
      <p className="md-note">
        These print on every Jobby-Connect document issued from now on: the charges tax invoice (INV-…-C), the
        payout receipt (REPT-…-P) and the foot of the customer receipt (REPT-…). Documents already issued keep the
        details they were issued with.
      </p>
    </div>
  )
}

/* ---------------- Platform settings ---------------- */
/**
 * Platform-wide configuration (V25). The provider-per-request cap lives here so
 * the owner can change it without a code change — UAT Round 2 open item 7.2.
 */
function Settings({ onError }: { onError: (m: string) => void }) {
  const report = useReporter(onError)
  const [current, setCurrent] = useState<PlatformSettings | null>(null)
  const [maxProviders, setMaxProviders] = useState('')
  const [saved, setSaved] = useState(false)

  const load = () => api<PlatformSettings>('/admin/master/settings', 'GET')
    .then((s) => { setCurrent(s); setMaxProviders(String(s.maxProvidersPerRequest)) })
    .catch(report)
  useEffect(() => { load() }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    const value = Number(maxProviders)
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      onError('Maximum providers per request must be a whole number between 1 and 10.')
      return
    }
    try {
      const updated = await api<PlatformSettings>('/admin/master/settings', 'PUT', { maxProvidersPerRequest: value })
      setCurrent(updated)
      setMaxProviders(String(updated.maxProvidersPerRequest))
      // Members' browsers cache the settings for the session; drop this one so
      // an admin testing the change sees it straight away.
      clearPlatformSettings()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { report(e) }
  }

  return (
    <div className="md-panel">
      <table className="md-table">
        <thead><tr><th>Setting</th><th>Value</th><th>Last changed</th></tr></thead>
        <tbody>
          <tr>
            <td>Maximum providers per quote request</td>
            <td>{current ? current.maxProvidersPerRequest : '—'}</td>
            <td>{current && current.updatedAt ? formatDate(current.updatedAt) : '—'}</td>
          </tr>
        </tbody>
      </table>

      <form className="md-add" onSubmit={save}>
        <input
          className="md-sort"
          type="number"
          min={1}
          max={10}
          value={maxProviders}
          onChange={(e) => setMaxProviders(e.target.value)}
          aria-label="Maximum providers per quote request"
        />
        <button className="btn btn-amber btn-sm" type="submit">Save</button>
        {saved && <span className="md-saved">Saved</span>}
      </form>

      <p className="md-note">
        How many providers one customer can send a single quote request to. The request form and the
        provider selection screens all read this value, and the API enforces it, so there is one
        number rather than three. Changing it does not affect requests already sent.
      </p>
    </div>
  )
}
