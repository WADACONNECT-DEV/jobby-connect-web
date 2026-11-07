import { FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, apiUpload } from '../api'
import { useAuth } from '../auth'
import { SuburbPicker } from '../components/SuburbPicker'
import { PhotoPicker } from '../components/request/PhotoPicker'
import { initialsOf } from '../components/mates/MateCard'
import { type ImageLimits, type Job, type MasterIndustry } from '../types'

interface Selected {
  userId: string
  businessName: string
  /** From Jobby Mates: the provider's industries, to start the form on a shared one. */
  industries?: string[]
}

/** Quick picks that fill the time-frame text. "Other…" opens the text box. */
const TIME_FRAMES = ['As soon as possible', 'Within a week', 'Within 2 weeks', 'Within a month', 'Flexible']

const DESCRIPTION_MAX = 4000

/** What came back from sending: the job, and any photo that couldn't be added. */
interface SendResult {
  job: Job
  attached: number
  failed: { name: string; reason: string }[]
}

/**
 * Request quotes (redesign step 7, owner's request design).
 *
 * Details and photos on one page with one Send button. Photos can only attach
 * to a job that exists, so on Send (owner-approved exception):
 *   1. POST /jobs exactly as before - same body, validation and messages;
 *   2. then each chosen photo is uploaded with the same call ImageUploader
 *      uses (/jobs/{id}/images, kind REQUEST), one after another;
 *   3. a photo that fails doesn't undo the request - the success screen says
 *      which one and that it can be added from Your Requests & Jobs.
 */
export default function NewRequest() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  // From a Premium provider's Services tab (step P5): the service tapped, and
  // the name of the industry it sits under, so the form starts on both.
  const navState = location.state as { providers?: Selected[]; industryId?: string; service?: string; industryName?: string } | null
  const providers: Selected[] = navState?.providers ?? []

  const [title, setTitle] = useState(navState?.service ?? '')
  // One of the active industries (step J1).
  const [industryId, setIndustryId] = useState(navState?.industryId ?? '')
  const [industries, setIndustries] = useState<MasterIndustry[]>([])
  const [suburb, setSuburb] = useState('')
  // Defaults to the customer's registered address; they can type a different one
  // for this job (UAT Round 2 §5.2).
  const [jobAddress, setJobAddress] = useState(user?.registeredAddress ?? '')
  const [description, setDescription] = useState('')
  const [timeFrame, setTimeFrame] = useState('')
  const [otherTime, setOtherTime] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [limits, setLimits] = useState<ImageLimits | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<SendResult | null>(null)

  // The active industries under the owner's 13 group names, A–Z within each.
  const grouped = groupIndustries(industries)
  const names = providers.map((p) => p.businessName).join(', ')
  const plural = providers.length > 1

  useEffect(() => {
    api<ImageLimits>('/images/limits', 'GET').then(setLimits).catch(() => setLimits(null))
    api<MasterIndustry[]>('/master/industries', 'GET')
      .then((list) => {
        const active = list.filter((i) => i.active)
        setIndustries(active)
        // From a Premium Services tab: the industry the tapped service sits under.
        if (!navState?.industryId && navState?.industryName) {
          const match = active.find((i) => i.name === navState.industryName)
          if (match) setIndustryId(match.id)
        }
        // From Jobby Mates: start on the one industry every chosen provider shares.
        if (!navState?.industryId && !navState?.industryName && providers.length > 0 && providers.every((p) => p.industries)) {
          const shared = providers.map((p) => new Set(p.industries)).reduce((a, b) => new Set([...a].filter((x) => b.has(x))))
          if (shared.size === 1) {
            const match = active.find((i) => i.name === [...shared][0])
            if (match) setIndustryId(match.id)
          }
        }
      })
      .catch(() => setIndustries([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Back to where the request was started from — the Jobby Mates tab keeps its
  // grid/list and filter state, because that state is stored per box, not per
  // mount (UAT Round 2 §5.1).
  const goBack = () => navigate(-1)

  if (providers.length === 0) {
    return (
      <div className="mt rq">
        <div className="mt-empty">
          <p>No providers selected. Start by finding providers to request quotes from.</p>
          <button className="mt-btn-navy" onClick={() => navigate('/home/find')}>Find providers</button>
        </div>
      </div>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!title || !industryId || !suburb || !description) {
      setError('Please fill in the title, service industry, suburb and description.')
      return
    }
    setBusy(true)
    let created: Job
    try {
      created = await api<Job>('/jobs', 'POST', {
        title,
        industryId,
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

    // The request exists now. Photos follow it; a failed photo is reported,
    // never a reason to treat the request as unsent.
    const failed: SendResult['failed'] = []
    let attached = 0
    for (let i = 0; i < photos.length; i++) {
      setProgress(`Uploading photos ${i + 1} of ${photos.length}…`)
      const form = new FormData()
      form.append('file', photos[i])
      try {
        await apiUpload(`/jobs/${created.id}/images?kind=REQUEST`, form)
        attached++
      } catch (err) {
        failed.push({ name: photos[i].name, reason: err instanceof Error ? err.message : 'Upload failed' })
      }
    }
    setProgress('')
    setBusy(false)
    setResult({ job: created, attached, failed })
  }

  /* ---------- success ---------- */

  if (result) {
    return (
      <div className="mt rq">
        <div className="rq-done">
          <span className="rq-done-tick" aria-hidden="true">✓</span>
          <h1 className="mt-title">Request sent</h1>
          <p className="rq-done-line">Sent to <strong>{names}</strong>.</p>
          {result.attached > 0 && (
            <p className="rq-done-line">{result.attached} photo{result.attached === 1 ? '' : 's'} attached</p>
          )}
          {result.failed.length > 0 && (
            <p className="rq-warn">
              Your request was sent, but {result.failed.length} photo{result.failed.length === 1 ? '' : 's'} couldn't
              be added: {result.failed.map((f) => `${f.name} (${f.reason})`).join('; ')}. You can add them from
              Your Requests &amp; Jobs.
            </p>
          )}
          <NextSteps />
          <div className="rq-done-actions">
            <button className="mt-continue" onClick={() => navigate('/home/jobs')}>View my request</button>
            <button className="mt-btn-ghost" onClick={() => navigate('/home/find')}>Find more providers</button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- form ---------- */

  const isRegistered = Boolean(user?.registeredAddress) && jobAddress === user?.registeredAddress
  const presetTime = TIME_FRAMES.includes(timeFrame)
  const showOther = otherTime || (timeFrame !== '' && !presetTime)

  const sendingTo = (
    <section className="rq-side-card">
      <h2 className="rq-side-title">Sending to</h2>
      {navState?.service && <p className="rq-side-note">For <strong>{navState.service}</strong></p>}
      <ul className="rq-who">
        {providers.map((p) => (
          <li key={p.userId}>
            <span className="mc-avatar rq-avatar" aria-hidden="true">{initialsOf(p.businessName)}</span>
            <strong>{p.businessName}</strong>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-reset" onClick={goBack}>← Change providers</button>
    </section>
  )

  return (
    <div className="mt rq">
      <button type="button" className="app-back" onClick={goBack}>← Back</button>
      <div className="mt-head">
        <div className="mt-head-copy">
          <DocIcon />
          <div>
            <h1 className="mt-title">Request quotes</h1>
            <p className="mt-sub">Tell your providers what you need. Photos help them quote accurately.</p>
          </div>
        </div>
      </div>

      <div className="rq-layout">
        <div className="rq-side-top">{sendingTo}</div>

        <form className="rq-main" onSubmit={submit} noValidate>
          {error && <div className="jr-msg is-err" role="alert">{error}</div>}

          <section className="rq-card">
            <h2 className="rq-card-title"><span className="rq-n">1</span>What do you need?</h2>
            <label className="mt-field">
              <span>JOB TITLE</span>
              <input id="job-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vacate clean, 2-bed unit" />
            </label>
            <label className="mt-field">
              <span>SERVICE INDUSTRY</span>
              <select id="job-industry" value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
                <option value="">Choose…</option>
                {grouped.map((g) => g.name
                  ? (
                    <optgroup key={g.name} label={g.name}>
                      {g.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </optgroup>
                  )
                  : g.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>))}
              </select>
            </label>
            <label className="mt-field">
              <span>DESCRIBE THE JOB</span>
              <textarea id="job-description" rows={5} maxLength={DESCRIPTION_MAX} value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What needs doing, size, access, anything providers should know…" />
            </label>
            <div className="rq-count">
              <span>The more detail, the more accurate your quotes.</span>
              <span>{description.length} / {DESCRIPTION_MAX}</span>
            </div>
          </section>

          <section className="rq-card">
            <h2 className="rq-card-title"><span className="rq-n">2</span>Where is the job?</h2>
            <div className="rq-two">
              <div className="mt-field rq-suburb">
                <span><label htmlFor="job-suburb">SUBURB</label></span>
                <SuburbPicker id="job-suburb" value={suburb} onChange={setSuburb} />
              </div>
              <label className="mt-field">
                <span>JOB ADDRESS <em>(OPTIONAL)</em></span>
                <input id="job-address" value={jobAddress} onChange={(e) => setJobAddress(e.target.value)} placeholder="Street address for the work" />
              </label>
            </div>
            {isRegistered && (
              <p className="rq-tagline"><span className="rq-tag">Your registered address</span> Change it if the job is somewhere else.</p>
            )}
            {user?.registeredAddress && !isRegistered && (
              <p className="rq-tagline">
                <button type="button" className="mt-reset" onClick={() => setJobAddress(user.registeredAddress ?? '')}>
                  Use my registered address
                </button>
              </p>
            )}
          </section>

          <section className="rq-card">
            <h2 className="rq-card-title"><span className="rq-n">3</span>Photos <em>(optional)</em></h2>
            <PhotoPicker files={photos} onChange={setPhotos} limits={limits} disabled={busy} />
          </section>

          <section className="rq-card">
            <h2 className="rq-card-title"><span className="rq-n">4</span>When? <em>(optional)</em></h2>
            <div className="mt-field">
              <span>TIME FRAME</span>
              <div className="rq-chips" role="group" aria-label="Time frame">
                {TIME_FRAMES.map((t) => (
                  <button type="button" key={t} className={`rq-chip${timeFrame === t ? ' is-on' : ''}`}
                    aria-pressed={timeFrame === t}
                    onClick={() => { setOtherTime(false); setTimeFrame(timeFrame === t ? '' : t) }}>
                    {t}
                  </button>
                ))}
                <button type="button" className={`rq-chip${showOther ? ' is-on' : ''}`} aria-pressed={showOther}
                  onClick={() => { setOtherTime(true); if (presetTime) setTimeFrame('') }}>
                  Other…
                </button>
              </div>
              {showOther && (
                <input id="job-timeframe" className="rq-other" value={timeFrame} autoFocus
                  onChange={(e) => setTimeFrame(e.target.value)} placeholder="e.g. after 15 December" aria-label="Your own time frame" />
              )}
            </div>
            <label className="mt-field rq-half">
              <span>REQUEST EXPIRES <em>(OPTIONAL)</em></span>
              <input id="job-expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </label>
          </section>

          <div className="rq-send">
            <p>Your request goes only to the provider{plural ? 's' : ''} you chose. No one else sees it.</p>
            <div className="rq-send-actions">
              <button type="button" className="mt-btn-ghost" onClick={goBack} disabled={busy}>Cancel</button>
              <button type="submit" className="mt-continue" disabled={busy}>
                {busy ? (progress || 'Sending…') : `Send request to ${providers.length} provider${plural ? 's' : ''} →`}
              </button>
            </div>
          </div>
        </form>

        <aside className="rq-side">
          <div className="rq-side-desk">{sendingTo}</div>
          <section className="rq-side-card">
            <h2 className="rq-side-title">What happens next</h2>
            <NextSteps />
          </section>
        </aside>
      </div>
    </div>
  )
}

function NextSteps() {
  return (
    <>
      <ol className="rq-steps">
        <li><span className="rq-step-n">1</span><span><strong>Providers are notified</strong> and send you their quote.</span></li>
        <li><span className="rq-step-n">2</span><span><strong>Compare and accept</strong> one in Your Requests &amp; Jobs.</span></li>
        <li><span className="rq-step-n">3</span><span><strong>Pay when it's done</strong>, then rate the job.</span></li>
      </ol>
      <p className="rq-points"><span className="rq-dot" aria-hidden="true" /><span>You'll earn <strong>Mate Points</strong> on this job when you rate it.</span></p>
    </>
  )
}

function DocIcon() {
  return (
    <svg aria-hidden="true" className="mt-head-ico" width="46" height="46" viewBox="0 0 24 24" fill="none"
      stroke="#0F2A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="13" height="18" rx="2" /><path d="M8 8h5M8 12h5M8 16h3" />
      <path d="M19 11l2 2-2 2" stroke="#D9A400" strokeWidth="2.2" />
    </svg>
  )
}

/**
 * Industries under their group names in the owner's order, A–Z within each.
 * Without group names (an older API) they come back as one A–Z list.
 */
function groupIndustries(list: MasterIndustry[]): { name: string | null; items: MasterIndustry[] }[] {
  if (!list.some((i) => i.group)) {
    return [{ name: null, items: [...list].sort((a, b) => a.name.localeCompare(b.name)) }]
  }
  const map = new Map<string, { name: string; order: number; items: MasterIndustry[] }>()
  list.forEach((i) => {
    const name = i.group ?? 'Other'
    const entry = map.get(name) ?? { name, order: i.groupOrder ?? 999, items: [] }
    entry.items.push(i)
    map.set(name, entry)
  })
  return Array.from(map.values())
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((g) => ({ name: g.name, items: g.items.sort((a, b) => a.name.localeCompare(b.name)) }))
}

