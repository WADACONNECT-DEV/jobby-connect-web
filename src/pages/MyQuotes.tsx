import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { StickyBar } from '../components/StickyBar'
import { initialsOf } from '../components/mates/MateCard'
import { StepLine } from '../components/StepLine'
import { byDate, byNumber, byText, optionsFrom, useListView, usePersistedValue } from '../listView'
import {
  OUTCOME_LABELS, industryOf,
  formatDate, formatMoney, settlementLabel,
  type ProviderQuote, type ProviderQuoteStage, type ProviderRequestRow, type SettlementResult, type SettlementStatus,
} from '../types'

interface ReviewTarget { quoteId: string; stageId: string | null; label: string }

/**
 * Your Quotes, split into three sub-pages (UAT Round 7 §5).
 *
 * Two of the three are not quote data at all. "Action needed" and "Declined"
 * are the provider's request pipeline — the same rows behind Requests to Me's
 * Received, Lost and Declined pills — surfaced here so the provider can see
 * what is waiting on them without changing tabs. Display separation only:
 * every item still appears in Requests to Me exactly as before.
 *
 * "Accepted" is the quote data this page has always shown, narrowed to the
 * ones the customer accepted. It keeps the full card, because that is where
 * Mark complete and Review & get paid live — the settlement ladder's only
 * route to a payout.
 */
const QUOTE_TABS = [
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'ACTION', label: 'Action needed' },
  { key: 'DECLINED', label: 'Declined' },
] as const

type QuoteTab = (typeof QUOTE_TABS)[number]['key']

/** Does this quote (or any of its stages) need the provider to do something? */
function needsAction(q: ProviderQuote): boolean {
  if (q.status !== 'ACCEPTED') return false
  const pending = (st: SettlementStatus | null | undefined) =>
    st === 'PENDING_COMPLETION' || st === 'PENDING_REVIEW'
  if (q.paymentType === 'STAGED') return (q.stages ?? []).some((st) => pending(st.settlementStatus))
  return pending(q.settlementStatus)
}

export default function MyQuotes() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [quotes, setQuotes] = useState<ProviderQuote[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  // The Quote Request ID belongs to the request, not the quote, so it comes
  // from the pipeline and is matched by job (UAT Round 4 8.4). Showing it here
  // means the same reference is on screen at the payment and review stages too.
  const [refByJob, setRefByJob] = useState<Record<string, string>>({})
  // Customer name per job, from the same pipeline rows (redesign step 10).
  const [customerByJob, setCustomerByJob] = useState<Record<string, string>>({})

  // The pipeline rows themselves, not just their references — two of the three
  // sub-pages are built from these rather than from quotes.
  const [pipeline, setPipeline] = useState<ProviderRequestRow[] | null>(null)

  const [tab, setTab] = usePersistedValue<QuoteTab>('provider.quotes.tab', 'ACCEPTED')
  // List or Grid, remembered (redesign step 10). List is the default.
  const [layout, setLayout] = usePersistedValue<'list' | 'grid'>('provider.quotes.layout', 'list')

  const [review, setReview] = useState<ReviewTarget | null>(null)
  const [difficulty, setDifficulty] = useState(3)
  const [cooperation, setCooperation] = useState(3)
  const [hazards, setHazards] = useState('')
  const [notes, setNotes] = useState('')

  // Accepted quotes only — the sub-page the quote cards belong to.
  const acceptedQuotes = (quotes ?? []).filter((q) => q.status === 'ACCEPTED')

  // "Action needed" is Requests to Me → Received: sent to this provider, still
  // open, not yet replied to. "Declined" is Lost or Declined — the customer
  // went elsewhere, or this provider declined it.
  const actionRows = (pipeline ?? []).filter((r) => r.outcome === 'RECEIVED')
  const declinedRows = (pipeline ?? []).filter((r) => r.outcome === 'LOST' || r.outcome === 'DECLINED')

  const countOf = (key: QuoteTab) =>
    key === 'ACCEPTED' ? acceptedQuotes.length
      : key === 'ACTION' ? actionRows.length
      : declinedRows.length

  const list = useListView<ProviderQuote>('provider.quotes', acceptedQuotes, {
    search: (q) => `${q.jobTitle} ${q.message ?? ''}`,
    filters: [
      {
        key: 'status',
        label: 'quote statuses',
        options: optionsFrom<ProviderQuote>((q) => q.status ?? ''),
        match: (q, value) => q.status === value,
      },
      {
        key: 'payment',
        label: 'payment types',
        options: optionsFrom<ProviderQuote>(
          (q) => q.paymentType ?? '',
          (value) => (value === 'STAGED' ? 'Staged payment' : 'Full payment'),
        ),
        match: (q, value) => q.paymentType === value,
      },
      {
        key: 'action',
        label: 'work states',
        options: () => [
          { value: 'ACTION', label: 'Action needed' },
          { value: 'NONE', label: 'Nothing to do' },
        ],
        match: (q, value) => (value === 'ACTION' ? needsAction(q) : !needsAction(q)),
      },
    ],
    sorts: [
      { key: 'sent', label: 'Date sent', compare: byDate<ProviderQuote>((q) => q.createdAt ?? null), defaultDir: 'desc' },
      { key: 'total', label: 'Customer pays', compare: byNumber<ProviderQuote>((q) => q.customerTotal), defaultDir: 'desc' },
      { key: 'payable', label: 'You get paid', compare: byNumber<ProviderQuote>((q) => q.providerPayable), defaultDir: 'desc' },
      { key: 'title', label: 'Job title', compare: byText<ProviderQuote>((q) => q.jobTitle), defaultDir: 'asc' },
    ],
    defaultSortKey: 'sent',
    defaultSortDir: 'desc',
  })

  const load = () =>
    api<ProviderQuote[]>('/quotes/mine', 'GET')
      .then(setQuotes)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your quotes.'))

  useEffect(() => {
    load()
    api<ProviderRequestRow[]>('/provider/pipeline', 'GET')
      .then((rows) => {
        setPipeline(rows)
        const map: Record<string, string> = {}
        const names: Record<string, string> = {}
        rows.forEach((r) => {
          if (r.requestRef) map[r.jobId] = r.requestRef
          names[r.jobId] = r.customerName
        })
        setRefByJob(map)
        setCustomerByJob(names)
      })
      .catch(() => { setPipeline([]) /* the reference simply won't show */ })
  }, [])

  /**
   * Arriving from "Review & get paid" in Your Work.
   *
   * The link carries the quote and, on a staged job, the stage awaiting review.
   * This opens the form for that unit directly — switching to the sub-page that
   * holds it and expanding its card on the way, so closing the form leaves the
   * provider looking at the right job rather than a collapsed list.
   *
   * Runs once the quotes are in, since the label needs the job title. The
   * parameters are cleared afterwards so a refresh, or a Back into this page,
   * doesn't reopen a form the provider has already dealt with.
   */
  useEffect(() => {
    const quoteId = searchParams.get('review')
    if (!quoteId || quotes === null) return

    const target = quotes.find((q) => q.id === quoteId)
    if (target) {
      const stageId = searchParams.get('stage')
      const stage = stageId ? (target.stages ?? []).find((st) => st.id === stageId) : undefined
      setTab('ACCEPTED')
      list.setExpanded(target.id ?? target.jobId, true)
      openReview(quoteId, stage?.id ?? null,
        stage ? `${target.jobTitle} — ${stage.name}` : target.jobTitle)
    }

    // Clear either way: a quote that cannot be found is a stale link, and
    // leaving the parameter on would retry it on every render.
    const rest = new URLSearchParams(searchParams)
    rest.delete('review'); rest.delete('stage')
    setSearchParams(rest, { replace: true })
  }, [quotes, searchParams])

  async function complete(quoteId: string, stageId: string | null) {
    setError(''); setBusyId(stageId ?? quoteId)
    try {
      await api<SettlementResult>('/settlement/complete', 'POST', { quoteId, stageId })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark complete.')
    } finally {
      setBusyId(null)
    }
  }

  function openReview(quoteId: string, stageId: string | null, label: string) {
    setReview({ quoteId, stageId, label })
    setDifficulty(3); setCooperation(3); setHazards(''); setNotes('')
  }

  async function submitReview(e: FormEvent) {
    e.preventDefault()
    if (!review) return
    setError(''); setBusyId(review.stageId ?? review.quoteId)
    try {
      await api<SettlementResult>('/settlement/review', 'POST', {
        quoteId: review.quoteId, stageId: review.stageId,
        difficulty, cooperation, hazards: hazards.trim(), notes: notes.trim(),
      })
      setReview(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit review.')
    } finally {
      setBusyId(null)
    }
  }

  function unitAction(quoteId: string, stageId: string | null, st: SettlementStatus | null, label: string, key: string) {
    if (!st) return null
    if (st === 'PENDING_COMPLETION') {
      return <button className="yq-btn is-complete" disabled={busyId === key} onClick={() => complete(quoteId, stageId)}>
        {busyId === key ? 'Working…' : 'Mark complete'}</button>
    }
    if (st === 'PENDING_REVIEW') {
      return <button className="mt-continue yq-btn" onClick={() => openReview(quoteId, stageId, label)}>Review &amp; get paid</button>
    }
    return <span className="yq-settle">{settlementLabel(st)}</span>
  }

  const optionsFor = (key: string) => list.filters.find((f) => f.key === key)?.options ?? []

  const topBlock = useRef<HTMLDivElement | null>(null)
  const subTabs = (
    <div className="mj-subtabs" role="tablist" aria-label="Your quotes">
        {QUOTE_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`mj-subtab${tab === t.key ? ' is-on' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className={`mj-badge${t.key === 'ACTION' && actionRows.length > 0 ? ' is-waiting' : ''}`}>{countOf(t.key)}</span>
          </button>
        ))}
      </div>
  )

  return (
    <div className="mt pr yq">
      <div className="mt-head">
        <div className="mt-head-copy">
          <QuoteIcon />
          <div>
            <h2 className="mt-title">Your quotes</h2>
            <p className="mt-sub">Quotes you've sent, what you'll be paid, and where they stand. Open a quote to see the full breakdown.</p>
          </div>
        </div>
      </div>

      {error && <div className="msg err">{error}</div>}
      {quotes === null && !error && <div className="loading">Loading…</div>}

      <div ref={topBlock} className="mt-top">
      {quotes !== null && subTabs}

      {review && (
        <form className="pr-panel yq-review" onSubmit={submitReview}>
          <h4>Post-job review — {review.label}</h4>
          <p className="pr-panel-lead">Submitting your review releases your payout for this {review.stageId ? 'stage' : 'job'}.</p>
          <div className="pr-two yq-two">
            <label className="mt-field">
              <span>Job difficulty (1 easy – 5 hard)</span>
              <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="mt-field">
              <span>Customer cooperation (1 poor – 5 great)</span>
              <select value={cooperation} onChange={(e) => setCooperation(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-field">
            <span>Hazards encountered (optional)</span>
            <input value={hazards} onChange={(e) => setHazards(e.target.value)} />
          </label>
          <label className="mt-field">
            <span>Notes (optional)</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="pr-panel-actions">
            <button className="mt-btn-ghost" type="button" onClick={() => setReview(null)}>Cancel</button>
            <button className="mt-continue" type="submit" disabled={busyId !== null}>Submit review &amp; release payout</button>
          </div>
        </form>
      )}

      {tab === 'ACCEPTED' && acceptedQuotes.length > 0 && (
        <div className="mt-search pr-filters yq-filters">
          <label className="mt-field is-wide">
            <span>Search quotes</span>
            <span className="mt-input">
              <SearchIcon />
              <input type="search" value={list.view.search} placeholder="Search your quotes"
                onChange={(e) => list.setSearch(e.target.value)} />
            </span>
          </label>
          <label className="mt-field">
            <span>Quote status</span>
            <select value={list.view.filters.status ?? ''} onChange={(e) => list.setFilter('status', e.target.value)}>
              <option value="">All quote statuses</option>
              {optionsFor('status').map((o) => <option key={o.value} value={o.value}>{o.label === 'ACCEPTED' ? 'Accepted' : o.label}</option>)}
            </select>
          </label>
          <label className="mt-field">
            <span>Payment type</span>
            <select value={list.view.filters.payment ?? ''} onChange={(e) => list.setFilter('payment', e.target.value)}>
              <option value="">All payment types</option>
              {optionsFor('payment').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="mt-field">
            <span>Work state</span>
            <select value={list.view.filters.action ?? ''} onChange={(e) => list.setFilter('action', e.target.value)}>
              <option value="">All work states</option>
              {optionsFor('action').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="mt-field">
            <span>Sort by</span>
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

      {tab === 'ACCEPTED' && acceptedQuotes.length > 0 && (
        <h3 className="mt-count">{list.shown === list.total ? `${list.total} quote${list.total === 1 ? '' : 's'}` : `${list.shown} of ${list.total} quotes`}</h3>
      )}
      </div>

      {tab === 'ACCEPTED' && acceptedQuotes.length > 0 && (
        <StickyBar anchor={topBlock}>
          {subTabs}
          <span className="mt-input">
            <SearchIcon />
            <input type="search" value={list.view.search} placeholder="Search your quotes" aria-label="Search quotes"
              onChange={(e) => list.setSearch(e.target.value)} />
          </span>
          <span className="sb-count">{list.shown === list.total ? `${list.total} quote${list.total === 1 ? '' : 's'}` : `${list.shown} of ${list.total} quotes`}</span>
        </StickyBar>
      )}

      {tab === 'ACCEPTED' && acceptedQuotes.length === 0 && quotes !== null && (
        <div className="mt-empty">
          <p>No accepted quotes yet. Quotes the customer accepts appear here, with the actions that get you paid.</p>
          <button className="mt-continue" onClick={() => navigate('/home/requests')}>See requests to me</button>
        </div>
      )}

      {tab === 'ACCEPTED' && acceptedQuotes.length > 0 && list.shown === 0 && (
        <div className="mt-empty">
          <p>No quotes match these filters.</p>
          <button className="mt-btn-ghost" onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {tab === 'ACCEPTED' && list.shown > 0 && (
        <div className={layout === 'grid' ? 'pr-grid' : 'pr-list'}>
          {list.visible.map((q) => {
            const rowId = q.id ?? q.jobId
            const open = list.isExpanded(rowId)
            const action = needsAction(q)
            const reason = action ? actionReason(q) : null
            const customer = customerByJob[q.jobId]
            const staged = q.paymentType === 'STAGED' && (q.stages ?? []).length > 0
            // Platform charges as the owner's ledger spec presents them:
            // commission, Mate Points and any bonus the provider funds, each
            // with its GST. Customer pays - charges = You get paid. Sums of the
            // quote's own figures; nothing is recalculated.
            const chargesGst = q.commissionGst + q.pointsGst + q.bonusGst
            const charges = q.commission + q.points + q.bonus + chargesGst
            return (
              <article className={`pr-card pr-${layout} yq-card${action ? ' is-action' : ''}${open ? ' is-open' : ''}`} key={rowId}>
                <div className="yq-top">
                  <h3 className="pr-title">{q.jobTitle}</h3>
                  {q.status && <span className={`yq-status is-${q.status.toLowerCase()}`}>{q.status === 'ACCEPTED' ? 'Accepted' : q.status}</span>}
                  {q.jobId && refByJob[q.jobId] && <span className="mj-ref"><code>{refByJob[q.jobId]}</code></span>}
                </div>

                {customer && (
                  <div className="yq-cust">
                    <span className="mc-avatar yq-avatar" aria-hidden="true">{initialsOf(customer)}</span>
                    <span>{customer}</span>
                  </div>
                )}

                {reason && <p className="yq-reason">{reason}</p>}

                <div className="yq-figs">
                  <div className="yq-fig">
                    <span className="yq-fig-label" title="Customer pays">Customer pays</span>
                    <span className={`yq-fig-value${formatMoney(q.customerTotal).length >= 10 ? ' is-long' : ''}`}>{formatMoney(q.customerTotal)}</span>
                  </div>
                  <div className="yq-fig">
                    <span className="yq-fig-label" title="Platform charges">Platform charges</span>
                    <span className={`yq-fig-value${formatMoney(charges).length >= 10 ? ' is-long' : ''}`}>{formatMoney(charges)}</span>
                    <span className="yq-fig-note">incl GST {formatMoney(chargesGst)}</span>
                  </div>
                  <div className="yq-fig is-you">
                    <span className="yq-fig-label" title="You get paid">You get paid</span>
                    <span className={`yq-fig-value${formatMoney(q.providerPayable).length >= 10 ? ' is-long' : ''}`}>{formatMoney(q.providerPayable)}</span>
                  </div>
                </div>

                <div className="yq-row">
                  <span className="mc-chip">{q.paymentType === 'STAGED' ? 'Staged' : 'Full'}</span>
                  {q.createdAt && <span className="pr-sub">Sent {formatDate(q.createdAt)}</span>}
                  {/* Full-payment settlement action */}
                  {q.status === 'ACCEPTED' && q.paymentType !== 'STAGED' && q.id && (
                    <span className="yq-row-action">{unitAction(q.id, null, q.settlementStatus, q.jobTitle, q.id)}</span>
                  )}
                </div>
                {q.status === 'ACCEPTED' && q.paymentType !== 'STAGED' && <StageTimeline st={q.settlementStatus} />}

                {staged && (
                  <ol className="yq-stages" aria-label="Payment stages">
                    {q.stages.map((st, i) => (
                      <li className="yq-stage" key={st.id ?? st.name}>
                        <div className="yq-stage-head">
                          <span className="yq-stage-name">{i + 1}. {st.name}{st.completion ? ' (auto)' : ''} · {st.percent}%</span>
                          <span className="yq-stage-amt"><span className="nw">{formatMoney(st.customerTotal)}</span> <span className="pr-amt-label nw">· you get {formatMoney(st.providerPayable)}</span></span>
                        </div>
                        <StageTimeline st={st.settlementStatus} />
                        {q.status === 'ACCEPTED' && st.id && (st.settlementStatus === 'PENDING_COMPLETION' || st.settlementStatus === 'PENDING_REVIEW') && (
                          <div className="yq-stage-action">
                            {unitAction(q.id!, st.id, st.settlementStatus, `${q.jobTitle} — ${st.name}`, st.id)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                <button className="pr-link yq-toggle" onClick={() => list.toggleExpanded(rowId)} aria-expanded={open}>
                  {open ? 'Hide details' : 'View details'}
                </button>

                {open && (
                  <div className="yq-detail">
                    {q.lineItems.length > 0 && (
                      <div className="yq-lines">
                        {q.lineItems.map((li, i) => (
                          <div className="pr-b-row" key={i}><span>{li.description}</span><span>{formatMoney(li.amount)}</span></div>
                        ))}
                      </div>
                    )}
                    {q.message && <p className="pr-desc yq-msg">{q.message}</p>}
                    <div className="pr-b-row is-points"><span>Customer earns</span><span>{formatMoney(q.pointsEarned)} in points</span></div>
                    <div className="pr-b-row is-points">
                      <span>Rates applied</span>
                      <span>{q.commissionRate}% commission &middot; {q.pointsRate}% Mate Points</span>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* Action needed and Declined are request rows, not quotes — the same
          records Requests to Me shows, so a provider can act without leaving
          this tab. Nothing here changes where those items also appear. */}
      {(tab === 'ACTION' || tab === 'DECLINED') && pipeline === null && !error && (
        <div className="loading">Loading…</div>
      )}

      {tab === 'ACTION' && pipeline !== null && actionRows.length === 0 && (
        <div className="mt-empty"><p>Nothing waiting on a reply from you.</p></div>
      )}

      {tab === 'DECLINED' && pipeline !== null && declinedRows.length === 0 && (
        <div className="mt-empty"><p>No declined or lost requests.</p></div>
      )}

      {(tab === 'ACTION' || tab === 'DECLINED') && (
        <div className="pr-list">
          {(tab === 'ACTION' ? actionRows : declinedRows).map((row) => (
            <article className={`pr-card pr-list${tab === 'ACTION' ? ' is-action' : ''}`} key={row.jobId}>
              <div className="pr-head">
                <span className="mc-avatar pr-avatar" aria-hidden="true">{initialsOf(row.customerName)}</span>
                <div className="pr-body">
                  <h3 className="pr-title">{row.jobTitle}</h3>
                  <div className="pr-meta">
                    <span className="mc-chip">{industryOf(row)}</span>
                    <span className="mc-line"><PinIcon /> {row.suburb}</span>
                    {row.requestRef && <span className="mj-ref"><code>{row.requestRef}</code></span>}
                  </div>
                  <p className="pr-sub">
                    {row.customerName} · requested {formatDate(row.requestedAt)}
                    {row.timeFrame && <> · {row.timeFrame}</>}
                  </p>
                </div>
                <div className="pr-side">
                  {row.quoteTotal !== null && (
                    <div className="pr-amt"><span><span className="pr-amt-label">Customer pays</span> {formatMoney(row.quoteTotal)}</span></div>
                  )}
                  {tab === 'ACTION' ? (
                    <button className="mt-continue" onClick={() => navigate('/home/requests')}>Send a quote →</button>
                  ) : (
                    <span className="pr-tag">{OUTCOME_LABELS[row.outcome]}</span>
                  )}
                </div>
              </div>

              {row.outcome === 'DECLINED' && row.declineMessage && (
                <div className="mj-declined">
                  <span className="mj-declined-head">You declined this request</span>
                  <p>{row.declineMessage}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The short line saying what the provider has to do next (handoff Part K).
 * A review waiting to release money comes first; then the next unit to mark
 * complete. Reads the quote's own settlement states only.
 */
function actionReason(q: ProviderQuote): string | null {
  const stages = q.paymentType === 'STAGED' ? (q.stages ?? []) : []
  if (stages.length > 0) {
    const reviewAt = stages.findIndex((st) => st.settlementStatus === 'PENDING_REVIEW')
    if (reviewAt >= 0) return `Submit your review to release ${formatMoney(stages[reviewAt].providerPayable)}`
    const completeAt = stages.findIndex((st) => st.settlementStatus === 'PENDING_COMPLETION')
    if (completeAt >= 0) return `Mark stage ${completeAt + 1} complete`
    return null
  }
  if (q.settlementStatus === 'PENDING_REVIEW') return `Submit your review to release ${formatMoney(q.providerPayable)}`
  if (q.settlementStatus === 'PENDING_COMPLETION') return 'Mark the job complete'
  return null
}

/**
 * One stage's place on the owner's ladder:
 * Not started → Marked complete → Awaiting payment → Review & get paid → Paid.
 * "Marked complete" and "Awaiting payment" are the same settlement state
 * (PENDING_PAYMENT), so both light up together.
 */
const LADDER = ['Not started', 'Marked complete', 'Awaiting payment', 'Review & get paid', 'Paid'] as const

function ladderStep(st: ProviderQuoteStage['settlementStatus']): number {
  switch (st) {
    case 'PENDING_PAYMENT': return 2
    case 'PENDING_REVIEW': return 3
    case 'PAID': return 5
    default: return 0
  }
}

/** The unit's state on the shared step line (design v2). */
function StageTimeline({ st }: { st: SettlementStatus | null }) {
  return <div className="yq-ladder"><StepLine done={ladderStep(st)} labels={LADDER} /></div>
}

/* ---------- icons (decorative) ---------- */

function QuoteIcon() {
  return (
    <svg aria-hidden="true" className="mt-head-ico" width="46" height="46" viewBox="0 0 24 24" fill="none"
      stroke="#0B2038" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
      <path d="M9 14.5l2 2 4-4.5" stroke="#D9A400" strokeWidth="2.2" />
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
