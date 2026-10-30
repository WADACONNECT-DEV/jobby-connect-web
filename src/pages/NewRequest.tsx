import { FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, apiUpload } from '../api'
import { useAuth } from '../auth'
import { SuburbPicker } from '../components/SuburbPicker'
import { ArrowIcon, CheckIcon, EmptyState, PageHead } from '../components/PageParts'
import { DocIcon, NextSteps, PhotoPicker, SectionCard, SendingTo, TimeFrameChips } from '../components/RequestParts'
import { CATEGORY_LABELS, type Attachment, type Job, type ServiceCategory } from '../types'

interface Selected {
  userId: string
  businessName: string
}

/** The server's limit on the description (CreateJobRequest @Size). Shown as a counter only. */
const DESCRIPTION_MAX = 4000

interface PhotoFailure {
  name: string
  reason: string
}

export default function NewRequest() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const providers: Selected[] = (location.state as { providers?: Selected[] })?.providers ?? []

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ServiceCategory | ''>('')
  const [suburb, setSuburb] = useState('')
  // Defaults to the customer's registered address; they can type a different one
  // for this job (UAT Round 2 §5.2).
  const [jobAddress, setJobAddress] = useState(user?.registeredAddress ?? '')
  const [description, setDescription] = useState('')
  const [timeFrame, setTimeFrame] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Photos are chosen before sending and uploaded once the job exists
  // (owner-approved exception, HANDOFF-request Part G).
  const [photos, setPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [sent, setSent] = useState<{ attached: number; failed: PhotoFailure[] } | null>(null)

  const categories = Object.keys(CATEGORY_LABELS) as ServiceCategory[]
  const names = providers.map((p) => p.businessName)

  // Back to where the request was started from — the Jobby Mates tab keeps its
  // grid/list and filter state, because that state is stored per box, not per
  // mount (UAT Round 2 §5.1).
  const goBack = () => navigate(-1)

  if (providers.length === 0) {
    return (
      <div className="pg rq">
        <EmptyState
          action={
            <button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/home/find')}>
              Find providers <ArrowIcon />
            </button>
          }
        >
          No providers selected. Start by finding providers to request quotes from.
        </EmptyState>
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
    let created: Job
    try {
      created = await api<Job>('/jobs', 'POST', {
        title,
        category,
        description,
        suburb,
        jobAddress: jobAddress || null,
        timeFrame: timeFrame || null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        providerIds: providers.map((p) => p.userId),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.')
      setBusy(false)
      return
    }

    // The request is sent. Now attach the chosen photos one by one, with the
    // same upload call ImageUploader uses. A failed photo never undoes the send.
    let attached = 0
    const failed: PhotoFailure[] = []
    for (let i = 0; i < photos.length; i++) {
      setUploading({ done: i + 1, total: photos.length })
      try {
        const form = new FormData()
        form.append('file', photos[i])
        await apiUpload<Attachment>(`/jobs/${created.id}/images?kind=REQUEST`, form)
        attached++
      } catch (err) {
        failed.push({ name: photos[i].name, reason: err instanceof Error ? err.message : 'Upload failed.' })
      }
    }
    setUploading(null)
    setBusy(false)
    setSent({ attached, failed })
  }

  if (sent) {
    return (
      <div className="pg rq">
        <section className="rq-done" aria-labelledby="rq-done-title">
          <span className="rq-done-tick" aria-hidden="true"><CheckIcon /></span>
          <h2 id="rq-done-title">Request sent</h2>
          <p className="rq-done-sub">Sent to <strong>{names.join(', ')}</strong>.</p>
          {sent.attached > 0 && sent.failed.length === 0 && (
            <p className="rq-done-photos">{sent.attached} photo{sent.attached === 1 ? '' : 's'} attached</p>
          )}
          {sent.failed.length > 0 && (
            <div className="rq-done-warn" role="status">
              <p>
                Your request was sent{sent.attached > 0 && ` with ${sent.attached} photo${sent.attached === 1 ? '' : 's'}`}, but{' '}
                {sent.failed.length} photo{sent.failed.length === 1 ? '' : 's'} couldn't be added:
              </p>
              <ul>
                {sent.failed.map((f, i) => <li key={`${f.name}-${i}`}><strong>{f.name}</strong> — {f.reason}</li>)}
              </ul>
              <p>You can add them from Your Requests &amp; Jobs.</p>
            </div>
          )}
          <h3 className="rq-done-next">What happens next</h3>
          <NextSteps />
          <div className="rq-done-actions">
            <button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/home/jobs')}>
              View my request <ArrowIcon />
            </button>
            <button type="button" className="pg-btn pg-btn-ghost" onClick={() => navigate('/home/find')}>
              Find more providers
            </button>
          </div>
        </section>
      </div>
    )
  }

  const registered = user?.registeredAddress ?? ''
  const usingRegistered = registered !== '' && jobAddress === registered
  const sendLabel = uploading
    ? `Uploading photos ${uploading.done} of ${uploading.total}…`
    : busy
      ? 'Sending…'
      : `Send request to ${providers.length} provider${providers.length > 1 ? 's' : ''}`

  return (
    <div className="pg rq">
      <button type="button" className="pg-link rq-back" onClick={goBack}>← Back</button>
      <PageHead
        icon={<DocIcon />}
        title="Request quotes"
        intro="Tell your providers what you need. Photos help them quote accurately."
      />

      <div className="rq-layout">
        <div className="rq-sending">
          <SendingTo names={names} onChange={goBack} />
        </div>

        <form className="rq-main" onSubmit={submit}>
          {error && <div className="pg-error" role="alert">{error}</div>}

          <SectionCard n={1} title="What do you need?">
            <div className="pg-field">
              <label htmlFor="job-title">Job title</label>
              <input id="job-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vacate clean, 2-bed unit" />
            </div>
            <div className="pg-field">
              <label htmlFor="job-industry">Service industry</label>
              <select id="job-industry" value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory | '')}>
                <option value="">Choose…</option>
                {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="pg-field">
              <label htmlFor="job-description">Describe the job</label>
              <textarea
                id="job-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-describedby="job-description-hint"
                placeholder="What needs doing, size, access, anything providers should know…"
              />
              <div className="rq-hintrow" id="job-description-hint">
                <span>The more detail, the more accurate your quotes.</span>
                <span className={description.length > DESCRIPTION_MAX ? 'rq-over' : undefined}>
                  {description.length} / {DESCRIPTION_MAX}
                </span>
              </div>
            </div>
          </SectionCard>

          <SectionCard n={2} title="Where is the job?">
            <div className="rq-pair">
              <div className="pg-field">
                <label htmlFor="job-suburb">Suburb</label>
                <SuburbPicker id="job-suburb" value={suburb} onChange={setSuburb} />
              </div>
              <div className="pg-field">
                <label htmlFor="job-address">Job address <span className="rq-label-opt">(optional)</span></label>
                <input id="job-address" value={jobAddress} onChange={(e) => setJobAddress(e.target.value)} placeholder="Street address for the work" />
              </div>
            </div>
            {usingRegistered && (
              <p className="rq-addr-note">
                <span className="rq-tag">Your registered address</span>
                Change it if the job is somewhere else.
              </p>
            )}
            {registered !== '' && !usingRegistered && (
              <p className="rq-addr-note">
                <button type="button" className="pg-link" onClick={() => setJobAddress(registered)}>
                  Use my registered address
                </button>
              </p>
            )}
          </SectionCard>

          <SectionCard n={3} title="Photos" optional>
            <PhotoPicker
              files={photos}
              disabled={busy}
              onAdd={(more) => setPhotos((prev) => [...prev, ...more])}
              onRemove={(i) => setPhotos((prev) => prev.filter((_, j) => j !== i))}
            />
          </SectionCard>

          <SectionCard n={4} title="When?" optional>
            <div className="pg-field">
              <span className="rq-label">Time frame</span>
              <TimeFrameChips value={timeFrame} onChange={setTimeFrame} />
            </div>
            <div className="pg-field rq-half">
              <label htmlFor="job-expires">Request expires <span className="rq-label-opt">(optional)</span></label>
              <input id="job-expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </SectionCard>

          <div className="rq-sendbar">
            <p>
              Your request goes only to the provider{providers.length > 1 ? 's' : ''} you chose. No one else sees it.
            </p>
            <div className="rq-sendbar-actions">
              <button type="button" className="pg-btn pg-btn-ghost" onClick={goBack}>Cancel</button>
              <button type="submit" className="pg-btn pg-btn-yellow" disabled={busy} aria-live="polite">
                {sendLabel} {!busy && <ArrowIcon />}
              </button>
            </div>
          </div>
        </form>

        <aside className="rq-aside" aria-labelledby="rq-next-title">
          <section className="rq-side-card">
            <h3 id="rq-next-title">What happens next</h3>
            <NextSteps />
          </section>
        </aside>
      </div>
    </div>
  )
}
