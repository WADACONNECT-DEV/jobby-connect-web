import { FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ImageUploader } from '../components/ImageUploader'
import { SuburbPicker } from '../components/SuburbPicker'
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
  // Photos attach to a job, so they can only be added once it exists. On a
  // successful send we stay on the page and offer the photo step (spec 2.2).
  const [createdJob, setCreatedJob] = useState<Job | null>(null)

  const categories = Object.keys(CATEGORY_LABELS) as ServiceCategory[]

  // Back to where the request was started from — the Jobby Mates tab keeps its
  // grid/list and filter state, because that state is stored per box, not per
  // mount (UAT Round 2 §5.1).
  const goBack = () => navigate(-1)

  if (providers.length === 0) {
    return (
      <div className="empty">
        <p>No providers selected. Start by finding providers to request quotes from.</p>
        <button className="btn btn-amber" style={{ marginTop: 12 }} onClick={() => navigate('/home/find')}>Find providers</button>
      </div>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!title || !category || !suburb || !description) {
      setError('Please fill in the title, service industry, suburb and description.')
      return
    }
    setBusy(true)
    try {
      const created = await api<Job>('/jobs', 'POST', {
        title,
        category,
        description,
        suburb,
        jobAddress: jobAddress || null,
        timeFrame: timeFrame || null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        providerIds: providers.map((p) => p.userId),
      })
      setCreatedJob(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.')
    } finally {
      setBusy(false)
    }
  }

  if (createdJob) {
    return (
      <div className="center">
        <div className="card card-wide">
          <h2>Request sent</h2>
          <div className="card-sub">
            Sent to <strong>{providers.map((p) => p.businessName).join(', ')}</strong>. Add photos so they
            can quote accurately — optional, and you can skip straight through.
          </div>
          <ImageUploader jobId={createdJob.id} kind="REQUEST" canUpload label="Photos of the job" />
          <button className="btn btn-amber btn-block" style={{ marginTop: 18 }} onClick={() => navigate('/home/jobs')}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="center">
      <form className="card card-wide" onSubmit={submit}>
        <button type="button" className="btn btn-ghost-dark btn-sm" onClick={goBack} style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
          ← Back
        </button>

        <h2>Request quotes</h2>
        <div className="card-sub">
          Sending to: <strong>{providers.map((p) => p.businessName).join(', ')}</strong>
        </div>
        {error && <div className="msg err">{error}</div>}

        <label htmlFor="job-title">Job title</label>
        <input id="job-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vacate clean, 2-bed unit" />

        <div className="row2">
          <div>
            <label htmlFor="job-industry">Service Industry</label>
            <select id="job-industry" value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory | '')}>
              <option value="">Choose…</option>
              {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="job-suburb">Suburb</label>
            <SuburbPicker id="job-suburb" value={suburb} onChange={setSuburb} />
          </div>
        </div>

        <label htmlFor="job-address">Job address (optional)</label>
        <input id="job-address" value={jobAddress} onChange={(e) => setJobAddress(e.target.value)} placeholder="Street address for the work" />

        <label htmlFor="job-description">Describe the job</label>
        <textarea id="job-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs doing, size, access, anything providers should know…" />

        <div className="row2">
          <div>
            <label htmlFor="job-timeframe">Time frame (optional)</label>
            <input id="job-timeframe" value={timeFrame} onChange={(e) => setTimeFrame(e.target.value)} placeholder="e.g. within 2 weeks" />
          </div>
          <div>
            <label htmlFor="job-expires">Request expires (optional)</label>
            <input id="job-expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-amber btn-block" type="submit" disabled={busy} style={{ marginTop: 20 }}>
          {busy ? 'Sending…' : `Send request to ${providers.length} provider${providers.length > 1 ? 's' : ''}`}
        </button>
      </form>
    </div>
  )
}
