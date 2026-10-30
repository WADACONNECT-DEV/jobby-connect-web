import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Stars, StarInput } from '../components/Stars'
import { ClipboardIcon, ClockIcon, EmptyState, GridIcon, InitialsAvatar, ListIcon, PageHead, PinIcon, SearchIcon } from '../components/PageParts'
import { ClampText, JobCompactCard, RefPill, SentTo, StatusChip, SubTabs } from '../components/JobParts'
import { ProgressBar } from '../components/ProgressBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ImageUploader } from '../components/ImageUploader'
import { byDate, byText, optionsFrom, useListView, usePersistedValue } from '../listView'
import { CATEGORY_LABELS, METHOD_LABELS, SIMULATION_LABELS, formatDate, formatDateTime, formatMoney, statusLabel, settlementLabel, type CustomerQuote, type Job, type PaymentCapabilities, type PaymentMethod, type PaymentResult, type PaymentSimulation, type ProgressEntry, type Review, type ServiceCategory, type SettlementStatus, type Wallet } from '../types'

/**
 * Your Requests & Jobs, split into status sub-pages (UAT Round 7 §7).
 *
 * Presentation only — no status value, transition or count changes. The same
 * jobs in the same states, grouped onto four pages instead of one list.
 *
 * "Not Proceeded" is a display label, not a job status. Round 2 settled that
 * there is no Cancelled status in this product, and Round 7 §7 restates it:
 * this page groups requests that ended before acceptance with jobs whose
 * Dispute has resolved to Closed, and calls the group something a customer
 * can read.
 */
const JOBS_TABS = [
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'NOT_PROCEEDED', label: 'Not Proceeded' },
] as const

type JobsTab = (typeof JOBS_TABS)[number]['key']

const EMPTY_COPY: Record<JobsTab, string> = {
  OPEN: 'No open requests. Find a provider and ask for a quote.',
  IN_PROGRESS: 'Nothing underway right now.',
  COMPLETED: 'Nothing waiting on payment or a review.',
  NOT_PROCEEDED: "Nothing here — requests that didn't go ahead would appear on this page.",
}

/** Review button label by stars — Functional Spec §2.8, exactly. Display only:
 *  the button submits the same review whatever it says. */
const REVIEW_LABELS: Record<number, string> = {
  5: 'Great Job Mate',
  4: 'Good Job Mate',
  3: 'Thanks for the Job',
  2: 'Do Better Next Time Mate',
  1: 'Not Up to Standard',
}

/**
 * Which sub-page a job belongs on.
 *
 * Completion is read from the accepted quote's settlement units rather than
 * from job.status, because a job stays IN_PROGRESS until the last unit is paid
 * out — so "marked complete, waiting to be paid" would otherwise read as still
 * in progress. A unit that has left PENDING_COMPLETION is one the provider has
 * actually marked.
 *
 * With no quotes loaded yet the job stays under In Progress and moves when they
 * arrive, rather than flickering into Completed on incomplete data.
 */
function subPageOf(job: Job, quotes: CustomerQuote[] | undefined): JobsTab {
  // Historical only — nothing can produce this status any more (Round 7 §9).
  // Dispute-Closed jobs will join it here once Dispute is built (spec §5).
  if (job.status === 'CANCELLED') return 'NOT_PROCEEDED'

  if (job.status === 'OPEN' || job.status === 'QUOTED') {
    const targets = job.targetProviders ?? []
    const everyoneEnded = targets.length > 0
      && targets.every((t) => t.status === 'DECLINED' || t.status === 'EXPIRED')
    const pastExpiry = job.expiresAt !== null
      && new Date(job.expiresAt).getTime() < Date.now()
    return (everyoneEnded || pastExpiry) ? 'NOT_PROCEEDED' : 'OPEN'
  }

  const accepted = (quotes ?? []).find((q) => q.status === 'ACCEPTED')
  const units: (SettlementStatus | null)[] = accepted
    ? (accepted.stages && accepted.stages.length > 0
        ? accepted.stages.map((st) => st.settlementStatus)
        : [accepted.settlementStatus])
    : []
  const markedComplete = job.status === 'COMPLETED'
    || (units.length > 0 && !units.some((u) => u === 'PENDING_COMPLETION'))

  return markedComplete ? 'COMPLETED' : 'IN_PROGRESS'
}

export default function MyJobs() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [error, setError] = useState('')

  const [quotesByJob, setQuotesByJob] = useState<Record<string, CustomerQuote[]>>({})
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [actionError, setActionError] = useState('')
  const [pendingAccept, setPendingAccept] = useState<{ jobId: string; quoteId: string; waiting: number } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pointsBalance, setPointsBalance] = useState<number>(0)
  const [redeemFor, setRedeemFor] = useState<string | null>(null)
  const [redeemAmt, setRedeemAmt] = useState('')

  // Checkout: which rail to charge, and (Round 1 only) a forced outcome so each
  // method's failure path can be demonstrated.
  const [caps, setCaps] = useState<PaymentCapabilities | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('CARD')
  const [simulate, setSimulate] = useState<PaymentSimulation>('SUCCESS')

  const [progressByJob, setProgressByJob] = useState<Record<string, ProgressEntry[]>>({})
  const [historyFor, setHistoryFor] = useState<string | null>(null)

  const [reviewByJob, setReviewByJob] = useState<Record<string, Review | null>>({})
  const [reviewOpenFor, setReviewOpenFor] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')

  // Which sub-page is open survives leaving the tab and coming back
  // (Round 1 §5.3, restated in Round 7 check 3.3).
  const [tab, setTab] = usePersistedValue<JobsTab>('customer.jobs.tab', 'OPEN')

  // List / Grid, remembered the same way as Your Jobby Mates. Display only.
  const [layout, setLayout] = usePersistedValue<'list' | 'grid'>('customer.jobs.layout', 'list')

  const inTab = (jobs ?? []).filter((job) => subPageOf(job, quotesByJob[job.id]) === tab)
  const countOf = (key: JobsTab) =>
    (jobs ?? []).filter((job) => subPageOf(job, quotesByJob[job.id]) === key).length

  // Money outstanding anywhere, so the Completed pill can say so from whichever
  // sub-page the customer happens to be on. Without this the Pay button is one
  // tab away and invisible — the same trap as Round 5 item 1, reintroduced by
  // splitting the list.
  const owingCount = (jobs ?? []).filter((job) =>
    (quotesByJob[job.id] ?? []).some((q) => q.settlementStatus === 'PENDING_PAYMENT'
      || (q.stages ?? []).some((st) => st.settlementStatus === 'PENDING_PAYMENT'))).length

  // Filter / sort / expand state for this box. Held outside the component so
  // it survives leaving the page and coming Back (UAT §5.3).
  //
  // One store across all four sub-pages, deliberately. Per-tab stores would
  // give each page its own expanded set, and the auto-expand that makes the
  // Pay button reachable (Round 5 item 1) writes into whichever store is
  // active at load time — which would silently stop working.
  const list = useListView<Job>('customer.jobs', inTab, {
    search: (job) => `${job.title} ${job.description} ${job.suburb} ${job.providerName ?? ''}`,
    filters: [
      {
        key: 'status',
        label: 'statuses',
        options: optionsFrom<Job>((job) => job.status, (value) => statusLabel(value as Job['status'])),
        match: (job, value) => job.status === value,
      },
      {
        key: 'category',
        label: 'industries',
        options: optionsFrom<Job>((job) => job.category, (value) => CATEGORY_LABELS[value as ServiceCategory]),
        match: (job, value) => job.category === value,
      },
    ],
    sorts: [
      { key: 'created', label: 'Date requested', compare: byDate<Job>((job) => job.createdAt), defaultDir: 'desc' },
      { key: 'title', label: 'Title', compare: byText<Job>((job) => job.title), defaultDir: 'asc' },
      { key: 'status', label: 'Status', compare: byText<Job>((job) => job.status), defaultDir: 'asc' },
    ],
    defaultSortKey: 'created',
    defaultSortDir: 'desc',
  })

  function loadJobs() {
    return api<Job[]>('/jobs/mine', 'GET')
      .then((js) => {
        setJobs(js)
        js.filter((j) => j.status === 'COMPLETED').forEach((j) => {
          api<Review>(`/jobs/${j.id}/review`, 'GET')
            .then((rev) => setReviewByJob((prev) => ({ ...prev, [j.id]: rev })))
            .catch(() => setReviewByJob((prev) => ({ ...prev, [j.id]: null })))
        })
        // BUGFIX: quotes were only ever fetched by expanding the quotes panel,
        // and that panel was only offered while a job was still OPEN. Once the
        // customer accepted a quote there was no way to load it again — so the
        // Pay bar, which needs the quote's settlement status, could never appear
        // and payment was unreachable. Load them for every job past OPEN.
        js.filter((j) => j.status !== 'OPEN').forEach((j) => {
          api<CustomerQuote[]>(`/jobs/${j.id}/quotes`, 'GET')
            .then((qs) => {
              setQuotesByJob((prev) => ({ ...prev, [j.id]: qs }))
              // BUGFIX (UAT Round 5 3.1.2): the "Pay with" method selector sits
              // outside this panel, but every actual Pay button lives INSIDE it.
              // With the panel collapsed the customer saw a payment control with
              // nothing to press - which is what "payment option is not
              // available" was describing. Open it whenever money is due.
              const owing = qs.some((q) => q.settlementStatus === 'PENDING_PAYMENT'
                || (q.stages ?? []).some((st) => st.settlementStatus === 'PENDING_PAYMENT'))
              if (owing) list.setExpanded(j.id, true)
            })
            .catch(() => { /* leave it unset; the panel shows its own error */ })
        })
        // Progress the provider has posted, so the customer sees the same figure.
        js.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'COMPLETED').forEach((j) => {
          api<ProgressEntry[]>(`/jobs/${j.id}/progress`, 'GET')
            .then((entries) => setProgressByJob((prev) => ({ ...prev, [j.id]: entries })))
            .catch(() => setProgressByJob((prev) => ({ ...prev, [j.id]: [] })))
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your requests.'))
  }

  // The Mate Points balance is needed up front: without it the "Use points"
  // option never appears until after a payment has already been made.
  function loadBalance() {
    return api<Wallet>('/points/wallet', 'GET')
      .then((w) => setPointsBalance(w.balance))
      .catch(() => setPointsBalance(0))
  }

  useEffect(() => {
    loadJobs()
    loadBalance()
    api<PaymentCapabilities>('/payments/capabilities', 'GET')
      .then((c) => {
        setCaps(c)
        if (c.methods.length > 0) setMethod(c.methods[0])
      })
      .catch(() => setCaps(null))
  }, [])

  async function toggleQuotes(jobId: string) {
    setActionError('')
    if (list.isExpanded(jobId)) { list.setExpanded(jobId, false); return }
    list.setExpanded(jobId, true)
    if (!quotesByJob[jobId]) {
      setLoadingQuotes(true)
      try {
        const qs = await api<CustomerQuote[]>(`/jobs/${jobId}/quotes`, 'GET')
        setQuotesByJob((prev) => ({ ...prev, [jobId]: qs }))
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not load quotes.')
      } finally { setLoadingQuotes(false) }
    }
  }

  async function pay(jobId: string, quoteId: string, stageId: string | null, redeem?: number) {
    setBusyId(stageId ?? quoteId)
    try {
      await api<PaymentResult>('/payments', 'POST', {
        quoteId, stageId, method,
        redeemPoints: redeem && redeem > 0 ? redeem : null,
        simulate: caps?.simulationEnabled ? simulate : null,
      })
      const [qs, w] = await Promise.all([
        api<CustomerQuote[]>(`/jobs/${jobId}/quotes`, 'GET'),
        api<Wallet>('/points/wallet', 'GET'),
      ])
      setQuotesByJob((prev) => ({ ...prev, [jobId]: qs }))
      setPointsBalance(w.balance)
      setRedeemFor(null); setRedeemAmt('')
    } catch (e) {
      // The gateway's reason matters here - "insufficient funds" and "timeout"
      // need different actions from the customer.
      setActionError(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setBusyId(null)
    }
  }

  function maxRedeem(due: number) {
    return Math.min(pointsBalance, due)
  }

  /**
   * Accepting while other invited providers haven't replied yet (UAT Round 4 6).
   * The customer is allowed to, but is told what they're giving up first.
   */
  function askAccept(job: Job, quoteId: string) {
    const stillPending = (job.targetProviders ?? []).filter((t) => t.status === 'REQUESTED').length
    if (stillPending > 0) {
      setPendingAccept({ jobId: job.id, quoteId, waiting: stillPending })
      return
    }
    acceptQuote(job.id, quoteId)
  }

  async function acceptQuote(jobId: string, quoteId: string) {
    setActionError(''); setBusyId(quoteId)
    try {
      await api<CustomerQuote>(`/quotes/${quoteId}/accept`, 'POST')
      const [, qs] = await Promise.all([loadJobs(), api<CustomerQuote[]>(`/jobs/${jobId}/quotes`, 'GET')])
      setQuotesByJob((prev) => ({ ...prev, [jobId]: qs }))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not accept quote.')
    } finally { setBusyId(null) }
  }

  // jobAction() used to exist here with one verb, 'cancel', wired to a Cancel
  // button on every accepted or in-progress job card. One click ended a live —
  // possibly already paid — job. Removed in UAT Round 7 §9, along with the
  // endpoint behind it. A customer ends a request by declining it before
  // acceptance; after acceptance the only exit is Dispute, resolving to Closed.

  function openReview(jobId: string) { setReviewOpenFor(jobId); setRating(5); setComment(''); setReviewError('') }

  async function submitReview(e: FormEvent, jobId: string) {
    e.preventDefault(); setReviewError(''); setBusyId(jobId)
    try {
      const rev = await api<Review>(`/jobs/${jobId}/review`, 'POST', { rating, comment: comment || null })
      setReviewByJob((prev) => ({ ...prev, [jobId]: rev }))
      setReviewOpenFor(null)
      await loadBalance()
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Could not submit review.')
    } finally { setBusyId(null) }
  }

  return (
    <div className="pg jb">
      <ConfirmDialog
        open={pendingAccept !== null}
        title="Accept this quote now?"
        confirmLabel="Accept Anyway"
        cancelLabel="Wait for the others"
        busy={busyId !== null}
        onConfirm={() => {
          if (!pendingAccept) return
          const { jobId, quoteId } = pendingAccept
          setPendingAccept(null)
          acceptQuote(jobId, quoteId)
        }}
        onCancel={() => setPendingAccept(null)}
      >
        <p>
          You're still awaiting a reply from {pendingAccept?.waiting}{' '}
          other provider{pendingAccept?.waiting === 1 ? '' : 's'}. Accepting now closes the request,
          so you won't receive their quotes.
        </p>
      </ConfirmDialog>

      <PageHead
        icon={<ClipboardIcon />}
        title="Your Requests & Jobs"
        intro="Every request, quote and job in one place."
        action={
          <button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/search')}>New request</button>
        }
      />

      {error && <div className="pg-error" role="alert">{error}</div>}
      {jobs === null && !error && <div className="pg-loading">Loading…</div>}

      {jobs !== null && jobs.length === 0 && (
        <EmptyState
          action={<button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/search')}>Find providers</button>}
        >
          You haven't requested any quotes yet.
        </EmptyState>
      )}

      {/* Sub-pages. The badge is yellow when something there is waiting for the
          customer: a payment due (Completed, as before) or a quote that has
          arrived on an open request. Display only, from jobs already loaded. */}
      {jobs !== null && jobs.length > 0 && (
        <SubTabs
          label="Your requests by stage"
          active={tab}
          onChange={setTab}
          tabs={JOBS_TABS.map((t) => ({
            key: t.key,
            label: t.label,
            count: countOf(t.key),
            attention:
              (t.key === 'COMPLETED' && owingCount > 0)
              || (t.key === 'OPEN' && (jobs ?? []).some((job) => job.status === 'QUOTED' && subPageOf(job, quotesByJob[job.id]) === 'OPEN')),
          }))}
        />
      )}

      {jobs !== null && jobs.length > 0 && owingCount > 0 && tab !== 'COMPLETED' && (
        <div className="pg-selbar jb-owing" role="status">
          <span>
            <strong>Payment due.</strong> {owingCount === 1 ? 'A job is' : `${owingCount} jobs are`} waiting
            to be paid — {owingCount === 1 ? "it's" : "they're"} under Completed.
          </span>
          <button type="button" className="pg-link" onClick={() => setTab('COMPLETED')}>Open Completed</button>
        </div>
      )}

      {/* Search, filters and sort — the same list state as before, laid out
          like the Mates search row. */}
      {jobs && jobs.length > 0 && inTab.length > 0 && (
        <>
          <div className="pg-searchrow jb-filters">
            <div className="pg-field pg-field-grow">
              <label htmlFor="jobs-search">Search your requests</label>
              <span className="pg-input-ico">
                <SearchIcon />
                <input
                  id="jobs-search"
                  type="search"
                  value={list.view.search}
                  placeholder="Title, suburb or provider"
                  onChange={(e) => list.setSearch(e.target.value)}
                />
              </span>
            </div>
            {list.filters.map((f) => (
              <div className="pg-field" key={f.key}>
                <label htmlFor={`jobs-${f.key}`}>{f.key === 'status' ? 'Status' : 'Industry'}</label>
                <select id={`jobs-${f.key}`} value={list.view.filters[f.key] ?? ''} onChange={(e) => list.setFilter(f.key, e.target.value)}>
                  <option value="">All {f.label.toLowerCase()}</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div className="pg-field">
              <label htmlFor="jobs-sort">Sort by</label>
              <span className="jb-sortbox">
                <select id="jobs-sort" value={list.view.sortKey} onChange={(e) => list.setSort(e.target.value)}>
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
        </>
      )}

      {/* Count, Clear and the List / Grid toggle (same buttons and place as
          Your Jobby Mates). Shown on every sub-tab. */}
      {jobs && jobs.length > 0 && (
        <div className="pg-toolbar">
          {inTab.length > 0 ? (
            <h3 className="pg-count">
              {list.shown === list.total ? `${list.total} requests` : `${list.shown} of ${list.total} requests`}
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
        <EmptyState
          action={<button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/search')}>Find providers</button>}
        >
          {EMPTY_COPY[tab]}
        </EmptyState>
      )}

      {jobs && inTab.length > 0 && list.shown === 0 && (
        <EmptyState action={<button type="button" className="pg-btn pg-btn-ghost" onClick={list.clear}>Clear filters</button>}>
          No requests match these filters.
        </EmptyState>
      )}

      {jobs && list.shown > 0 && (
        <div className={layout === 'grid' ? 'jb-grid' : 'jb-list'}>
          {list.visible.map((job) => {
            const quotes = quotesByJob[job.id]
            const isOpen = list.isExpanded(job.id)
            const busy = busyId === job.id
            const review = reviewByJob[job.id]
            const history = progressByJob[job.id] ?? []
            const latest = history[0]
            const targets = job.targetProviders ?? []
            const isOwing = (q: CustomerQuote) => q.settlementStatus === 'PENDING_PAYMENT'
              || (q.stages ?? []).some((st) => st.settlementStatus === 'PENDING_PAYMENT')

            /* Grid view, closed: the compact card. Opening it uses the same
               expand state as "View quotes" in List view (toggleQuotes), and
               the card then shows the full List-view content below. */
            if (layout === 'grid' && !isOpen) {
              const payDue = (quotes ?? []).some(isOwing)
              const reviewReady = job.status === 'COMPLETED' && review === null
              const onOpenTab = subPageOf(job, quotes) === 'OPEN'
              const quoteWaiting = onOpenTab && job.status === 'QUOTED'
              const open = () => toggleQuotes(job.id)
              const action = payDue
                ? { label: 'Pay now', run: open }
                : reviewReady
                  ? { label: 'Review', run: () => { open(); openReview(job.id) } }
                  : onOpenTab
                    ? { label: quotes ? `View quotes (${quotes.length})` : 'View quotes', run: open }
                    : { label: 'View details', run: open }
              return (
                <JobCompactCard
                  key={job.id}
                  title={job.title}
                  status={job.status}
                  date={formatDate(job.createdAt)}
                  industry={CATEGORY_LABELS[job.category]}
                  suburb={job.suburb}
                  refs={targets.filter((t) => t.requestRef).map((t) => ({ value: t.requestRef as string, owner: t.name }))}
                  assignedTo={job.status !== 'OPEN' ? job.providerName : null}
                  sentCount={targets.length > 0 ? targets.length : job.targetCount}
                  progress={latest ? latest.percent : null}
                  attention={payDue || quoteWaiting}
                  actionLabel={action.label}
                  onAction={action.run}
                  onOpen={open}
                />
              )
            }

            return (
              <article className={`jb-card${layout === 'grid' ? ' jb-span' : ''}`} key={job.id}>
                {layout === 'grid' && (
                  <button type="button" className="pg-link jb-less" aria-expanded="true" onClick={() => toggleQuotes(job.id)}>
                    Show less
                  </button>
                )}
                <div className="jb-top">
                  <h3 className="jb-title">{job.title}</h3>
                  <StatusChip status={job.status} />
                  <span className="jb-date">{formatDate(job.createdAt)}</span>
                </div>

                {/* The Quote Request ID for each invited provider (UAT Round 4
                    8.4) — the reference to quote when asking about this job. */}
                <div className="jb-meta">
                  <span className="pg-chip">{CATEGORY_LABELS[job.category]}</span>
                  <span className="jb-meta-item"><PinIcon />{job.suburb}</span>
                  {job.timeFrame && <span className="jb-meta-item"><ClockIcon />{job.timeFrame}</span>}
                  {targets.filter((t) => t.requestRef).map((t) => (
                    <RefPill key={t.userId} value={t.requestRef as string} owner={t.name} />
                  ))}
                </div>

                <ClampText text={job.description} />

                {job.status === 'OPEN' && <SentTo targets={targets} fallbackCount={job.targetCount} />}

                {/* A provider who declined, with their reason, so the customer
                    isn't left waiting on a quote that will never come. */}
                {targets
                  .filter((t) => t.status === 'DECLINED')
                  .map((t) => (
                    <div className="jb-decline" key={t.userId}>
                      <span className="jb-decline-head">{t.name} declined this request</span>
                      {t.declineMessage && <p>{t.declineMessage}</p>}
                    </div>
                  ))}

                {/* Photos the customer sent with the request; editable while it's still open. */}
                <ImageUploader
                  jobId={job.id}
                  kind="REQUEST"
                  canUpload={job.status === 'OPEN'}
                  label="Photos you sent"
                />

                {latest && (
                  <ProgressBar
                    percent={latest.percent}
                    caption={`Updated ${formatDateTime(latest.createdAt)}${latest.note ? ` · ${latest.note}` : ''}`}
                  />
                )}

                {history.length > 1 && (
                  <button
                    type="button"
                    className="pg-link jb-history-btn"
                    aria-expanded={historyFor === job.id}
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

                {(job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
                  <ImageUploader jobId={job.id} kind="PROGRESS" label="Progress photos" />
                )}
                {(job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
                  <ImageUploader jobId={job.id} kind="COMPLETION" label="Completion photos" />
                )}

                {job.providerName && job.status !== 'OPEN' && (
                  <p className="jb-assigned">
                    <InitialsAvatar name={job.providerName} size="sm" />
                    <span>Assigned to <strong>{job.providerName}</strong></span>
                  </p>
                )}

                <div className="jb-foot">
                  <button type="button" className="pg-btn pg-btn-ghost jb-btn-sm" aria-expanded={isOpen} onClick={() => toggleQuotes(job.id)}>
                    {isOpen
                      ? (job.status === 'OPEN' ? 'Hide quotes' : 'Hide quote')
                      : (job.status === 'OPEN' ? 'View quotes' : 'View quote')}
                  </button>
                  {/* No Cancel here. UAT Round 7 §9: Cancel discards unsaved
                      form edits and nothing else, on this screen and on the
                      provider's. */}
                  {job.status === 'COMPLETED' && review === null && reviewOpenFor !== job.id && (
                    <button type="button" className="pg-btn pg-btn-yellow jb-btn-sm" onClick={() => openReview(job.id)}>Leave a review</button>
                  )}
                </div>

                {job.status === 'COMPLETED' && review && (
                  <div className="jb-review-done">
                    <Stars value={review.rating} />
                    {review.comment && <p className="jb-review-comment">"{review.comment}"</p>}
                  </div>
                )}

                {reviewOpenFor === job.id && (
                  <form className="jb-review" onSubmit={(e) => submitReview(e, job.id)}>
                    {reviewError && <div className="pg-error" role="alert">{reviewError}</div>}
                    <fieldset className="jb-review-stars">
                      <legend>How was {job.providerName}?</legend>
                      <StarInput value={rating} onChange={setRating} />
                    </fieldset>
                    <label htmlFor={`review-comment-${job.id}`}>Comment (optional)</label>
                    <textarea
                      id={`review-comment-${job.id}`}
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="How did the job go?"
                    />
                    <div className="jb-review-actions">
                      <button type="button" className="pg-btn pg-btn-ghost" onClick={() => setReviewOpenFor(null)}>Cancel</button>
                      {/* The label follows the stars (Functional Spec §2.8); it
                          submits the same review as before. */}
                      <button
                        type="submit"
                        className="pg-btn pg-btn-yellow"
                        disabled={busy}
                        aria-label={busy ? undefined : `Submit review: ${REVIEW_LABELS[rating]}`}
                      >
                        {busy ? 'Submitting…' : REVIEW_LABELS[rating]}
                      </button>
                    </div>
                  </form>
                )}

                {job.status !== 'OPEN' && quotes && quotes.length > 0
                  && !quotes.some((q) => q.settlementStatus === 'PENDING_PAYMENT'
                    || (q.stages ?? []).some((st) => st.settlementStatus === 'PENDING_PAYMENT'))
                  && quotes.some((q) => q.settlementStatus === 'PENDING_COMPLETION'
                    || (q.stages ?? []).some((st) => st.settlementStatus === 'PENDING_COMPLETION')) && (
                  <p className="jb-waiting">
                    Waiting for the provider to mark the work complete — you'll be able to pay here once they do.
                  </p>
                )}

                {/* Test-only payment outcome — stays where it was shown before.
                    "Pay with" moved into the owing quote, next to Pay. */}
                {caps && caps.simulationEnabled && quotes && quotes.some(isOwing) && (
                  <div className="jb-testbar">
                    <label htmlFor={`simulate-${job.id}`}>Test outcome</label>
                    <select id={`simulate-${job.id}`} value={simulate} onChange={(e) => setSimulate(e.target.value as PaymentSimulation)}>
                      {caps.simulations.map((sim) => (
                        <option key={sim} value={sim}>{SIMULATION_LABELS[sim]}</option>
                      ))}
                    </select>
                  </div>
                )}

                {isOpen && (
                  <div className="jb-quotes">
                    {actionError && <div className="pg-error" role="alert">{actionError}</div>}
                    {loadingQuotes && !quotes && <div className="pg-loading">Loading quotes…</div>}
                    {quotes && quotes.length === 0 && <p className="jb-quotes-empty">No quotes yet — your providers haven't replied.</p>}
                    {quotes && quotes.length > 0 && (
                      <div className="jb-quote-list">
                        {quotes.map((q) => (
                          <div
                            key={q.id}
                            className={`jb-quote${q.status === 'ACCEPTED' ? ' is-accepted' : ''}${q.status === 'DECLINED' ? ' is-declined' : ''}`}
                          >
                            <div className="jb-quote-main">
                              <div className="jb-quote-head">
                                <InitialsAvatar name={q.providerName} size="sm" />
                                <span className="jb-quote-provider">{q.providerName}</span>
                                <span className={`jb-qstatus jb-qstatus-${q.status.toLowerCase()}`}>{q.status}</span>
                              </div>
                              <div className="jb-quote-total">
                                <span className="jb-quote-price">{formatMoney(q.total)}</span>
                                <span className="jb-points-chip">Earn {formatMoney(q.pointsEarned)} in Mate Points</span>
                              </div>

                              {/* What the quote is made up of (UAT Round 6 2). Each
                                  amount is the figure that applies to the customer -
                                  the provider's own pricing is not shown here, and
                                  nothing on this screen names a platform charge. */}
                              {q.lineItems && q.lineItems.length > 0 && (
                                <div className="jb-lines">
                                  <div className="jb-line jb-line-head">
                                    <span>Line item</span>
                                    <span>Amount</span>
                                  </div>
                                  {q.lineItems.map((li, i) => (
                                    <div className="jb-line" key={i}>
                                      <span>{li.description}</span>
                                      <span>{formatMoney(li.amount)}</span>
                                    </div>
                                  ))}
                                  <div className="jb-line jb-line-sub">
                                    <span>Total</span>
                                    <span>{formatMoney(q.subTotal)}</span>
                                  </div>
                                  <div className="jb-line">
                                    <span>GST</span>
                                    <span>{formatMoney(q.gst)}</span>
                                  </div>
                                  <div className="jb-line jb-line-pay">
                                    <span>Customer pay</span>
                                    <span>{formatMoney(q.total)}</span>
                                  </div>

                                  <div className="jb-line jb-line-points-head">
                                    <span>Standard Mate Points earned</span>
                                    <span>{formatMoney(q.standardPoints)}</span>
                                  </div>
                                  <div className="jb-line">
                                    <span>Bonus Mate Points earned</span>
                                    <span>{formatMoney(q.bonusPoints ?? 0)}</span>
                                  </div>
                                  <div className="jb-line jb-line-points-total">
                                    <span>Total Mate Points earned</span>
                                    <span>{formatMoney(q.pointsEarned)}</span>
                                  </div>
                                </div>
                              )}

                              {q.paymentType === 'STAGED' && q.stages && q.stages.length > 0 && (
                                <div className="jb-stages">
                                  <div className="jb-stages-head">Paid in stages</div>
                                  <ol>
                                    {q.stages.map((st) => (
                                      <li
                                        key={st.id}
                                        className={`jb-stage${st.settlementStatus === 'PAID' ? ' is-paid' : ''}${st.settlementStatus === 'PENDING_PAYMENT' ? ' is-due' : ''}`}
                                      >
                                        <span className="jb-stage-dot" aria-hidden="true" />
                                        <span className="jb-stage-name">{st.name} · {st.percent}%</span>
                                        <span className="jb-stage-end">
                                          {formatMoney(st.amount)}
                                          {st.settlementStatus === 'PENDING_PAYMENT' && (
                                            <button type="button" className="pg-btn pg-btn-green jb-btn-xs" disabled={busyId === st.id}
                                                    onClick={() => pay(job.id, q.id, st.id)}>
                                              {busyId === st.id ? 'Paying…' : 'Pay'}
                                            </button>
                                          )}
                                          {st.settlementStatus && st.settlementStatus !== 'PENDING_PAYMENT' && (
                                            <span className="jb-stage-state">{settlementLabel(st.settlementStatus)}</span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}

                              {q.message && <blockquote className="jb-bubble">{q.message}</blockquote>}
                            </div>

                            <div className="jb-quote-actions">
                              {caps && isOwing(q) && (
                                <label className="jb-paywith">
                                  <span>Pay with</span>
                                  <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                                    {caps.methods.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                                  </select>
                                </label>
                              )}
                              {q.paymentType !== 'STAGED' && q.settlementStatus === 'PENDING_PAYMENT' && (
                                redeemFor === q.id ? (
                                  <div className="jb-redeem">
                                    <label className="jb-redeem-label" htmlFor={`redeem-${q.id}`}>
                                      Use points (max {formatMoney(maxRedeem(q.total))}):
                                    </label>
                                    <input id={`redeem-${q.id}`} className="jb-redeem-input" type="number" min="0" step="0.01"
                                           max={maxRedeem(q.total)} value={redeemAmt}
                                           onChange={(e) => setRedeemAmt(e.target.value)} placeholder="0.00" />
                                    <button type="button" className="pg-btn pg-btn-green jb-btn-sm" disabled={busyId === q.id}
                                            onClick={() => pay(job.id, q.id, null, Math.min(Number(redeemAmt) || 0, maxRedeem(q.total)))}>
                                      {busyId === q.id ? 'Paying…' : `Pay ${formatMoney(Math.max(0, q.total - Math.min(Number(redeemAmt) || 0, maxRedeem(q.total))))}`}
                                    </button>
                                    <button type="button" className="pg-link" onClick={() => { setRedeemFor(null); setRedeemAmt('') }}>Cancel</button>
                                  </div>
                                ) : (
                                  <>
                                    <button type="button" className="pg-btn pg-btn-green jb-btn-sm" disabled={busyId === q.id} onClick={() => pay(job.id, q.id, null)}>
                                      {busyId === q.id ? 'Paying…' : `Pay ${formatMoney(q.total)}`}
                                    </button>
                                    {pointsBalance > 0 && (
                                      <button type="button" className="pg-btn pg-btn-ghost jb-btn-sm" onClick={() => { setRedeemFor(q.id); setRedeemAmt('') }}>Use points</button>
                                    )}
                                  </>
                                )
                              )}
                              {q.paymentType !== 'STAGED' && q.status === 'ACCEPTED' && q.settlementStatus && q.settlementStatus !== 'PENDING_PAYMENT' && (
                                <span className="jb-settle">{settlementLabel(q.settlementStatus)}</span>
                              )}
                              {q.status === 'PENDING' && (
                                <button type="button" className="pg-btn pg-btn-green jb-btn-sm" disabled={busyId === q.id} onClick={() => askAccept(job, q.id)}>
                                  {busyId === q.id ? 'Accepting…' : 'Accept'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
