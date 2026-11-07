import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { byDate, byText, optionsFrom, useListView, usePersistedValue } from '../listView'
import { initialsOf } from '../components/mates/MateCard'
import { Stars } from '../components/Stars'
import { ProgressBar } from '../components/ProgressBar'
import { ImageUploader } from '../components/ImageUploader'
import {
  industryOf,
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
   *
   * Quote and stage ids are typed string | null because a quote preview has no
   * id yet. A saved quote always has one; if a null ever reaches here there is
   * nothing to complete, so it does nothing.
   */
  async function markComplete(quoteId: string | null, stageId: string | null) {
    if (!quoteId) return
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

  // List or Grid, remembered (redesign step 10). List is the default.
  const [layout, setLayout] = usePersistedValue<'list' | 'grid'>('provider.work.layout', 'list')

  // Search, industry and sort within the open sub-tab (redesign step 10).
  // Narrows what is shown only; the sub-tab grouping above is unchanged.
  type Row = (typeof classified)[number]
  const list = useListView<Row>(`provider.work.${tab}`, jobs === null ? null : inTab, {
    search: (c) => `${c.job.title} ${c.job.suburb} ${c.job.customerName} ${c.job.jobAddress ?? ''}`,
    filters: [
      {
        key: 'category',
        label: 'industries',
        options: optionsFrom<Row>(
          // By industry name (step J1); older jobs use their category's label.
          (c) => industryOf(c.job),
        ),
        match: (c, value) => industryOf(c.job) === value,
      },
    ],
    sorts: [
      { key: 'requested', label: 'Date requested', compare: byDate<Row>((c) => c.job.createdAt), defaultDir: 'desc' },
      { key: 'title', label: 'Job title', compare: byText<Row>((c) => c.job.title), defaultDir: 'asc' },
      { key: 'customer', label: 'Customer', compare: byText<Row>((c) => c.job.customerName), defaultDir: 'asc' },
      { key: 'suburb', label: 'Suburb', compare: byText<Row>((c) => c.job.suburb), defaultDir: 'asc' },
    ],
    defaultSortKey: 'requested',
    defaultSortDir: 'desc',
  })
  const industries = list.filters.find((f) => f.key === 'category')?.options ?? []
  const countOf = (key: WorkTab) => classified.filter((c) => c.sub === key).length

  const emptyCopy: Record<WorkTab, string> = {
    OPEN: "Nothing waiting to start. Win a quote and it'll show up here.",
    IN_PROGRESS: 'No jobs underway right now.',
    COMPLETED: 'Nothing marked complete and waiting on payment or review.',
  }

  return (
    <div className="mt pr yw">
      <div className="mt-head">
        <div className="mt-head-copy">
          <ToolboxIcon />
          <div>
            <h2 className="mt-title">Your work</h2>
            <p className="mt-sub">Jobs you've won. Start the work, keep the customer posted on progress, then mark completion and submit your review under “Your quotes” to get paid.</p>
          </div>
        </div>
      </div>

      {error && <div className="msg err">{error}</div>}
      {actionError && <div className="jr-msg is-err">{actionError}</div>}
      {jobs === null && !error && <div className="loading">Loading…</div>}

      {jobs !== null && jobs.length === 0 && (
        <div className="mt-empty">
          <p>No assigned work yet. Win a quote and it'll show up here.</p>
          <button className="mt-continue" onClick={() => navigate('/home/requests')}>See requests to me</button>
        </div>
      )}

      {jobs !== null && jobs.length > 0 && (
        <div className="mj-subtabs" role="tablist" aria-label="Your work">
          {WORK_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`mj-subtab${tab === t.key ? ' is-on' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="mj-badge">{countOf(t.key)}</span>
            </button>
          ))}
        </div>
      )}

      {inTab.length > 0 && (
        <div className="mt-search pr-filters yw-filters">
          <label className="mt-field is-wide">
            <span>SEARCH JOBS</span>
            <span className="mt-input">
              <SearchIcon />
              <input type="search" value={list.view.search} placeholder="Title, suburb, customer or address"
                onChange={(e) => list.setSearch(e.target.value)} />
            </span>
          </label>
          <label className="mt-field">
            <span>INDUSTRY</span>
            <select value={list.view.filters.category ?? ''} onChange={(e) => list.setFilter('category', e.target.value)}>
              <option value="">All industries</option>
              {industries.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="mt-field">
            <span>SORT BY</span>
            <select value={list.view.sortKey} onChange={(e) => list.setSort(e.target.value)}>
              {list.sorts.map((so) => <option key={so.key} value={so.key}>{so.label}</option>)}
            </select>
          </label>
          <div className="mt-view pr-view" role="group" aria-label="View">
            <button type="button" className={layout === 'list' ? 'is-on' : ''} aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>List</button>
            <button type="button" className={layout === 'grid' ? 'is-on' : ''} aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>Grid</button>
          </div>
        </div>
      )}

      {inTab.length > 0 && (
        <h3 className="mt-count">{list.shown === list.total ? `${list.total} job${list.total === 1 ? '' : 's'}` : `${list.shown} of ${list.total} jobs`}</h3>
      )}

      {jobs !== null && jobs.length > 0 && inTab.length === 0 && (
        <div className="mt-empty"><p>{emptyCopy[tab]}</p></div>
      )}

      {inTab.length > 0 && list.shown === 0 && (
        <div className="mt-empty">
          <p>No jobs match these filters.</p>
          <button className="mt-btn-ghost" onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {list.shown > 0 && (
        <div className={layout === 'grid' ? 'pr-grid' : 'pr-list'}>
          {list.visible.map(({ job, myQuote, awaitingCompletion, awaitingPayment, awaitingReview, markedComplete }) => {
            const busy = busyId === job.id
            const review = reviewByJob[job.id]
            const history = progressByJob[job.id] ?? []
            const latest = history[0]
            const atFullProgress = (latest?.percent ?? 0) >= 100
            const myRef = (job.targetProviders ?? []).find((t) => t.userId === user?.id)?.requestRef
            const panelOpen = progressOpenFor === job.id || historyFor === job.id
            // Yellow border when the next move is the provider's: review to
            // release payment, or progress at 100% and not yet marked complete.
            const yourMove = job.status === 'IN_PROGRESS' && (awaitingReview || (atFullProgress && awaitingCompletion))
            return (
              <article className={`pr-card pr-${layout} yw-card${yourMove ? ' is-action' : ''}${panelOpen ? ' is-open' : ''}`} key={job.id}>
                <div className="yq-top">
                  <h3 className="pr-title">{job.title}</h3>
                  <span className={`yq-status is-${job.status.toLowerCase()}`}>{statusLabel(job.status)}</span>
                  {myRef && <span className="mj-ref"><code>{myRef}</code></span>}
                </div>

                <div className="yq-cust">
                  <span className="mc-avatar yq-avatar" aria-hidden="true">{initialsOf(job.customerName)}</span>
                  <span>{job.customerName}</span>
                </div>

                <div className="pr-meta">
                  <span className="mc-chip">{industryOf(job)}</span>
                  <span className="mc-line"><PinIcon /> {job.suburb}</span>
                  {job.timeFrame && <span className="pr-sub">{job.timeFrame}</span>}
                  <span className="pr-sub">Requested {formatDate(job.createdAt)}</span>
                </div>
                {job.jobAddress && <p className="yw-addr"><span className="pr-amt-label">Job address</span> {job.jobAddress}</p>}
                <p className="pr-desc">{job.description}</p>

                {latest && (
                  <ProgressBar
                    percent={latest.percent}
                    caption={`Last updated ${formatDateTime(latest.createdAt)}${latest.note ? ` · ${latest.note}` : ''}`}
                  />
                )}

                {history.length > 1 && (
                  <button
                    className="pr-link yq-toggle"
                    onClick={() => setHistoryFor(historyFor === job.id ? null : job.id)}
                    aria-expanded={historyFor === job.id}
                  >
                    {historyFor === job.id ? 'Hide progress history' : `Progress history (${history.length})`}
                  </button>
                )}

                {historyFor === job.id && (
                  <div className="yw-history">
                    {history.map((entry) => (
                      <div className="yw-hist-row" key={entry.id}>
                        <span className="yw-hist-pct">{entry.percent}%</span>
                        <span className="yw-hist-note">{entry.note ?? '—'}</span>
                        <span className="yw-hist-date">{formatDateTime(entry.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Gone the moment the job is marked complete, not disabled —
                    UAT Round 7 §8 tightened Round 5's lock to removal. There
                    must be no control to attempt an entry through, so both the
                    form and the button that opens it disappear together. */}
                {job.status === 'IN_PROGRESS' && !markedComplete && progressOpenFor === job.id && (
                  <form className="pr-panel yw-progress" onSubmit={(e) => postProgress(e, job.id)}>
                    <h4>Update progress</h4>
                    {progressError && <div className="jr-msg is-err">{progressError}</div>}
                    <div className="pr-two yw-two">
                      <label className="mt-field">
                        <span>PERCENTAGE COMPLETE</span>
                        <input
                          type="number" min="0" max="100" step="1"
                          value={percent}
                          onChange={(e) => setPercent(e.target.value)}
                          placeholder="0–100"
                        />
                      </label>
                      <label className="mt-field">
                        <span>NOTE (OPTIONAL)</span>
                        <input
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="What's done, what's next…"
                        />
                      </label>
                    </div>
                    <div className="pr-panel-actions">
                      <button type="button" className="mt-btn-ghost" onClick={() => setProgressOpenFor(null)}>Cancel</button>
                      <button type="submit" className="mt-continue" disabled={busy}>{busy ? 'Saving…' : 'Post update'}</button>
                    </div>
                  </form>
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

                {/* The customer's own request photos, view only (handoff Part L).
                    Renders nothing when the customer sent none. */}
                <ImageUploader jobId={job.id} kind="REQUEST" canUpload={false} label="Photos the customer sent" />

                {/* Mark complete, available here as well as under Your Quotes
                    (UAT Round 4 7). Offered once the posted progress reaches
                    100%, and only for units still awaiting completion. */}
                {job.status === 'IN_PROGRESS' && myQuote && (atFullProgress || awaitingPayment || awaitingReview) && (
                  <div className="yw-complete">
                    {myQuote.stages && myQuote.stages.length > 0 ? (
                      <>
                        <span className="yw-complete-head">Mark each stage complete as you finish it</span>
                        {myQuote.stages.map((st) => (
                          <div className="yw-stage" key={st.id}>
                            <span className="yw-stage-name">{st.name} · {formatMoney(st.customerTotal)}</span>
                            {st.settlementStatus === 'PENDING_COMPLETION' ? (
                              <button
                                className="yq-btn is-complete"
                                disabled={busyId === st.id}
                                onClick={() => markComplete(myQuote.id, st.id)}
                              >
                                {busyId === st.id ? 'Marking…' : 'Mark complete'}
                              </button>
                            ) : (
                              <span className="yq-settle">{settlementLabel(st.settlementStatus ?? 'PENDING_COMPLETION')}</span>
                            )}
                          </div>
                        ))}
                      </>
                    ) : myQuote.settlementStatus === 'PENDING_COMPLETION' ? (
                      <button
                        className="yq-btn is-complete"
                        disabled={busyId === myQuote.id}
                        onClick={() => markComplete(myQuote.id, null)}
                      >
                        {busyId === myQuote.id ? 'Marking…' : 'Mark job complete'}
                      </button>
                    ) : (
                      <span className="yq-settle">{settlementLabel(myQuote.settlementStatus ?? 'PENDING_COMPLETION')}</span>
                    )}

                    {/* The payout is released by the post-job review, which lives
                        on Your Quotes. Without this the provider hits a dead end
                        here after being paid (UAT Round 5 3.1.4) - the same trap
                        that put Mark Complete on the wrong screen in Round 4. */}
                    {awaitingReview && myQuote && (
                      <div className="yw-next">
                        <span>The customer has paid. Submit your post-job review to release the payout.</span>
                        <button className="mt-continue" onClick={() => navigate(reviewLink(myQuote))}>
                          Review &amp; get paid
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {job.status === 'COMPLETED' && review && (
                  <div className="yw-rating">
                    <span className="pr-amt-label">Customer rating</span> <Stars value={review.rating} />
                    {review.comment && <p className="pr-desc">"{review.comment}"</p>}
                  </div>
                )}

                <div className="yw-foot">
                  <span className="yw-state">
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
                  <div className="pr-actions">
                    {job.status === 'ACCEPTED' && (
                      <button className="mt-continue" disabled={busy} onClick={() => action(job.id, 'start')}>{busy ? 'Starting…' : 'Start work'}</button>
                    )}
                    {job.status === 'IN_PROGRESS' && !markedComplete && progressOpenFor !== job.id && (
                      <button className="mt-continue" onClick={() => openProgress(job.id)}>
                        {latest ? 'Update progress' : 'Post progress'}
                      </button>
                    )}
                    {/* No Cancel here. UAT Round 7 §9: Cancel discards unsaved
                        form edits and nothing else. A job is ended by Decline
                        before acceptance, or by Dispute after it. */}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------- icons (decorative) ---------- */

function ToolboxIcon() {
  return (
    <svg aria-hidden="true" className="mt-head-ico" width="46" height="46" viewBox="0 0 24 24" fill="none"
      stroke="#0B2038" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="2" /><path d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8" />
      <path d="M3 13h18" /><path d="M10 13v2h4v-2" stroke="#D9A400" strokeWidth="2.2" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6E86"
      strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" /></svg>
  )
}
function PinIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="#0B2038">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  )
}
