import { useEffect, useState } from 'react'
import { api } from '../api'
import {
  type ReferralConfig,
  type ReferralSettings,
  type ReferralQueueRow,
} from '../types'

export default function AdminReferrals() {
  const [configs, setConfigs] = useState<ReferralConfig[]>([])
  const [settings, setSettings] = useState<ReferralSettings | null>(null)
  const [queue, setQueue] = useState<ReferralQueueRow[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadAll = () => {
    api<ReferralConfig[]>('/admin/referrals/config', 'GET').then(setConfigs).catch(() => {})
    api<ReferralSettings>('/admin/referrals/settings', 'GET').then(setSettings).catch(() => {})
    api<ReferralQueueRow[]>('/admin/referrals/queue', 'GET').then(setQueue).catch(() => {})
  }
  useEffect(loadAll, [])

  // ---- add a config ----
  const [suburb, setSuburb] = useState('')
  const [industry, setIndustry] = useState('')
  const [points, setPoints] = useState('')
  const addConfig = () => {
    setError(''); setNotice('')
    api<ReferralConfig>('/admin/referrals/config', 'POST', {
      suburb: suburb.trim() || null,
      industry: industry.trim() || null,
      pointsPerReferral: Number(points || '0'),
    })
      .then(() => { setSuburb(''); setIndustry(''); setPoints(''); setNotice('Configuration added.'); loadAll() })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not add configuration.'))
  }
  const deleteConfig = (id: string) => {
    setError(''); setNotice('')
    api<void>(`/admin/referrals/config/${id}`, 'DELETE')
      .then(() => { setNotice('Configuration removed.'); loadAll() })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not remove configuration.'))
  }

  // ---- settings ----
  const saveSettings = () => {
    if (!settings) return
    setError(''); setNotice('')
    api<ReferralSettings>('/admin/referrals/settings', 'PUT', settings)
      .then((s) => { setSettings(s); setNotice('Settings saved.') })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not save settings.'))
  }
  const setNum = (key: keyof ReferralSettings, value: string, nullable = false) => {
    if (!settings) return
    const v = value === '' ? (nullable ? null : 0) : Number(value)
    setSettings({ ...settings, [key]: v } as ReferralSettings)
  }

  return (
    <>
      <div className="page-head"><h2>Referrals</h2></div>
      {error && <div className="msg err">{error}</div>}
      {notice && <div className="msg ok">{notice}</div>}

      {/* Point value config (Flow A) */}
      <h3>Referral point value (customer refers provider)</h3>
      <p className="muted">Points awarded for a successful provider referral. The most specific active row wins; the default (all suburbs, all industries) always applies as a fallback.</p>
      <div className="md-panel">
        <table className="tbl">
          <thead><tr><th>Suburb</th><th>Industry</th><th>Points</th><th></th></tr></thead>
          <tbody>
            {configs.map((c) => (
              <tr key={c.id}>
                <td>{c.suburb ?? <em>All</em>}</td>
                <td>{c.industry ?? <em>All</em>}</td>
                <td>{c.pointsPerReferral}</td>
                <td>{c.default ? <span className="pay-meta">default</span> :
                  <button className="btn btn-ghost-dark btn-sm" onClick={() => deleteConfig(c.id)}>Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="jm-form" style={{ marginTop: 10 }}>
        <input className="input" placeholder="Suburb (blank = all)" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
        <input className="input" placeholder="Industry (blank = all)" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        <input className="input" type="number" placeholder="Points" value={points} onChange={(e) => setPoints(e.target.value)} />
        <button className="btn btn-amber btn-sm" disabled={!points} onClick={addConfig}>Add</button>
      </div>

      {/* Settings */}
      {settings && (
        <>
          <h3 style={{ marginTop: 24 }}>Settings</h3>
          <div className="md-panel jm-settings">
            <label>Cents per point<input className="input" type="number" value={settings.centsPerPoint}
              onChange={(e) => setNum('centsPerPoint', e.target.value)} /></label>
            <label>Flow B min points<input className="input" type="number" value={settings.flowBMinPoints ?? ''}
              onChange={(e) => setNum('flowBMinPoints', e.target.value, true)} /></label>
            <label>Flow B max points<input className="input" type="number" value={settings.flowBMaxPoints ?? ''}
              onChange={(e) => setNum('flowBMaxPoints', e.target.value, true)} /></label>
            <label>Flow B batch limit<input className="input" type="number" value={settings.flowBBatchLimit}
              onChange={(e) => setNum('flowBBatchLimit', e.target.value)} /></label>
            <label>Link expiry (days)<input className="input" type="number" value={settings.linkExpiryDays}
              onChange={(e) => setNum('linkExpiryDays', e.target.value)} /></label>
            <label>Flow A response (days)<input className="input" type="number" value={settings.flowAResponseDays}
              onChange={(e) => setNum('flowAResponseDays', e.target.value)} /></label>
            <label>Payment grace (days)<input className="input" type="number" value={settings.paymentGraceDays}
              onChange={(e) => setNum('paymentGraceDays', e.target.value)} /></label>
          </div>
          <button className="btn btn-dark btn-sm" style={{ marginTop: 10 }} onClick={saveSettings}>Save settings</button>
        </>
      )}

      {/* Operational queue */}
      <h3 style={{ marginTop: 24 }}>Follow-up queue</h3>
      {queue.length === 0 ? (
        <div className="empty"><p>Nothing needs follow-up. Overdue payments and open complaints appear here.</p></div>
      ) : (
        <div className="md-panel">
          <table className="tbl">
            <thead><tr><th>Type</th><th>Points</th><th>Detail</th><th></th></tr></thead>
            <tbody>
              {queue.map((q, i) => (
                <tr key={q.referralRecordId + i}>
                  <td>{q.kind === 'PAYMENT_OVERDUE' ? 'Overdue payment' : 'Complaint'}</td>
                  <td>{q.pointsAmount}</td>
                  <td>{q.detail}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
