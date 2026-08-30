import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ListControls } from '../components/ListControls'
import { byDate, byNumber, byText, optionsFrom, useListView } from '../listView'
import {
  formatDate, formatMoney, settlementLabel,
  type ProviderQuote, type SettlementResult, type SettlementStatus,
} from '../types'

interface ReviewTarget { quoteId: string; stageId: string | null; label: string }

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
  const [quotes, setQuotes] = useState<ProviderQuote[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const [review, setReview] = useState<ReviewTarget | null>(null)
  const [difficulty, setDifficulty] = useState(3)
  const [cooperation, setCooperation] = useState(3)
  const [hazards, setHazards] = useState('')
  const [notes, setNotes] = useState('')

  const list = useListView<ProviderQuote>('provider.quotes', quotes, {
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

  useEffect(() => { load() }, [])

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
        <button className="btn btn-amber" onClick={() => navigate('/requests')}>See requests</button>
      </div>
      <p className="page-intro">Quotes you've sent, what you'll be paid, and where they stand. Open a quote to see the full breakdown.</p>

      {error && <div className="msg err">{error}</div>}
      {quotes === null && !error && <div className="loading">Loading…</div>}

      {quotes !== null && quotes.length === 0 && (
        <div className="empty">
          <p>You haven't sent any quotes yet.</p>
          <button className="btn btn-amber" onClick={() => navigate('/requests')} style={{ marginTop: 12 }}>See requests to me</button>
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

      {quotes && quotes.length > 0 && (
        <ListControls list={list} searchPlaceholder="Search your quotes" countLabel="quotes" />
      )}

      {quotes && quotes.length > 0 && list.shown === 0 && (
        <div className="empty">
          <p>No quotes match these filters.</p>
          <button className="btn btn-ghost-dark" style={{ marginTop: 12 }} onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {list.shown > 0 && (
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
    </>
  )
}
