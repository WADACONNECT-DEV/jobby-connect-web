import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Stars, StarInput } from '../components/Stars'
import { ListControls } from '../components/ListControls'
import { ProgressBar } from '../components/ProgressBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ImageUploader } from '../components/ImageUploader'
import { initialsOf } from '../components/mates/MateCard'
import { StatCards, StepLine } from '../components/StepLine'
import { StickyBar } from '../components/StickyBar'
import { byDate, byText, optionsFrom, useListView, usePersistedValue } from '../listView'
import { METHOD_LABELS, industryOf, SIMULATION_LABELS, formatDate, formatDateTime, formatMoney, statusLabel, settlementLabel, type CustomerQuote, type Job, type PaymentCapabilities, type PaymentMethod, type PaymentResult, type PaymentSimulation, type ProgressEntry, type Review, type SettlementStatus, type Wallet } from '../types'

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
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'NOT_PROCEEDED', label: 'Not proceeded' },
] as const

type JobsTab = (typeof JOBS_TABS)[number]['key']

/** The review button's label per star rating, from the Functional Specification (§2.8). */
const RATING_LABELS: Record<number, string> = {
  5: 'Great Job Mate',
  4: 'Good Job Mate',
  3: 'Thanks for the Job',
  2: 'Do Better Next Time Mate',
  1: 'Not Up to Standard',
}

const EMPTY_COPY: Record<JobsTab, string> = {
  OPEN: 'No open requests. Find a provider and ask for a quote.',
  IN_PROGRESS: 'Nothing underway right now.',
  COMPLETED: 'Nothing waiting on payment or a review.',
  NOT_PROCEEDED: "Nothing here — requests that didn't go ahead would appear on this page.",
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

/** Amount still to pay on a quote: the whole quote, or its stages that are due. */
function owingOn(q: CustomerQuote): number {
  if (q.stages && q.stages.length > 0) {
    return q.stages.filter((st) => st.settlementStatus === 'PENDING_PAYMENT').reduce((sum, st) => sum + st.amount, 0)
  }
  return q.settlementStatus === 'PENDING_PAYMENT' ? q.total : 0
}

/**
 * How many of the five steps (Quote accepted → Started → Marked complete →
 * Paid → Reviewed) a job has passed, from what the page already holds.
 */
function stepsDone(job: Job, quotes: CustomerQuote[] | undefined, progress: ProgressEntry[], review: Review | null | undefined): number {
  if (job.status === 'OPEN' || job.status === 'QUOTED' || job.status === 'CANCELLED') return 0
  const accepted = (quotes ?? []).find((q) => q.status === 'ACCEPTED')
  const units: (SettlementStatus | null)[] = accepted
    ? (accepted.stages && accepted.stages.length > 0 ? accepted.stages.map((st) => st.settlementStatus) : [accepted.settlementStatus])
    : []
  const started = progress.length > 0 || job.status === 'COMPLETED' || units.some((u) => u !== 'PENDING_COMPLETION')
  const complete = job.status === 'COMPLETED' || (units.length > 0 && !units.some((u) => u === 'PENDING_COMPLETION'))
  const paid = complete && units.length > 0 && !units.some((u) => u === 'PENDING_COMPLETION' || u === 'PENDING_PAYMENT')
  if (review) return 5
  if (paid) return 4
  if (complete) return 3
  if (started) return 2
  return 1
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

  // "Show more" on a long description. Display only, not remembered.
  const [fullDesc, setFullDesc] = useState<Set<string>>(new Set())

  // Which sub-page is open survives leaving the tab and coming back
  // (Round 1 §5.3, restated in Round 7 check 3.3).
  const [tab, setTab] = usePersistedValue<JobsTab>('customer.jobs.tab', 'OPEN')

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

  const toPay = (jobs ?? []).reduce((sum, job) => sum + (quotesByJob[job.id] ?? []).reduce((s2, q) => s2 + owingOn(q), 0), 0)
  const quotesToReview = (jobs ?? []).filter((job) => job.status === 'QUOTED').length

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
        // By industry name (step J1); older jobs use their category's label.
        options: optionsFrom<Job>((job) => industryOf(job)),
        match: (job, value) => industryOf(job) === value,
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

  const owes = (q: CustomerQuote) => q.settlementStatus === 'PENDING_PAYMENT'
    || (q.stages ?? []).some((st) => st.settlementStatus === 'PENDING_PAYMENT')

  /**
   * The sub-tab badge turns yellow when a job on that sub-tab is waiting for
   * the customer: quotes to look at (QUOTED) or a payment due. Uses data the
   * page already holds; nothing new is fetched.
   */
  function waitingIn(key: JobsTab): boolean {
    return (jobs ?? []).some((job) => subPageOf(job, quotesByJob[job.id]) === key
      && (job.status === 'QUOTED' || (quotesByJob[job.id] ?? []).some(owes)))
  }

  const topBlock = useRef<HTMLDivElement | null>(null)
  const subTabs = (
    <div className="mj-subtabs" role="tablist" aria-label="Requests and jobs">
      {JOBS_TABS.map((t) => {
        const waiting = waitingIn(t.key)
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`mj-subtab${tab === t.key ? ' is-on' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className={`mj-badge${waiting ? ' is-waiting' : ''}`}>{countOf(t.key)}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="mj">
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

      {/* Header row, as on Your Jobby Mates (redesign step 4). */}
      <div className="mt-head">
        <div className="mt-head-copy">
          <ClipboardIcon />
          <div>
            <h2 className="mt-title">Your requests &amp; jobs</h2>
            <p className="mt-sub">Every request, quote and job in one place.</p>
          </div>
        </div>
        <button className="mt-invite" onClick={() => navigate('/search')}>
          <PlusIcon /> New request
        </button>
      </div>

      {jobs !== null && jobs.length > 0 && (
        <StatCards items={[
          { label: 'Open requests', value: String(countOf('OPEN')) },
          { label: 'Quotes to review', value: String(quotesToReview) },
          { label: 'Jobs in progress', value: String(countOf('IN_PROGRESS')) },
          { label: 'To pay', value: formatMoney(toPay), tone: 'hi' },
        ]} />
      )}

      {error && <div className="msg err">{error}</div>}
      {jobs === null && !error && <div className="loading">Loading…</div>}

      {jobs !== null && jobs.length === 0 && (
        <div className="mt-empty">
          <p>You haven't requested any quotes yet.</p>
          <button className="mt-btn-navy" onClick={() => navigate('/search')}>Find providers</button>
        </div>
      )}

      <div ref={topBlock} className="mt-top">
      {jobs !== null && jobs.length > 0 && subTabs}

      {jobs !== null && jobs.length > 0 && owingCount > 0 && tab !== 'COMPLETED' && (
        <div className="mt-selbar mj-owing" role="status">
          <span><strong>Payment due.</strong> {owingCount === 1 ? 'A job is' : `${owingCount} jobs are`} waiting
            to be paid — {owingCount === 1 ? "it's" : "they're"} under Completed.</span>
          <button className="mt-continue" onClick={() => setTab('COMPLETED')}>Open Completed <ArrowIcon /></button>
        </div>
      )}

      {jobs && jobs.length > 0 && inTab.length > 0 && (
        <div className="mj-controls">
          <ListControls list={list} searchPlaceholder="Search your requests" countLabel="requests" />
        </div>
      )}
      </div>

      {jobs && jobs.length > 0 && inTab.length > 0 && (
        <StickyBar anchor={topBlock}>
          {subTabs}
          <span className="sb-field">
            <input type="search" value={list.view.search} placeholder="Search your requests" aria-label="Search your requests"
              onChange={(e) => list.setSearch(e.target.value)} />
          </span>
          <span className="sb-count">{list.shown} request{list.shown === 1 ? '' : 's'}</span>
        </StickyBar>
      )}

      {jobs !== null && jobs.length > 0 && inTab.length === 0 && (
        <div className="mt-empty">
          <p>{EMPTY_COPY[tab]}</p>
          <button className="mt-btn-navy" onClick={() => navigate('/home/find')}>Find providers</button>
        </div>
      )}

      {jobs && inTab.length > 0 && list.shown === 0 && (
        <div className="mt-empty">
          <p>No requests match these filters.</p>
          <button className="mt-btn-ghost" onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {jobs && list.shown > 0 && (
        <div className="mj-list">
          {list.visible.map((job) => {
            const quotes = quotesByJob[job.id]
            const isOpen = list.isExpanded(job.id)
            const busy = busyId === job.id
            const review = reviewByJob[job.id]
            const history = progressByJob[job.id] ?? []
            const latest = history[0]
            const group = subPageOf(job, quotes)
            const targets = job.targetProviders ?? []
            const refs = targets.filter((t) => t.requestRef)
            const declined = targets.filter((t) => t.status === 'DECLINED')
            const descOpen = fullDesc.has(job.id)
            const longDesc = job.description.length > 160
            return (
              <article className="mj-card" key={job.id}>
                <div className="mj-top">
                  <h3 className="mj-title">{job.title}</h3>
                  <span className={`mj-status is-${group.toLowerCase()}`}>{statusLabel(job.status)}</span>
                  <span className="mj-date">{formatDate(job.createdAt)}</span>
                </div>

                <div className="mj-meta">
                  <span className="mc-chip">{industryOf(job)}</span>
                  <span className="mc-line"><PinIcon /> {job.suburb}</span>
                  {job.timeFrame && <span className="mj-muted">{job.timeFrame}</span>}
                  {/* The Quote Request ID for each invited provider (UAT Round 4
                      8.4) - exactly as issued, the reference to quote when asking
                      about this job. */}
                  {refs.map((t) => (
                    <span className="mj-ref" key={t.userId} title={t.name}>
                      <code>{t.requestRef}</code>
                      {refs.length > 1 && <span className="mj-ref-name">{t.name}</span>}
                    </span>
                  ))}
                </div>

                <p className={`mj-desc${descOpen || !longDesc ? '' : ' is-clamped'}`}>{job.description}</p>
                {longDesc && (
                  <button type="button" className="mj-link" onClick={() => setFullDesc((prev) => {
                    const next = new Set(prev)
                    if (next.has(job.id)) next.delete(job.id); else next.add(job.id)
                    return next
                  })}>
                    {descOpen ? 'Show less' : 'Show more'}
                  </button>
                )}

                {job.status === 'OPEN' && (
                  <div className="mj-sent">
                    <span className="mj-label">Sent to</span>
                    {targets.length > 0 ? (
                      <span className="mj-people">
                        {targets.map((t) => (
                          <span className={`mj-person${t.status === 'DECLINED' ? ' is-declined' : ''}`} key={t.userId}>
                            <span className="mj-initials" aria-hidden="true">{initialsOf(t.name)}</span>{t.name}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span>{job.targetCount} provider{job.targetCount > 1 ? 's' : ''}</span>
                    )}
                    <span className="mj-muted">· awaiting quotes</span>
                  </div>
                )}

                {/* A provider who declined, with their reason, so the customer
                    isn't left waiting on a quote that will never come. */}
                {declined.map((t) => (
                  <div className="mj-declined" key={t.userId}>
                    <span className="mj-declined-head">
                      <span className="mj-initials is-grey" aria-hidden="true">{initialsOf(t.name)}</span>
                      {t.name} declined this request
                    </span>
                    {t.declineMessage && <p>{t.declineMessage}</p>}
                  </div>
                ))}

                {/* Photos the customer sent with the request; editable while it's still open. */}
                <div className="mj-photos">
                  <ImageUploader jobId={job.id} kind="REQUEST" canUpload={job.status === 'OPEN'} label="Photos you sent" />
                  {(job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
                    <ImageUploader jobId={job.id} kind="PROGRESS" label="Progress photos" />
                  )}
                  {(job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
                    <ImageUploader jobId={job.id} kind="COMPLETION" label="Completion photos" />
                  )}
                </div>

                {job.status !== 'OPEN' && job.status !== 'QUOTED' && (
                  <div className="mj-steps">
                    <StepLine done={stepsDone(job, quotes, history, review)} />
                  </div>
                )}

                {latest && (
                  <div className="mj-progress">
                    <ProgressBar
                      percent={latest.percent}
                      caption={`Updated ${formatDateTime(latest.createdAt)}${latest.note ? ` · ${latest.note}` : ''}`}
                    />
                    {history.length > 1 && (
                      <button type="button" className="mj-link" onClick={() => setHistoryFor(historyFor === job.id ? null : job.id)}>
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
                  </div>
                )}

                {job.providerName && job.status !== 'OPEN' && (
                  <div className="mj-assigned">
                    <span className="mj-initials" aria-hidden="true">{initialsOf(job.providerName)}</span>
                    <span>Assigned to <strong>{job.providerName}</strong></span>
                  </div>
                )}

                {job.status !== 'OPEN' && quotes && quotes.length > 0
                  && !quotes.some(owes)
                  && quotes.some((q) => q.settlementStatus === 'PENDING_COMPLETION'
                    || (q.stages ?? []).some((st) => st.settlementStatus === 'PENDING_COMPLETION')) && (
                  <p className="mj-note">
                    Waiting for the provider to mark the work complete — you'll be able to pay here once they do.
                  </p>
                )}

                {caps && quotes && quotes.some(owes) && (
                  <div className="mj-paybar">
                    <label className="mj-paylabel">
                      <span>Pay with</span>
                      <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                        {caps.methods.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                      </select>
                    </label>
                    {caps.simulationEnabled && (
                      <label className="mj-paylabel">
                        <span>Test outcome</span>
                        <select value={simulate} onChange={(e) => setSimulate(e.target.value as PaymentSimulation)}>
                          {caps.simulations.map((sim) => (
                            <option key={sim} value={sim}>{SIMULATION_LABELS[sim]}</option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}

                <div className="mj-foot">
                  <button className="mc-btn is-ghost" onClick={() => toggleQuotes(job.id)}>
                    {isOpen
                      ? (job.status === 'OPEN' ? 'Hide quotes' : 'Hide quote')
                      : (job.status === 'OPEN' ? 'View quotes' : 'View quote')}
                  </button>
                  {/* No Cancel here. UAT Round 7 §9: Cancel discards unsaved
                      form edits and nothing else, on this screen and on the
                      provider's. */}
                  {job.status === 'COMPLETED' && review === null && reviewOpenFor !== job.id && (
                    <button className="mc-btn is-selected" onClick={() => openReview(job.id)}>Leave a review</button>
                  )}
                </div>

                {job.status === 'COMPLETED' && review && (
                  <div className="mj-review-done">
                    <Stars value={review.rating} />
                    {review.comment && <p>"{review.comment}"</p>}
                  </div>
                )}

                {reviewOpenFor === job.id && (
                  <form className="mj-review" onSubmit={(e) => submitReview(e, job.id)}>
                    {reviewError && <div className="msg err">{reviewError}</div>}
                    <span className="mj-review-q">How was {job.providerName}?</span>
                    <div className="mj-stars"><StarInput value={rating} onChange={setRating} /></div>
                    <span className="mj-review-word">{RATING_LABELS[rating] ?? ''}</span>
                    <label className="mj-review-label" htmlFor={`rev-${job.id}`}>Comment (optional)</label>
                    <textarea id={`rev-${job.id}`} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How did the job go?" />
                    <div className="mj-review-actions">
                      <button type="button" className="mc-btn is-ghost" onClick={() => setReviewOpenFor(null)}>Cancel</button>
                      {/* The button carries the rating's label (Functional Spec §2.8):
                          5 Great Job Mate … 1 Not Up to Standard. */}
                      <button type="submit" className="mc-btn is-selected" disabled={busy}>{busy ? 'Submitting…' : (RATING_LABELS[rating] ?? 'Submit review')}</button>
                    </div>
                  </form>
                )}

                {isOpen && (
                  <div className="mj-quotes">
                    {actionError && <div className="msg err">{actionError}</div>}
                    {loadingQuotes && !quotes && <div className="loading">Loading quotes…</div>}
                    {quotes && quotes.length === 0 && <p className="mj-note">No quotes yet — your providers haven't replied.</p>}
                    {quotes && quotes.map((q) => (
                      <div className={`mq${q.status === 'ACCEPTED' ? ' is-accepted' : ''}${q.status === 'DECLINED' || q.status === 'WITHDRAWN' ? ' is-out' : ''}`} key={q.id}>
                        <div className="mq-main">
                          <div className="mq-head">
                            <span className="mc-avatar mq-avatar" aria-hidden="true">{initialsOf(q.providerName)}</span>
                            <div className="mq-who">
                              <strong>{q.providerName}</strong>
                              <span className={`mj-status is-quote-${q.status.toLowerCase()}`}>{q.status}</span>
                            </div>
                            <div className="mq-total">
                              <span className="mq-total-amt">{formatMoney(q.total)}</span>
                              <span className="mq-points">Earn {formatMoney(q.pointsEarned)} in Mate Points</span>
                            </div>
                          </div>

                          {/* What the quote is made up of (UAT Round 6 2). Each
                              amount is the figure that applies to the customer -
                              the provider's own pricing is not shown here, and
                              nothing on this screen names a platform charge. */}
                          {q.lineItems && q.lineItems.length > 0 && (
                            <div className="mq-lines">
                              <div className="mq-row is-head"><span>Line item</span><span>Amount</span></div>
                              {q.lineItems.map((li, i) => (
                                <div className="mq-row" key={i}><span>{li.description}{li.gstFree && q.gst > 0 ? ' *' : ''}</span><span>{formatMoney(li.amount)}</span></div>
                              ))}
                              <div className="mq-row is-sub"><span>Total</span><span>{formatMoney(q.subTotal)}</span></div>
                              <div className="mq-row"><span>GST</span><span>{formatMoney(q.gst)}</span></div>
                              <div className="mq-row is-pay"><span>Customer pay</span><span>{formatMoney(q.total)}</span></div>
                              <div className="mq-row is-points-head"><span>Standard Mate Points earned</span><span>{formatMoney(q.standardPoints)}</span></div>
                              <div className="mq-row"><span>Bonus Mate Points earned</span><span>{formatMoney(q.bonusPoints ?? 0)}</span></div>
                              <div className="mq-row is-points-total"><span>Total Mate Points earned</span><span>{formatMoney(q.pointsEarned)}</span></div>
                              {/* Marked only when the quote has GST on other lines; with no
                                  GST at all the "*" would mark every line and say nothing. */}
                              {q.gst > 0 && q.lineItems.some((li) => li.gstFree) && (
                                <div className="mq-note">* GST-free item</div>
                              )}
                            </div>
                          )}

                          {q.paymentType === 'STAGED' && q.stages && q.stages.length > 0 && (
                            <ol className="mq-stages" aria-label="Paid in stages">
                              {q.stages.map((st) => (
                                <li className={`mq-stage is-${(st.settlementStatus ?? 'none').toLowerCase()}`} key={st.id}>
                                  <span className="mq-stage-dot" aria-hidden="true" />
                                  <span className="mq-stage-name">{st.name} · {st.percent}%</span>
                                  <span className="mq-stage-amt">{formatMoney(st.amount)}</span>
                                  {st.settlementStatus === 'PENDING_PAYMENT' && (
                                    <button className="mq-pay is-small" disabled={busyId === st.id}
                                            onClick={() => pay(job.id, q.id, st.id)}>
                                      {busyId === st.id ? 'Paying…' : 'Pay'}
                                    </button>
                                  )}
                                  {st.settlementStatus && st.settlementStatus !== 'PENDING_PAYMENT' && (
                                    <span className="mq-stage-state">{settlementLabel(st.settlementStatus)}</span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          )}

                          {q.message && <blockquote className="mq-message">{q.message}</blockquote>}
                        </div>

                        <div className="mq-actions">
                          {q.paymentType !== 'STAGED' && q.settlementStatus === 'PENDING_PAYMENT' && (
                            redeemFor === q.id ? (
                              <div className="mq-redeem">
                                <label>
                                  <span>Use points (max {formatMoney(maxRedeem(q.total))})</span>
                                  <input type="number" min="0" step="0.01"
                                         max={maxRedeem(q.total)} value={redeemAmt}
                                         onChange={(e) => setRedeemAmt(e.target.value)} placeholder="0.00" />
                                </label>
                                <button className="mq-pay" disabled={busyId === q.id}
                                        onClick={() => pay(job.id, q.id, null, Math.min(Number(redeemAmt) || 0, maxRedeem(q.total)))}>
                                  {busyId === q.id ? 'Paying…' : `Pay ${formatMoney(Math.max(0, q.total - Math.min(Number(redeemAmt) || 0, maxRedeem(q.total))))}`}
                                </button>
                                <button className="mc-btn is-ghost" onClick={() => { setRedeemFor(null); setRedeemAmt('') }}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                <button className="mq-pay" disabled={busyId === q.id} onClick={() => pay(job.id, q.id, null)}>
                                  {busyId === q.id ? 'Paying…' : `Pay ${formatMoney(q.total)}`}
                                </button>
                                {pointsBalance > 0 && (
                                  <button className="mc-btn is-ghost" onClick={() => { setRedeemFor(q.id); setRedeemAmt('') }}>Use points</button>
                                )}
                              </>
                            )
                          )}
                          {q.paymentType !== 'STAGED' && q.status === 'ACCEPTED' && q.settlementStatus && q.settlementStatus !== 'PENDING_PAYMENT' && (
                            <span className="mq-state">{settlementLabel(q.settlementStatus)}</span>
                          )}
                          {q.status === 'PENDING' && (
                            <button className="mq-accept" disabled={busyId === q.id} onClick={() => askAccept(job, q.id)}>
                              {busyId === q.id ? 'Accepting…' : 'Accept'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
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

/* ---------- icons (decorative) ---------- */

function ClipboardIcon() {
  return (
    <svg aria-hidden="true" className="mt-head-ico" width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="#0B2038" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 4V2.5h6V4" /><path d="M9 11h6M9 15h6M9 19h3" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
  )
}
function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  )
}
function PinIcon() {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="#0B2038">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  )
}
