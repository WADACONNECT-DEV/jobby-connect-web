import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { byDate, byText, optionsFrom, useListView, usePersistedValue } from '../listView'
import { Stars } from '../components/Stars'
import { ProgressBar } from '../components/ProgressBar'
import { ImageUploader } from '../components/ImageUploader'
import { ClockIcon, EmptyState, GridIcon, InitialsAvatar, ListIcon, PageHead, PinIcon, SearchIcon } from '../components/PageParts'
import { ClampText, JobCompactCard, RefPill, StatusChip, SubTabs } from '../components/JobParts'
import { StateLine, ToolboxIcon, WorkSection } from '../components/WorkParts'
import {
  CATEGORY_LABELS,
  formatDate,
  formatDateTime,
  formatMoney,
  settlementLabel,
  type Job,
  type ProgressEntry,
  type ProviderQuote,
  type Review,
  type ServiceCategory,
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

  /* ---------- display only: search / filter / sort, List or Grid ---------- */

  // Search, industry and sort over the jobs already loaded for this sub-page.
  // Each sub-page keeps its own state, like the other tabs (display option).
  const list = useListView<(typeof classified)[number]>(`provider.work.${tab}`, jobs === null ? null : inTab, {
    search: (c) => `${c.job.title}\n${c.job.suburb}\n${c.job.jobAddress ?? ''}\n${c.job.customerName}\n${c.job.description}`,
    filters: [
      {
        key: 'category',
        label: 'industries',
        options: optionsFrom<(typeof classified)[number]>(
          (c) => c.job.category,
          (value) => CATEGORY_LABELS[value as ServiceCategory],
        ),
        match: (c, value) => c.job.category === value,
      },
    ],
    sorts: [
      { key: 'date', label: 'Date requested', compare: byDate<(typeof classified)[number]>((c) => c.job.createdAt), defaultDir: 'desc' },
      { key: 'title', label: 'Job title', compare: byText<(typeof classified)[number]>((c) => c.job.title), defaultDir: 'asc' },
      { key: 'suburb', label: 'Suburb', compare: byText<(typeof classified)[number]>((c) => c.job.suburb), defaultDir: 'asc' },
    ],
    defaultSortKey: 'date',
    defaultSortDir: 'desc',
  })
  const [layout, setLayout] = usePersistedValue<'list' | 'grid'>('provider.work.layout', 'list')

  /** Needs the provider: ready to start, progress at 100% but not marked, or paid and waiting on the review. */
  const needsYou = (c: (typeof classified)[number]) => {
    const latest = (progressByJob[c.job.id] ?? [])[0]
    return c.job.status === 'ACCEPTED'
      || (c.job.status === 'IN_PROGRESS' && c.awaitingReview)
      || (c.job.status === 'IN_PROGRESS' && (latest?.percent ?? 0) >= 100 && c.awaitingCompletion)
  }

  return (
    <div className="pg pw">
      <PageHead
        icon={<ToolboxIcon />}
        title="Your work"
        intro="Jobs you've won. Start the work, keep the customer posted on progress, then mark completion and submit your review under “Your quotes” to get paid."
        action={<button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/home/requests')}>See requests</button>}
      />

      {error && <div className="pg-error" role="alert">{error}</div>}
      {actionError && <div className="pg-error" role="alert">{actionError}</div>}
      {jobs === null && !error && <div className="pg-loading">Loading…</div>}

      {jobs !== null && jobs.length === 0 && (
        <EmptyState
          action={<button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/home/requests')}>See requests to me</button>}
        >
          No assigned work yet. Win a quote and it'll show up here.
        </EmptyState>
      )}

      {jobs !== null && jobs.length > 0 && (
        <SubTabs
          label="Your work by stage"
          active={tab}
          onChange={setTab}
          tabs={WORK_TABS.map((t) => ({
            key: t.key,
            label: t.label,
            count: countOf(t.key),
            attention: classified.some((c) => c.sub === t.key && needsYou(c)),
          }))}
        />
      )}

      {inTab.length > 0 && (
        <div className="pg-searchrow jb-filters">
          <div className="pg-field pg-field-grow">
            <label htmlFor="pw-search">Search your work</label>
            <span className="pg-input-ico">
              <SearchIcon />
              <input
                id="pw-search"
                type="search"
                value={list.view.search}
                placeholder="Title, suburb, address or customer"
                onChange={(e) => list.setSearch(e.target.value)}
              />
            </span>
          </div>
          {list.filters.map((f) => (
            <div className="pg-field" key={f.key}>
              <label htmlFor={`pw-${f.key}`}>Industry</label>
              <select id={`pw-${f.key}`} value={list.view.filters[f.key] ?? ''} onChange={(e) => list.setFilter(f.key, e.target.value)}>
                <option value="">All {f.label.toLowerCase()}</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div className="pg-field">
            <label htmlFor="pw-sort">Sort by</label>
            <span className="jb-sortbox">
              <select id="pw-sort" value={list.view.sortKey} onChange={(e) => list.setSort(e.target.value)}>
                {list.sorts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <button
                type="button"
                className="pg-dir"
                aria-label={list.view.sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
                title={list.view.sortDir === 'asc' ? 'Lowest first' : 'Highest first'}
                onClick={list.toggleDir}
              >
                {list.view.sortDir === 'asc' ? '↑' : '↓'}
              </button>
            </span>
          </div>
        </div>
      )}

      {jobs !== null && jobs.length > 0 && (
        <div className="pg-toolbar">
          {inTab.length > 0 ? (
            <h3 className="pg-count">
              {list.shown === list.total ? `${list.total} job${list.total === 1 ? '' : 's'}` : `${list.shown} of ${list.total} jobs`}
            </h3>
          ) : <span />}
          <div className="pg-toolbar-end">
            {inTab.length > 0 && list.dirty && (
              <button type="button" className="pg-link" onClick={list.clear}>Clear filters</button>
            )}
            <div className="pg-seg" role="group" aria-label="View">
              <button type="button" className={layout === 'list' ? 'on' : ''} aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>
                <ListIcon /> List
              </button>
              <button type="button" className={layout === 'grid' ? 'on' : ''} aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>
                <GridIcon /> Grid
              </button>
            </div>
          </div>
        </div>
      )}

      {jobs !== null && jobs.length > 0 && inTab.length === 0 && (
        <EmptyState>{emptyCopy[tab]}</EmptyState>
      )}

      {inTab.length > 0 && list.shown === 0 && (
        <EmptyState action={<button type="button" className="pg-btn pg-btn-ghost" onClick={list.clear}>Clear filters</button>}>
          No jobs match these filters.
        </EmptyState>
      )}

      {list.shown > 0 && (
        <div className={layout === 'grid' ? 'jb-grid' : 'jb-list'}>
          {list.visible.map((item) => {
            const { job, myQuote, awaitingCompletion, awaitingPayment, awaitingReview, markedComplete } = item
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
            const attention = needsYou(item)
            const canPostProgress = job.status === 'IN_PROGRESS' && !markedComplete

            // Grid: compact card until opened; opening shows the full card in its place.
            if (layout === 'grid' && !list.isExpanded(job.id) && progressOpenFor !== job.id) {
              const grid = job.status === 'IN_PROGRESS' && awaitingReview && myQuote
                ? { label: 'Review & get paid', run: () => navigate(reviewLink(myQuote)) }
                : job.status === 'ACCEPTED'
                  ? { label: 'Open to start', run: () => list.setExpanded(job.id, true) }
                  : job.status === 'IN_PROGRESS' && atFullProgress && awaitingCompletion
                    ? { label: 'Open to mark complete', run: () => list.setExpanded(job.id, true) }
                    : canPostProgress
                      ? { label: latest ? 'Update progress' : 'Post progress', run: () => { list.setExpanded(job.id, true); openProgress(job.id) } }
                      : { label: 'View details', run: () => list.setExpanded(job.id, true) }
              return (
                <JobCompactCard
                  key={job.id}
                  title={job.title}
                  status={job.status}
                  date={formatDate(job.createdAt)}
                  industry={CATEGORY_LABELS[job.category]}
                  suburb={job.suburb}
                  refs={myRef ? [{ value: myRef, owner: 'You' }] : []}
                  assignedTo={job.customerName}
                  sentCount={0}
                  progress={latest ? latest.percent : null}
                  attention={attention}
                  actionLabel={grid.label}
                  onAction={grid.run}
                  onOpen={() => list.setExpanded(job.id, true)}
                />
              )
            }

            return (
              <article
                key={job.id}
                className={`jb-card pw-card${attention ? ' is-attention' : ''}${layout === 'grid' ? ' jb-span' : ''}`}
              >
                {layout === 'grid' && (
                  <button
                    type="button"
                    className="pg-link jb-less"
                    aria-expanded="true"
                    onClick={() => { list.setExpanded(job.id, false); if (progressOpenFor === job.id) setProgressOpenFor(null) }}
                  >
                    Show less
                  </button>
                )}

                <div className="pw-head">
                  <div className="pw-head-main">
                    <div className="pw-title-row">
                      <h3 className="pw-title">{job.title}</h3>
                      <StatusChip status={job.status} />
                    </div>
                    <div className="pr-meta">
                      <span className="pg-chip">{CATEGORY_LABELS[job.category]}</span>
                      <span className="pr-meta-item"><PinIcon />{job.suburb}</span>
                      {job.timeFrame && <span className="pr-meta-item"><ClockIcon />{job.timeFrame}</span>}
                      {myRef && <RefPill value={myRef} />}
                    </div>
                    <p className="pw-who">
                      <InitialsAvatar name={job.customerName} size="sm" />
                      <span><strong>{job.customerName}</strong></span>
                      <span className="pw-muted">· requested {formatDate(job.createdAt)}</span>
                    </p>
                    {job.jobAddress && (
                      <p className="pw-address"><span className="pw-muted">Job address:</span> {job.jobAddress}</p>
                    )}
                  </div>
                  <div className="pw-head-act">
                    {job.status === 'ACCEPTED' && (
                      <button type="button" className="pg-btn pg-btn-yellow" disabled={busy} onClick={() => action(job.id, 'start')}>{busy ? 'Starting…' : 'Start work'}</button>
                    )}
                    {canPostProgress && progressOpenFor !== job.id && (
                      <button type="button" className="pg-btn pg-btn-yellow" onClick={() => openProgress(job.id)}>
                        {latest ? 'Update progress' : 'Post progress'}
                      </button>
                    )}
                    {/* No Cancel here. UAT Round 7 §9: Cancel discards unsaved
                        form edits and nothing else. A job is ended by Decline
                        before acceptance, or by Dispute after it. */}
                  </div>
                </div>

                <StateLine attention={attention}>
                  {job.status === 'ACCEPTED' && 'Ready to start'}
                  {job.status === 'IN_PROGRESS' && awaitingReview && 'Paid by the customer — submit your review to get paid'}
                  {job.status === 'IN_PROGRESS' && !awaitingReview && awaitingPayment && 'Marked complete — awaiting customer payment'}
                  {job.status === 'IN_PROGRESS' && !awaitingReview && !awaitingPayment && (atFullProgress && awaitingCompletion
                    ? 'Progress complete — mark it complete to request payment'
                    : 'In progress — post progress as you go')}
                  {job.status === 'COMPLETED' && review === null && 'Completed 🎉 — awaiting review'}
                  {job.status === 'COMPLETED' && review && 'Completed 🎉'}
                  {job.status === 'CANCELLED' && 'Closed'}
                </StateLine>

                <ClampText text={job.description} />

                {(latest || history.length > 1) && (
                  <WorkSection title="Progress">
                    {latest && (
                      <ProgressBar
                        percent={latest.percent}
                        caption={`Last updated ${formatDateTime(latest.createdAt)}${latest.note ? ` · ${latest.note}` : ''}`}
                      />
                    )}

                    {history.length > 1 && (
                      <button
                        type="button"
                        className="pg-link pw-history-toggle"
                        aria-expanded={historyFor === job.id}
                        onClick={() => setHistoryFor(historyFor === job.id ? null : job.id)}
                      >
                        {historyFor === job.id ? 'Hide progress history' : `Progress history (${history.length})`}
                      </button>
                    )}

                    {historyFor === job.id && (
                      <ol className="pw-history">
                        {history.map((entry) => (
                          <li key={entry.id}>
                            <span className="pw-history-pct">{entry.percent}%</span>
                            <span className="pw-history-note">{entry.note ?? '—'}</span>
                            <span className="pw-history-date">{formatDateTime(entry.createdAt)}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </WorkSection>
                )}

                {/* Gone the moment the job is marked complete, not disabled —
                    UAT Round 7 §8 tightened Round 5's lock to removal. There
                    must be no control to attempt an entry through, so both the
                    form and the button that opens it disappear together. */}
                {job.status === 'IN_PROGRESS' && !markedComplete && progressOpenFor === job.id && (
                  <form className="pw-progress-form" onSubmit={(e) => postProgress(e, job.id)}>
                    <h4>Update progress</h4>
                    {progressError && <div className="pg-error" role="alert">{progressError}</div>}
                    <div className="pw-pair">
                      <div className="pg-field">
                        <label htmlFor={`pw-pct-${job.id}`}>Percentage complete</label>
                        <span className="pq-pct">
                          <input
                            id={`pw-pct-${job.id}`}
                            type="number" min="0" max="100" step="1"
                            value={percent}
                            onChange={(e) => setPercent(e.target.value)}
                            placeholder="0–100"
                          />
                          <span aria-hidden="true">%</span>
                        </span>
                      </div>
                      <div className="pg-field">
                        <label htmlFor={`pw-note-${job.id}`}>Note (optional)</label>
                        <input
                          id={`pw-note-${job.id}`}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="What's done, what's next…"
                        />
                      </div>
                    </div>
                    <p className="pw-hint">Add photos to an update after posting it — they attach to your latest update below.</p>
                    <div className="pw-actions">
                      <button type="button" className="pg-btn pg-btn-ghost" onClick={() => setProgressOpenFor(null)}>Cancel</button>
                      <button type="submit" className="pg-btn pg-btn-yellow" disabled={busy}>{busy ? 'Saving…' : 'Post update'}</button>
                    </div>
                  </form>
                )}

                {(job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
                  <div className="pw-photos">
                    {latest && (
                      <ImageUploader
                        jobId={job.id}
                        kind="PROGRESS"
                        progressId={latest.id}
                        canUpload={job.status === 'IN_PROGRESS'}
                        label="Photos for the latest update"
                      />
                    )}
                    <ImageUploader
                      jobId={job.id}
                      kind="COMPLETION"
                      canUpload={job.status === 'IN_PROGRESS'}
                      label="Completion photos"
                    />
                  </div>
                )}

                {/* Mark complete, available here as well as under Your Quotes
                    (UAT Round 4 7). Offered once the posted progress reaches
                    100%, and only for units still awaiting completion. */}
                {job.status === 'IN_PROGRESS' && myQuote && (atFullProgress || awaitingPayment || awaitingReview) && (
                  <WorkSection title="Completion">
                    <div className="pw-complete">
                    {myQuote.stages && myQuote.stages.length > 0 ? (
                      <>
                        <span className="pw-complete-head">Mark each stage complete as you finish it</span>
                        {myQuote.stages.map((st) => (
                          <div className="pw-stage" key={st.id}>
                            <span className="pw-stage-name">{st.name} · {formatMoney(st.customerTotal)}</span>
                            {st.settlementStatus === 'PENDING_COMPLETION' ? (
                              <button
                                className="pg-btn pg-btn-navy pk-sm"
                                disabled={busyId === st.id}
                                onClick={() => markComplete(myQuote.id, st.id)}
                              >
                                {busyId === st.id ? 'Marking…' : 'Mark complete'}
                              </button>
                            ) : (
                              <span className="pk-settle">{settlementLabel(st.settlementStatus ?? 'PENDING_COMPLETION')}</span>
                            )}
                          </div>
                        ))}
                      </>
                    ) : myQuote.settlementStatus === 'PENDING_COMPLETION' ? (
                      <button
                        className="pg-btn pg-btn-navy"
                        disabled={busyId === myQuote.id}
                        onClick={() => markComplete(myQuote.id, null)}
                      >
                        {busyId === myQuote.id ? 'Marking…' : 'Mark job complete'}
                      </button>
                    ) : (
                      <span className="pk-settle">{settlementLabel(myQuote.settlementStatus ?? 'PENDING_COMPLETION')}</span>
                    )}

                    {/* The payout is released by the post-job review, which lives
                        on Your Quotes. Without this the provider hits a dead end
                        here after being paid (UAT Round 5 3.1.4) - the same trap
                        that put Mark Complete on the wrong screen in Round 4. */}
                    {awaitingReview && myQuote && (
                      <div className="pk-reason pw-next">
                        <span>The customer has paid. Submit your post-job review to release the payout.</span>
                        <button type="button" className="pg-btn pg-btn-yellow pk-sm" onClick={() => navigate(reviewLink(myQuote))}>
                          Review &amp; get paid
                        </button>
                      </div>
                    )}
                    </div>
                  </WorkSection>
                )}

                {job.status === 'COMPLETED' && review && (
                  <div className="pw-rating">
                    <span className="pw-muted">Customer rating:</span> <Stars value={review.rating} />
                    {review.comment && <p className="pw-rating-comment">"{review.comment}"</p>}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
