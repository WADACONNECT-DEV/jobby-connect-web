import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { ListControls } from '../components/ListControls'
import { byDate, byNumber, byText, optionsFrom, useListView, usePersistedValue } from '../listView'
import {
  CATEGORY_LABELS, OUTCOME_LABELS,
  formatDate, formatMoney, settlementLabel,
  type ProviderQuote, type ProviderRequestRow, type SettlementResult, type SettlementStatus,
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
      return <button className="btn btn-green btn-xs" disabled={busyId === key} onClick={() => complete(quoteId, stageId)}>
        {busyId === key ? 'Working…' : 'Mark complete'}</button>
    }
    if (st === 'PENDING_REVIEW') {
      return <button className="btn btn-amber btn-xs" onClick={() => openReview(quoteId, stageId, label)}>Review &amp; get paid</button>
    }
    return <span className="stage-settle">{settlementLabel(st)}</span>
  }

  return (
    <>
      <div className="page-head">
        <h2>Your quotes</h2>
        <button className="btn btn-amber" onClick={() => navigate('/home/requests')}>See requests</button>
      </div>
      <p className="page-intro">Quotes you've sent, what you'll be paid, and where they stand. Open a quote to see the full breakdown.</p>

      {error && <div className="msg err">{error}</div>}
      {quotes === null && !error && <div className="loading">Loading…</div>}

      {quotes !== null && (
        <div className="pipe-tabs" role="tablist">
          {QUOTE_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`pipe-tab${tab === t.key ? ' active' : ''}${t.key === 'ACTION' && actionRows.length > 0 ? ' due' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="pipe-count">{countOf(t.key)}</span>
            </button>
          ))}
        </div>
      )}

      {review && (
        <div className="md-panel" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Post-job review — {review.label}</h3>
          <p className="page-intro" style={{ marginTop: 0 }}>Submitting your review releases your payout for this {review.stageId ? 'stage' : 'job'}.</p>
          <form onSubmit={submitReview}>
            <div className="row2">
              <div>
                <label>Job difficulty (1 easy – 5 hard)</label>
                <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label>Customer cooperation (1 poor – 5 great)</label>
                <select value={cooperation} onChange={(e) => setCooperation(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <label style={{ marginTop: 10 }}>Hazards encountered (optional)</label>
            <input value={hazards} onChange={(e) => setHazards(e.target.value)} />
            <label style={{ marginTop: 10 }}>Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <button className="btn btn-amber btn-sm" type="submit" disabled={busyId !== null}>Submit review &amp; release payout</button>
              <button className="btn btn-ghost-dark btn-sm" type="button" onClick={() => setReview(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {tab === 'ACCEPTED' && acceptedQuotes.length > 0 && (
        <ListControls list={list} searchPlaceholder="Search your quotes" countLabel="quotes" />
      )}

      {tab === 'ACCEPTED' && acceptedQuotes.length === 0 && quotes !== null && (
        <div className="empty">
          <p>No accepted quotes yet. Quotes the customer accepts appear here, with the actions that get you paid.</p>
          <button className="btn btn-amber" onClick={() => navigate('/home/requests')} style={{ marginTop: 12 }}>See requests to me</button>
        </div>
      )}

      {tab === 'ACCEPTED' && acceptedQuotes.length > 0 && list.shown === 0 && (
        <div className="empty">
          <p>No quotes match these filters.</p>
          <button className="btn btn-ghost-dark" style={{ marginTop: 12 }} onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {tab === 'ACCEPTED' && list.shown > 0 && (
        <div className="job-list">
          {list.visible.map((q) => {
            const rowId = q.id ?? q.jobId
            const open = list.isExpanded(rowId)
            const action = needsAction(q)
            return (
              <div className="job-card" key={rowId}>
                {/* Summary row — title, status, amount. Collapsed by default (UAT §5.2). */}
                <div className="sum-row">
                  <span className="sum-main">
                    <span className="sum-title">{q.jobTitle}</span>
                    {q.status && <span className={`status status-${q.status.toLowerCase()}`}>{q.status}</span>}
                    {action && <span className="sum-flag">Action needed</span>}
                  </span>
                  <span className="sum-right">
                    <span className="sum-amt">{formatMoney(q.customerTotal)}</span>
                    <button className="btn btn-ghost-dark btn-xs" onClick={() => list.toggleExpanded(rowId)}>
                      {open ? 'Hide' : 'View'}
                    </button>
                  </span>
                </div>

                {q.jobId && refByJob[q.jobId] && (
                  <div className="ref-list">
                    <span className="ref-item"><code className="req-ref">{refByJob[q.jobId]}</code></span>
                  </div>
                )}

                {open && (
                  <>
                    {q.lineItems.length > 0 && (
                      <div className="qmini">
                        {q.lineItems.map((li, i) => (
                          <div className="qmini-row" key={i}><span>{li.description}</span><span>{formatMoney(li.amount)}</span></div>
                        ))}
                      </div>
                    )}
                    {q.message && <p className="job-desc">{q.message}</p>}
                    <div className="quote-breakdown">
                      <div className="qb-row qb-total"><span>Customer pays</span><span>{formatMoney(q.customerTotal)}</span></div>
                      <div className="qb-row qb-you"><span>You get paid</span><span>{formatMoney(q.providerPayable)}</span></div>
                      <div className="qb-row qb-points"><span>Customer earns</span><span>{formatMoney(q.pointsEarned)} in points</span></div>
                      <div className="qb-row qb-rate">
                        <span>Rates applied</span>
                        <span>{q.commissionRate}% commission &middot; {q.pointsRate}% Mate Points</span>
                      </div>
                      {q.stages && q.stages.length > 0 && (
                        <div className="stage-preview">
                          <div className="stage-preview-head">Payment stages</div>
                          {q.stages.map((st) => (
                            <div className="stage-row" key={st.id ?? st.name}>
                              <span>{st.name}{st.completion ? ' (auto)' : ''} · {st.percent}%</span>
                              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {formatMoney(st.customerTotal)} · you get {formatMoney(st.providerPayable)}
                                {q.status === 'ACCEPTED' && st.id &&
                                  unitAction(q.id!, st.id, st.settlementStatus, `${q.jobTitle} — ${st.name}`, st.id)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Full-payment settlement action */}
                    {q.status === 'ACCEPTED' && q.paymentType !== 'STAGED' && q.id && (
                      <div className="quote-item-foot">
                        {unitAction(q.id, null, q.settlementStatus, q.jobTitle, q.id)}
                      </div>
                    )}
                    <div className="job-foot">
                      <span className="job-date">{q.createdAt ? `Sent ${formatDate(q.createdAt)}` : ''}</span>
                      <span className="job-by">{q.paymentType === 'STAGED' ? 'Staged payment' : 'Full payment'}</span>
                    </div>
                  </>
                )}
              </div>
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
        <div className="empty"><p>Nothing waiting on a reply from you.</p></div>
      )}

      {tab === 'DECLINED' && pipeline !== null && declinedRows.length === 0 && (
        <div className="empty"><p>No declined or lost requests.</p></div>
      )}

      {(tab === 'ACTION' || tab === 'DECLINED') && (
        <div className="job-list">
          {(tab === 'ACTION' ? actionRows : declinedRows).map((row) => (
            <div className="job-card" key={row.jobId}>
              <div className="sum-row">
                <span className="sum-main">
                  <span className="sum-title">{row.jobTitle}</span>
                  <span className="tag-muted">{OUTCOME_LABELS[row.outcome]}</span>
                </span>
                <span className="sum-right">
                  {row.quoteTotal !== null && <span className="sum-amt">{formatMoney(row.quoteTotal)}</span>}
                  {tab === 'ACTION' && (
                    <button className="btn btn-amber btn-xs" onClick={() => navigate('/home/requests')}>
                      Send a quote
                    </button>
                  )}
                </span>
              </div>

              <div className="job-meta">
                <span className="chip">{CATEGORY_LABELS[row.category]}</span>
                <span>{row.suburb}</span>
                {row.timeFrame && <span>· {row.timeFrame}</span>}
                <span className="job-date">· {formatDate(row.requestedAt)}</span>
              </div>

              <p className="job-assigned">Customer: <strong>{row.customerName}</strong></p>

              {row.requestRef && (
                <div className="ref-list">
                  <span className="ref-item"><code className="req-ref">{row.requestRef}</code></span>
                </div>
              )}

              {row.outcome === 'DECLINED' && row.declineMessage && (
                <div className="decline-note">
                  <span className="decline-note-head">You declined this request</span>
                  <p>{row.declineMessage}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
