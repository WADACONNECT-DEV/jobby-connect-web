import { FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { CATEGORY_LABELS, type Job, type ServiceCategory } from '../types'

interface Selected {
  userId: string
  businessName: string
}

export default function NewRequest() {
  const navigate = useNavigate()
  const location = useLocation()
  const providers: Selected[] = (location.state as { providers?: Selected[] })?.providers ?? []

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ServiceCategory | ''>('')
  const [suburb, setSuburb] = useState('')
  const [jobAddress, setJobAddress] = useState('')
  const [description, setDescription] = useState('')
  const [timeFrame, setTimeFrame] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const categories = Object.keys(CATEGORY_LABELS) as ServiceCategory[]

  if (providers.length === 0) {
    return (
      <div className="empty">
        <p>No providers selected. Start by finding providers to request quotes from.</p>
        <button className="btn btn-amber" style={{ marginTop: 12 }} onClick={() => navigate('/search')}>Find providers</button>
      </div>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!title || !category || !suburb || !description) {
      setError('Please fill in the title, service, suburb and description.')
      return
    }
    setBusy(true)
    try {
      await api<Job>('/jobs', 'POST', {
        title,
        category,
        description,
        suburb,
        jobAddress: jobAddress || null,
        timeFrame: timeFrame || null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        providerIds: providers.map((p) => p.userId),
      })
      navigate('/jobs')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center">
      <form className="card card-wide" onSubmit={submit}>
        <h2>Request quotes</h2>
        <div className="card-sub">
          Sending to: <strong>{providers.map((p) => p.businessName).join(', ')}</strong>
        </div>
        {error && <div className="msg err">{error}</div>}

        <label>Job title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vacate clean, 2-bed unit" />

        <div className="row2">
          <div>
            <label>Service</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory | '')}>
              <option value="">Choose…</option>
              {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label>Suburb</label>
            <input value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="e.g. Pakenham" />
          </div>
        </div>

        <label>Job address (optional)</label>
        <input value={jobAddress} onChange={(e) => setJobAddress(e.target.value)} placeholder="Street address for the work" />

        <label>Describe the job</label>
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs doing, size, access, anything providers should know…" />

        <div className="row2">
          <div>
            <label>Time frame (optional)</label>
            <input value={timeFrame} onChange={(e) => setTimeFrame(e.target.value)} placeholder="e.g. within 2 weeks" />
          </div>
          <div>
            <label>Request expires (optional)</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-amber btn-block" type="submit" disabled={busy} style={{ marginTop: 20 }}>
          {busy ? 'Sending…' : `Send request to ${providers.length} provider${providers.length > 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  )
}
