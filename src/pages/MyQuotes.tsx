import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { ArrowIcon, EmptyState, GridIcon, InitialsAvatar, ListIcon, PageHead, PinIcon, SearchIcon } from '../components/PageParts'
import { RefPill, SubTabs } from '../components/JobParts'
import { RequestCompactCard } from '../components/RequestCards'
import { DocTickIcon, FigureTrio, PaymentChip, QuoteCompactCard, ReasonLine, ReviewForm, StageTimeline } from '../components/QuoteCards'
import { byDate, byNumber, byText, optionsFrom, useListView, usePersistedValue } from '../listView'
import {
  CATEGORY_LABELS, OUTCOME_LABELS,
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

  // The pipeline rows themselves, not just their references — two of the three
  // sub-pages are built from these rather than from quotes.
  const [pipeline, setPipeline] = useState<ProviderRequestRow[] | null>(null)

  const [tab, setTab] = usePersistedValue<QuoteTab>('provider.quotes.tab', 'ACCEPTED')

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
        rows.forEach((r) => { if (r.requestRef) map[r.jobId] = r.requestRef })
        setRefByJob(map)
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
      return <button type="button" className="pg-btn pg-btn-navy pk-sm" disabled={busyId === key} onClick={() => complete(quoteId, stageId)}>
        {busyId === key ? 'Working…' : 'Mark complete'}</button>
    }
    if (st === 'PENDING_REVIEW') {
      return <button type="button" className="pg-btn pg-btn-yellow pk-sm" onClick={() => openReview(quoteId, stageId, label)}>Review &amp; get paid</button>
    }
    return <span className="pk-settle">{settlementLabel(st)}</span>
  }

  /* ---------- display helpers (read already-loaded data only) ---------- */

  // List or Grid, remembered like the other tabs (display option only).
  const [layout, setLayout] = usePersistedValue<'list' | 'grid'>('provider.quotes.layout', 'list')
  // Grid only: which request rows (Action needed / Declined) are opened up.
  const [openRows, setOpenRows] = useState<string[]>([])
  const toggleRow = (id: string) =>
    setOpenRows((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const customerOf = (jobId: string) => (pipeline ?? []).find((r) => r.jobId === jobId)?.customerName ?? null

  /** What the provider has to do next on this quote, in words, from its settlement state. */
  function nextStep(q: ProviderQuote): { kind: 'complete' | 'review'; text: string; stage: ProviderQuoteStage | null } | null {
    if (!needsAction(q)) return null
    if (q.paymentType === 'STAGED') {
      const st = (q.stages ?? []).find((s) => s.settlementStatus === 'PENDING_COMPLETION' || s.settlementStatus === 'PENDING_REVIEW')
      if (!st) return null
      return st.settlementStatus === 'PENDING_REVIEW'
        ? { kind: 'review', text: `Submit your review to release ${formatMoney(st.providerPayable)}`, stage: st }
        : { kind: 'complete', text: `Mark ${st.name} complete`, stage: st }
    }
    return q.settlementStatus === 'PENDING_REVIEW'
      ? { kind: 'review', text: `Submit your review to release ${formatMoney(q.providerPayable)}`, stage: null }
      : { kind: 'complete', text: 'Mark the job complete', stage: null }
  }

  const anyAcceptedAction = acceptedQuotes.some(needsAction)

  // The review form sits inside its quote's card when that card is on screen,
  // otherwise at the top of the page (where it always used to be).
  const reviewQuote = review ? list.visible.find((q) => q.id === review.quoteId) : undefined
  const reviewInCard = review !== null && tab === 'ACCEPTED' && reviewQuote !== undefined
    && (layout === 'list' || list.isExpanded(reviewQuote.id ?? reviewQuote.jobId))

  const reviewForm = review && (
    <ReviewForm
      label={review.label}
      isStage={review.stageId !== null}
      difficulty={difficulty}
      cooperation={cooperation}
      hazards={hazards}
      notes={notes}
      onDifficulty={setDifficulty}
      onCooperation={setCooperation}
      onHazards={setHazards}
      onNotes={setNotes}
      submitDisabled={busyId !== null}
      onSubmit={submitReview}
      onCancel={() => setReview(null)}
    />
  )

  const requestRows = tab === 'ACTION' ? actionRows : tab === 'DECLINED' ? declinedRows : []

  return (
    <div className="pg pk">
      <PageHead
        icon={<DocTickIcon />}
        title="Your quotes"
        intro="Quotes you've sent, what you'll be paid, and where they stand. Open a quote to see the full breakdown."
        action={<button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/home/requests')}>See requests</button>}
      />

      {error && <div className="pg-error" role="alert">{error}</div>}
      {quotes === null && !error && <div className="pg-loading">Loading…</div>}

      {quotes !== null && (
        <SubTabs
          label="Your quotes by stage"
          active={tab}
          onChange={setTab}
          tabs={QUOTE_TABS.map((t) => ({
            key: t.key,
            label: t.label,
            count: countOf(t.key),
            attention: (t.key === 'ACTION' && actionRows.length > 0) || (t.key === 'ACCEPTED' && anyAcceptedAction),
          }))}
        />
      )}

      {review && !reviewInCard && <div className="pk-review-top">{reviewForm}</div>}

      {/* Filters: the same list state as before (Accepted only, as before). */}
      {tab === 'ACCEPTED' && acceptedQuotes.length > 0 && (
        <div className="pg-searchrow pk-filters">
          <div className="pg-field pg-field-grow">
            <label htmlFor="pk-search">Search your quotes</label>
            <span className="pg-input-ico">
              <SearchIcon />
              <input
                id="pk-search"
                type="search"
                value={list.view.search}
                placeholder="Job title or message"
                onChange={(e) => list.setSearch(e.target.value)}
              />
            </span>
          </div>
          {list.filters.map((f) => (
            <div className="pg-field" key={f.key}>
              <label htmlFor={`pk-${f.key}`}>
                {f.key === 'status' ? 'Quote status' : f.key === 'payment' ? 'Payment' : 'Work state'}
              </label>
              <select id={`pk-${f.key}`} value={list.view.filters[f.key] ?? ''} onChange={(e) => list.setFilter(f.key, e.target.value)}>
                <option value="">All {f.label.toLowerCase()}</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div className="pg-field">
            <label htmlFor="pk-sort">Sort by</label>
            <span className="jb-sortbox">
              <select id="pk-sort" value={list.view.sortKey} onChange={(e) => list.setSort(e.target.value)}>
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

      {quotes !== null && (
        <div className="pg-toolbar">
          {tab === 'ACCEPTED' && acceptedQuotes.length > 0 ? (
            <h3 className="pg-count">
              {list.shown === list.total ? `${list.total} quote${list.total === 1 ? '' : 's'}` : `${list.shown} of ${list.total} quotes`}
            </h3>
          ) : tab !== 'ACCEPTED' && requestRows.length > 0 ? (
            <h3 className="pg-count">{requestRows.length} request{requestRows.length === 1 ? '' : 's'}</h3>
          ) : <span />}
          <div className="pg-toolbar-end">
            {tab === 'ACCEPTED' && acceptedQuotes.length > 0 && list.dirty && (
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

      {tab === 'ACCEPTED' && acceptedQuotes.length === 0 && quotes !== null && (
        <EmptyState
          action={<button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/home/requests')}>See requests to me</button>}
        >
          No accepted quotes yet. Quotes the customer accepts appear here, with the actions that get you paid.
        </EmptyState>
      )}

      {tab === 'ACCEPTED' && acceptedQuotes.length > 0 && list.shown === 0 && (
        <EmptyState action={<button type="button" className="pg-btn pg-btn-ghost" onClick={list.clear}>Clear filters</button>}>
          No quotes match these filters.
        </EmptyState>
      )}

      {tab === 'ACCEPTED' && list.shown > 0 && (
        <div className={layout === 'grid' ? 'jb-grid' : 'jb-list'}>
          {list.visible.map((q) => {
            const rowId = q.id ?? q.jobId
            const open = list.isExpanded(rowId)
            const step = nextStep(q)
            const customer = customerOf(q.jobId)
            const ref = q.jobId ? refByJob[q.jobId] ?? null : null
            const staged = q.paymentType === 'STAGED'

            if (layout === 'grid' && !open) {
              return (
                <QuoteCompactCard
                  key={rowId}
                  title={q.jobTitle}
                  customerName={customer}
                  refValue={ref}
                  staged={staged}
                  customerPays={q.customerTotal}
                  youGet={q.providerPayable}
                  reason={step ? step.text : null}
                  actionLabel={step?.kind === 'review' ? 'Review & get paid' : step?.kind === 'complete' ? 'Open to mark complete' : 'View details'}
                  onAction={() => {
                    list.setExpanded(rowId, true)
                    if (step?.kind === 'review' && q.id) {
                      openReview(q.id, step.stage?.id ?? null, step.stage ? `${q.jobTitle} — ${step.stage.name}` : q.jobTitle)
                    }
                  }}
                  onOpen={() => list.setExpanded(rowId, true)}
                />
              )
            }

            return (
              <article
                key={rowId}
                className={`jb-card pk-card${step ? ' is-attention' : ''}${layout === 'grid' ? ' jb-span' : ''}`}
              >
                {layout === 'grid' && (
                  <button type="button" className="pg-link jb-less" aria-expanded="true" onClick={() => list.setExpanded(rowId, false)}>
                    Show less
                  </button>
                )}

                <div className="pk-head">
                  <div className="pk-head-main">
                    <h3 className="pk-title">{q.jobTitle}</h3>
                    <div className="pk-tags">
                      {q.status && <span className="pk-status">{q.status.charAt(0) + q.status.slice(1).toLowerCase()}</span>}
                      <PaymentChip staged={staged} />
                      {ref && <RefPill value={ref} />}
                    </div>
                    <p className="pk-who">
                      {customer && <><InitialsAvatar name={customer} size="sm" /><span>{customer}</span></>}
                      {q.createdAt && <span className="pk-sent">{customer ? '· ' : ''}Sent {formatDate(q.createdAt)}</span>}
                    </p>
                  </div>
                  {/* Full payment: the settlement action sits on the card. */}
                  {q.status === 'ACCEPTED' && !staged && q.id && (
                    <div className="pk-head-act">{unitAction(q.id, null, q.settlementStatus, q.jobTitle, q.id)}</div>
                  )}
                </div>

                {step && <ReasonLine>{step.text}</ReasonLine>}

                <FigureTrio customerPays={q.customerTotal} commission={q.commission} youGet={q.providerPayable} />

                {staged && q.stages && q.stages.length > 0 && (
                  <StageTimeline
                    stages={q.stages}
                    actionFor={(st) => (q.status === 'ACCEPTED' && st.id
                      ? unitAction(q.id!, st.id, st.settlementStatus, `${q.jobTitle} — ${st.name}`, st.id)
                      : null)}
                  />
                )}

                {review && reviewInCard && reviewQuote?.id === q.id && reviewForm}

                {layout === 'list' && (
                  <button type="button" className="pg-link pk-toggle" aria-expanded={open} onClick={() => list.toggleExpanded(rowId)}>
                    {open ? 'Hide details' : 'View details'}
                  </button>
                )}

                {(open || layout === 'grid') && (
                  <div className="pk-details">
                    {q.lineItems.length > 0 && (
                      <div className="pk-lines">
                        {q.lineItems.map((li, i) => (
                          <div className="pk-line" key={i}><span>{li.description}</span><span>{formatMoney(li.amount)}</span></div>
                        ))}
                      </div>
                    )}
                    {q.message && <p className="pk-message">{q.message}</p>}
                    <div className="pk-more">
                      <span>Customer earns <strong>{formatMoney(q.pointsEarned)}</strong> in points</span>
                      <span>Rates applied: {q.commissionRate}% commission &middot; {q.pointsRate}% Mate Points</span>
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
        <div className="pg-loading">Loading…</div>
      )}

      {tab === 'ACTION' && pipeline !== null && actionRows.length === 0 && (
        <EmptyState>Nothing waiting on a reply from you.</EmptyState>
      )}

      {tab === 'DECLINED' && pipeline !== null && declinedRows.length === 0 && (
        <EmptyState>No declined or lost requests.</EmptyState>
      )}

      {(tab === 'ACTION' || tab === 'DECLINED') && requestRows.length > 0 && (
        <div className={layout === 'grid' ? 'jb-grid' : 'jb-list'}>
          {requestRows.map((row) => {
            const isAction = tab === 'ACTION'
            if (layout === 'grid' && !openRows.includes(row.jobId)) {
              return (
                <RequestCompactCard
                  key={row.jobId}
                  title={row.jobTitle}
                  customerName={row.customerName}
                  industry={CATEGORY_LABELS[row.category]}
                  suburb={row.suburb}
                  date={formatDate(row.requestedAt)}
                  refValue={row.requestRef}
                  expiresAt={null}
                  outcomeLabel={OUTCOME_LABELS[row.outcome]}
                  attention={isAction}
                  actionLabel={isAction ? 'Send a quote' : undefined}
                  onAction={isAction ? () => navigate('/home/requests') : undefined}
                  onOpen={() => toggleRow(row.jobId)}
                />
              )
            }
            return (
              <article
                key={row.jobId}
                className={`jb-card pr-card${isAction ? ' is-attention' : ''}${layout === 'grid' ? ' jb-span' : ''}`}
              >
                {layout === 'grid' && (
                  <button type="button" className="pg-link jb-less" aria-expanded="true" onClick={() => toggleRow(row.jobId)}>
                    Show less
                  </button>
                )}
                <div className="pr-row">
                  <InitialsAvatar name={row.customerName} />
                  <div className="pr-main">
                    <h3 className="pr-title">{row.jobTitle}</h3>
                    <div className="pr-meta">
                      <span className="pg-chip">{CATEGORY_LABELS[row.category]}</span>
                      <span className="pr-meta-item"><PinIcon />{row.suburb}</span>
                      {row.requestRef && <RefPill value={row.requestRef} />}
                    </div>
                    <p className="pr-sub">
                      Customer: <strong>{row.customerName}</strong> · {formatDate(row.requestedAt)}
                      {row.timeFrame && <> · {row.timeFrame}</>}
                    </p>
                  </div>
                  <div className="pr-side">
                    {row.quoteTotal !== null && (
                      <div className="pr-amount"><span>Customer pays <strong>{formatMoney(row.quoteTotal)}</strong></span></div>
                    )}
                    {isAction ? (
                      <button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/home/requests')}>
                        Send a quote <ArrowIcon />
                      </button>
                    ) : (
                      <span className="pr-tag">{OUTCOME_LABELS[row.outcome]}</span>
                    )}
                  </div>
                </div>
                {row.outcome === 'DECLINED' && row.declineMessage && (
                  <div className="pr-declined">
                    <span className="pr-declined-head">You declined this request</span>
                    <p>{row.declineMessage}</p>
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
