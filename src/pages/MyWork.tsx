import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { usePersistedValue } from '../listView'
import { Stars } from '../components/Stars'
import { ProgressBar } from '../components/ProgressBar'
import { ImageUploader } from '../components/ImageUploader'
import {
  CATEGORY_LABELS,
  formatDate,
  formatDateTime,
  formatMoney,
  settlementLabel,
  statusLabel,
  type Job,
  type ProgressEntry,
  type ProviderQuote,
  type Review,
  type SettlementResult,
  type SettlementStatus,
} from '../types'

/**
 * Your Work, split into status sub-pages (UAT Round 7 §6).
 *
 * Presentation only. Nothing here decides when a job moves between states —
 * that is the settlement ladder's job and is untouched. This only groups the
 * same jobs, in the same statuses, onto three pages instead of one list.
 *
 * "Completed" is a short-term holding view, not a destination: once payment
 * and the post-job review are both done the job leaves Your Work entirely and
 * appears in Work History, exactly as decided in Round 5.
 */
const WORK_TABS = [
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
] as const

type WorkTab = (typeof WORK_TABS)[number]['key']

/**
 * Where "Review & get paid" sends the provider.
 *
 * It used to point at the Your Quotes tab and stop there, leaving the provider
 * to find the job, expand its card and press a second button with the same
 * name. This carries the quote — and, on a staged job, the one stage actually
 * awaiting review — so the form opens on arrival.
 *
 * A link rather than router state, so it survives a refresh and can be reached
 * from a notification later.
 */
function reviewLink(quote: ProviderQuote): string {
  const stage = (quote.stages ?? []).find((st) => st.settlementStatus === 'PENDING_REVIEW')
  const params = new URLSearchParams({ review: quote.id ?? '' })
  if (stage?.id) params.set('stage', stage.id)
  return `/home/quotes?${params.toString()}`
}

export default function MyWork() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [reviewByJob, setReviewByJob] = useState<Record<string, Review | null>>({})

  const [progressByJob, setProgressByJob] = useState<Record<string, ProgressEntry[]>>({})
  const [progressOpenFor, setProgressOpenFor] = useState<string | null>(null)
  const [percent, setPercent] = useState('')
  const [note, setNote] = useState('')
  const [progressError, setProgressError] = useState('')
  const [historyFor, setHistoryFor] = useState<string | null>(null)

  // The provider's own quote for each job. Marking complete acts on the quote
  // (or one of its stages), so Your Work needs it to offer the same action as
  // Your Quotes (UAT Round 4 7).
  const [quoteByJob, setQuoteByJob] = useState<Record<string, ProviderQuote>>({})

  // Which sub-page is open survives leaving the tab and coming back, the same
  // way the pipeline tab does — Round 1 §5.3, restated in Round 7 check 3.3.
  const [tab, setTab] = usePersistedValue<WorkTab>('work.tab', 'OPEN')

  function loadProgress(jobId: string) {
    return api<ProgressEntry[]>(`/jobs/${jobId}/progress`, 'GET')
      .then((entries) => setProgressByJob((prev) => ({ ...prev, [jobId]: entries })))
      .catch(() => setProgressByJob((prev) => ({ ...prev, [jobId]: [] })))
  }

  function load() {
    return api<Job[]>('/jobs/assigned', 'GET')
      .then((js) => {
        setJobs(js)
        js.filter((j) => j.status === 'COMPLETED').forEach((j) => {
          api<Review>(`/jobs/${j.id}/review`, 'GET')
            .then((rev) => setReviewByJob((prev) => ({ ...prev, [j.id]: rev })))
            .catch(() => setReviewByJob((prev) => ({ ...prev, [j.id]: null })))
        })
        js.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'COMPLETED')
          .forEach((j) => loadProgress(j.id))
        loadQuotes()
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your work.'))
  }

  function loadQuotes() {
    return api<ProviderQuote[]>('/quotes/mine', 'GET')
      .then((qs) => {
        const byJob: Record<string, ProviderQuote> = {}
        qs.forEach((q) => { if (q.jobId) byJob[q.jobId] = q })
        setQuoteByJob(byJob)
      })
      .catch(() => { /* the Mark complete action simply won't offer itself */ })
  }

  /**
   * Mark the work complete from here, exactly as Your Quotes does — same
   * endpoint, same effect (UAT Round 4 7). A staged quote is completed one
   * stage at a time, which is how the settlement ladder works.
   */
  async function markComplete(quoteId: string, stageId: string | null) {
    setActionError(''); setBusyId(stageId ?? quoteId)
    try {
      await api<SettlementResult>('/settlement/complete', 'POST', { quoteId, stageId })
      await Promise.all([load(), loadQuotes()])
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not mark complete.')
    } finally { setBusyId(null) }
  }

  useEffect(() => { load() }, [])

  // 'start' is the only job action a provider has from this screen. There was
  // a 'cancel' here until UAT Round 7 §9: one click ended a live, possibly
  // already paid job. The endpoint behind it is gone too, not just the button.
  async function action(jobId: string, verb: 'start') {
    setActionError(''); setBusyId(jobId)
    try {
      await api<Job>(`/jobs/${jobId}/${verb}`, 'POST')
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Could not ${verb} the job.`)
    } finally { setBusyId(null) }
  }

  function openProgress(jobId: string) {
    const latest = progressByJob[jobId]?.[0]
    setProgressOpenFor(jobId)
    setPercent(latest ? String(latest.percent) : '')
    setNote('')
    setProgressError('')
  }

  async function postProgress(e: FormEvent, jobId: string) {
    e.preventDefault()
    setProgressError('')
    const value = Number(percent)
    if (percent === '' || Number.isNaN(value) || value < 0 || value > 100) {
      setProgressError('Enter a percentage between 0 and 100.')
      return
    }
    setBusyId(jobId)
    try {
      await api<ProgressEntry>(`/jobs/${jobId}/progress`, 'POST', {
        percent: Math.round(value),
        note: note.trim() || null,
      })
      await loadProgress(jobId)
      setProgressOpenFor(null); setPercent(''); setNote('')
    } catch (err) {
      setProgressError(err instanceof Error ? err.message : 'Could not save the update.')
    } finally { setBusyId(null) }
  }

  /**
   * Every job with the figures each sub-page needs, and which sub-page it
   * belongs to. Worked out once, here, so the tab counts and the list can
   * never disagree with each other.
   *
   * "Marked complete" is read from the settlement units, not from the progress
   * bar and not from job.status. Progress reaching 100% only means the provider
   * CAN mark it complete; the job's own status stays IN_PROGRESS until the last
   * unit is paid out. A unit that has left PENDING_COMPLETION is one the
   * provider has actually marked.
   */
  const classified = (jobs ?? []).map((job) => {
    const myQuote = quoteByJob[job.id]
    const units: (SettlementStatus | null)[] = myQuote
      ? (myQuote.stages && myQuote.stages.length > 0
          ? myQuote.stages.map((st) => st.settlementStatus)
          : [myQuote.settlementStatus])
      : []
    const awaitingCompletion = units.some((u) => u === 'PENDING_COMPLETION')
    const awaitingPayment = units.some((u) => u === 'PENDING_PAYMENT')
    const awaitingReview = units.some((u) => u === 'PENDING_REVIEW')

    // Fails safe: with no quote loaded, units is empty and this stays false, so
    // the progress control keeps working rather than vanishing on a failed fetch.
    const markedComplete = job.status === 'COMPLETED'
      || (units.length > 0 && !awaitingCompletion)

    let sub: WorkTab
    if (job.status === 'ACCEPTED') sub = 'OPEN'
    else if (job.status === 'CANCELLED' || markedComplete) sub = 'COMPLETED'
    else sub = 'IN_PROGRESS'

    return { job, myQuote, units, awaitingCompletion, awaitingPayment, awaitingReview, markedComplete, sub }
  })

  const inTab = classified.filter((c) => c.sub === tab)
  const countOf = (key: WorkTab) => classified.filter((c) => c.sub === key).length

  const emptyCopy: Record<WorkTab, string> = {
    OPEN: "Nothing waiting to start. Win a quote and it'll show up here.",
    IN_PROGRESS: 'No jobs underway right now.',
    COMPLETED: 'Nothing marked complete and waiting on payment or review.',
  }

  return (
    <>
      <div className="page-head">
        <h2>Your work</h2>
        <button className="btn btn-amber" onClick={() => navigate('/home/requests')}>See requests</button>
      </div>
      <p className="page-intro">Jobs you've won. Start the work, keep the customer posted on progress, then mark completion and submit your review under “Your quotes” to get paid.</p>

      {error && <div className="msg err">{error}</div>}
      {actionError && <div className="msg err">{actionError}</div>}
      {jobs === null && !error && <div className="loading">Loading…</div>}

      {jobs !== null && jobs.length === 0 && (
        <div className="empty">
          <p>No assigned work yet. Win a quote and it'll show up here.</p>
          <button className="btn btn-amber" onClick={() => navigate('/home/requests')} style={{ marginTop: 12 }}>See requests to me</button>
        </div>
      )}

      {jobs !== null && jobs.length > 0 && (
        <div className="pipe-tabs" role="tablist">
          {WORK_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`pipe-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="pipe-count">{countOf(t.key)}</span>
            </button>
          ))}
        </div>
      )}

      {jobs !== null && jobs.length > 0 && inTab.length === 0 && (
        <div className="empty"><p>{emptyCopy[tab]}</p></div>
      )}

      {inTab.length > 0 && (
        <div className="job-list">
          {inTab.map(({ job, myQuote, awaitingCompletion, awaitingPayment, awaitingReview, markedComplete }) => {
            const busy = busyId === job.id
            const review = reviewByJob[job.id]
            const history = progressByJob[job.id] ?? []
            const latest = history[0]
            // "Mark Complete becomes available once staged progress sums to
            // 100%" (UAT Round 4 7). Progress entries are cumulative, so the
            // latest posted figure is the total.
            const atFullProgress = (latest?.percent ?? 0) >= 100
            // This provider's own Quote Request ID for the job (UAT Round 4 8.4),
            // so the same reference follows the work through to completion.
            const myRef = (job.targetProviders ?? []).find((t) => t.userId === user?.id)?.requestRef
            return (
              <div className="job-card" key={job.id}>
                <div className="job-top">
                  <span className="job-title">{job.title}</span>
                  <span className={`status status-${job.status.toLowerCase()}`}>{statusLabel(job.status)}</span>
                </div>
                <div className="job-meta">
                  <span className="chip">{CATEGORY_LABELS[job.category]}</span>
                  <span>{job.suburb}</span>
                  {job.timeFrame && <span>· {job.timeFrame}</span>}
                  <span className="job-date">· {formatDate(job.createdAt)}</span>
                </div>
                <p className="job-desc">{job.description}</p>
                <p className="job-assigned">Customer: <strong>{job.customerName}</strong></p>

                {latest && (
                  <ProgressBar
                    percent={latest.percent}
                    caption={`Last updated ${formatDateTime(latest.createdAt)}${latest.note ? ` · ${latest.note}` : ''}`}
                  />
                )}

                {history.length > 1 && (
                  <button
                    className="btn btn-ghost-dark btn-xs"
                    style={{ marginTop: 8 }}
                    onClick={() => setHistoryFor(historyFor === job.id ? null : job.id)}
                  >
                    {historyFor === job.id ? 'Hide progress history' : `Progress history (${history.length})`}
                  </button>
                )}

                {historyFor === job.id && (
                  <div className="prog-list">
                    {history.map((entry) => (
                      <div className="prog-row" key={entry.id}>
                        <span className="prog-row-pct">{entry.percent}%</span>
                        <span className="prog-row-note">{entry.note ?? '—'}</span>
                        <span className="prog-row-date">{formatDateTime(entry.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {latest && (job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
                  <ImageUploader
                    jobId={job.id}
                    kind="PROGRESS"
                    progressId={latest.id}
                    canUpload={job.status === 'IN_PROGRESS'}
                    label="Photos for the latest update"
                  />
                )}

                {(job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
                  <ImageUploader
                    jobId={job.id}
                    kind="COMPLETION"
                    canUpload={job.status === 'IN_PROGRESS'}
                    label="Completion photos"
                  />
                )}

                {/* Gone the moment the job is marked complete, not disabled —
                    UAT Round 7 §8 tightened Round 5's lock to removal. There
                    must be no control to attempt an entry through, so both the
                    form and the button that opens it disappear together. */}
                {job.status === 'IN_PROGRESS' && !markedComplete && progressOpenFor === job.id && (
                  <form className="prog-form" onSubmit={(e) => postProgress(e, job.id)}>
                    {progressError && <div className="msg err">{progressError}</div>}
                    <div className="row2">
                      <div>
                        <label>Percentage complete</label>
                        <input
                          type="number" min="0" max="100" step="1"
                          value={percent}
                          onChange={(e) => setPercent(e.target.value)}
                          placeholder="0–100"
                        />
                      </div>
                      <div>
                        <label>Note (optional)</label>
                        <input
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="What's done, what's next…"
                        />
                      </div>
                    </div>
                    <div className="quote-actions">
                      <button type="button" className="btn btn-ghost-dark btn-sm" onClick={() => setProgressOpenFor(null)}>Cancel</button>
                      <button type="submit" className="btn btn-amber btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Post update'}</button>
                    </div>
                  </form>
                )}

                {myRef && (
                  <div className="ref-list">
                    <span className="ref-item"><code className="req-ref">{myRef}</code></span>
                  </div>
                )}

                {/* Mark complete, available here as well as under Your Quotes
                    (UAT Round 4 7). Offered once the posted progress reaches
                    100%, and only for units still awaiting completion. */}
                {job.status === 'IN_PROGRESS' && myQuote && (atFullProgress || awaitingPayment || awaitingReview) && (
                  <div className="work-complete">
                    {myQuote.stages && myQuote.stages.length > 0 ? (
                      <>
                        <span className="work-complete-head">Mark each stage complete as you finish it</span>
                        {myQuote.stages.map((st) => (
                          <div className="stage-row" key={st.id}>
                            <span className="stage-name">{st.name} · {formatMoney(st.customerTotal)}</span>
                            {st.settlementStatus === 'PENDING_COMPLETION' ? (
                              <button
                                className="btn btn-green btn-sm"
                                disabled={busyId === st.id}
                                onClick={() => markComplete(myQuote.id, st.id)}
                              >
                                {busyId === st.id ? 'Marking…' : 'Mark complete'}
                              </button>
                            ) : (
                              <span className="stage-settle">{settlementLabel(st.settlementStatus ?? 'PENDING_COMPLETION')}</span>
                            )}
                          </div>
                        ))}
                      </>
                    ) : myQuote.settlementStatus === 'PENDING_COMPLETION' ? (
                      <button
                        className="btn btn-green btn-sm"
                        disabled={busyId === myQuote.id}
                        onClick={() => markComplete(myQuote.id, null)}
                      >
                        {busyId === myQuote.id ? 'Marking…' : 'Mark job complete'}
                      </button>
                    ) : (
                      <span className="stage-settle">{settlementLabel(myQuote.settlementStatus ?? 'PENDING_COMPLETION')}</span>
                    )}

                    {/* The payout is released by the post-job review, which lives
                        on Your Quotes. Without this the provider hits a dead end
                        here after being paid (UAT Round 5 3.1.4) - the same trap
                        that put Mark Complete on the wrong screen in Round 4. */}
                    {awaitingReview && myQuote && (
                      <div className="work-next">
                        <span>The customer has paid. Submit your post-job review to release the payout.</span>
                        <button className="btn btn-amber btn-sm" onClick={() => navigate(reviewLink(myQuote))}>
                          Review &amp; get paid
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {job.status === 'COMPLETED' && review && (
                  <div className="review-done">
                    <span className="review-label">Customer rating:</span> <Stars value={review.rating} />
                    {review.comment && <p className="review-comment">"{review.comment}"</p>}
                  </div>
                )}

                <div className="job-foot">
                  <span className="job-by">
                    {job.status === 'ACCEPTED' && 'Ready to start'}
                    {job.status === 'IN_PROGRESS' && awaitingReview && 'Paid by the customer — submit your review to get paid'}
                    {job.status === 'IN_PROGRESS' && !awaitingReview && awaitingPayment && 'Marked complete — awaiting customer payment'}
                    {job.status === 'IN_PROGRESS' && !awaitingReview && !awaitingPayment && (atFullProgress && awaitingCompletion
                      ? 'Progress complete — mark it complete to request payment'
                      : 'In progress — post progress as you go')}
                    {job.status === 'COMPLETED' && review === null && 'Completed 🎉 — awaiting review'}
                    {job.status === 'COMPLETED' && review && 'Completed 🎉'}
                    {job.status === 'CANCELLED' && 'Closed'}
                  </span>
                  <div className="job-actions">
                    {job.status === 'ACCEPTED' && (
                      <button className="btn btn-green btn-sm" disabled={busy} onClick={() => action(job.id, 'start')}>{busy ? 'Starting…' : 'Start work'}</button>
                    )}
                    {job.status === 'IN_PROGRESS' && !markedComplete && progressOpenFor !== job.id && (
                      <button className="btn btn-amber btn-sm" onClick={() => openProgress(job.id)}>
                        {latest ? 'Update progress' : 'Post progress'}
                      </button>
                    )}
                    {/* No Cancel here. UAT Round 7 §9: Cancel discards unsaved
                        form edits and nothing else. A job is ended by Decline
                        before acceptance, or by Dispute after it. */}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
