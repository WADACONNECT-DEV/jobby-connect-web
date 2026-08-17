import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import {
  bpsToPercent,
  percentToBps,
  type MasterIndustry,
  type MasterPlan,
  type MasterRate,
  type MasterSubcategory,
  type MasterSuburb,
} from '../types'

type Tab = 'industries' | 'subcategories' | 'suburbs' | 'plans' | 'rates'
const TABS: { key: Tab; label: string }[] = [
  { key: 'industries', label: 'Industries' },
  { key: 'subcategories', label: 'Subcategories' },
  { key: 'suburbs', label: 'Suburbs' },
  { key: 'plans', label: 'Plans' },
  { key: 'rates', label: 'Rates' },
]

export default function AdminMasterData() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('industries')
  const [error, setError] = useState('')

  return (
    <>
      <div className="page-head">
        <h2>Master data</h2>
        <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/admin')}>← Dashboard</button>
      </div>
      <p className="page-intro">Manage the platform catalogue and rates. Changes take effect immediately.</p>

      <div className="md-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`md-tab${tab === t.key ? ' on' : ''}`} onClick={() => { setTab(t.key); setError('') }}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="msg err">{error}</div>}

      {tab === 'industries' && <Industries onError={setError} />}
      {tab === 'subcategories' && <Subcategories onError={setError} />}
      {tab === 'suburbs' && <Suburbs onError={setError} />}
      {tab === 'plans' && <Plans onError={setError} />}
      {tab === 'rates' && <Rates onError={setError} />}
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

  return (
    <div className="md-panel">
      <table className="md-table">
        <thead><tr><th>Plan</th><th>Sort</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.active ? '' : 'md-inactive'}>
              <td>{r.name}</td><td>{r.sortOrder}</td><td>{r.active ? 'Yes' : 'No'}</td>
              <td><button className="btn btn-ghost-dark btn-xs" onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <form className="md-add" onSubmit={add}>
        <input placeholder="New plan name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="md-sort" type="number" placeholder="Sort" value={sort} onChange={(e) => setSort(e.target.value)} />
        <button className="btn btn-amber btn-sm" type="submit">Add</button>
      </form>
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
      })
      setPromo(''); loadRates()
    } catch (e) { report(e) }
  }
  async function toggle(r: MasterRate) {
    try { await api(`/admin/master/rates/${r.id}`, 'PUT', { active: !r.active }); loadRates() } catch (e) { report(e) }
  }

  return (
    <div className="md-panel">
      <table className="md-table">
        <thead><tr><th>Industry</th><th>Suburb</th><th>Plan</th><th>Commission</th><th>Points</th><th>Promo</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.active ? '' : 'md-inactive'}>
              <td>{r.industryName}</td>
              <td>{r.suburbName ?? 'Any'}</td>
              <td>{r.planName ?? 'Any'}</td>
              <td>{bpsToPercent(r.commissionBps)}%</td>
              <td>{bpsToPercent(r.matePointsBps)}%</td>
              <td>{r.promoLabel ?? '—'}</td>
              <td>{r.active ? 'Yes' : 'No'}</td>
              <td><button className="btn btn-ghost-dark btn-xs" onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="md-empty">No rates yet.</td></tr>}
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
        </div>
        <button className="btn btn-amber btn-sm" type="submit" style={{ marginTop: 10 }}>Add rate</button>
      </form>
      <p className="md-note">The most specific active rate wins: a row with a suburb and plan beats an industry-only row.</p>
    </div>
  )
}
