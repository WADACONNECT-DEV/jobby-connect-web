import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Stars, StarInput } from '../components/Stars'
import { ListControls } from '../components/ListControls'
import { ProgressBar } from '../components/ProgressBar'
import { ImageUploader } from '../components/ImageUploader'
import { byDate, byText, optionsFrom, useListView } from '../listView'
import { CATEGORY_LABELS, METHOD_LABELS, SIMULATION_LABELS, formatDate, formatDateTime, formatMoney, statusLabel, settlementLabel, type CustomerQuote, type Job, type PaymentCapabilities, type PaymentMethod, type PaymentResult, type PaymentSimulation, type ProgressEntry, type Review, type ServiceCategory, type Wallet } from '../types'

export default function MyJobs() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [error, setError] = useState('')

  const [quotesByJob, setQuotesByJob] = useState<Record<string, CustomerQuote[]>>({})
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [actionError, setActionError] = useState('')
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

  // Filter / sort / expand state for this box. Held outside the component so
  // it survives leaving the page and coming Back (UAT §5.3).
  const list = useListView<Job>('customer.jobs', jobs, {
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

  async function jobAction(jobId: string, action: 'cancel') {
    setActionError(''); setBusyId(jobId)
    try {
      await api<Job>(`/jobs/${jobId}/${action}`, 'POST')
      await loadJobs()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Could not ${action} the job.`)
    } finally { setBusyId(null) }
  }

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
    <>
      <div className="page-head">
        <h2>Your requests &amp; jobs</h2>
        <button className="btn btn-amber" onClick={() => navigate('/search')}>New request</button>
      </div>

      {error && <div className="msg err">{error}</div>}
      {jobs === null && !error && <div className="loading">Loading…</div>}

      {jobs !== null && jobs.length === 0 && (
        <div className="empty">
          <p>You haven't requested any quotes yet.</p>
          <button className="btn btn-amber" onClick={() => navigate('/search')} style={{ marginTop: 12 }}>Find providers</button>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <ListControls list={list} searchPlaceholder="Search your requests" countLabel="requests" />
      )}

      {jobs && jobs.length > 0 && list.shown === 0 && (
        <div className="empty">
          <p>No requests match these filters.</p>
          <button className="btn btn-ghost-dark" style={{ marginTop: 12 }} onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {jobs && list.shown > 0 && (
        <div className="job-list">
          {list.visible.map((job) => {
            const quotes = quotesByJob[job.id]
            const isOpen = list.isExpanded(job.id)
            const busy = busyId === job.id
            const review = reviewByJob[job.id]
            const history = progressByJob[job.id] ?? []
            const latest = history[0]
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

                {(job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
                  <ImageUploader jobId={job.id} kind="PROGRESS" label="Progress photos" />
                )}
                {(job.status === 'IN_PROGRESS' || job.status === 'COMPLETED') && (
                  <ImageUploader jobId={job.id} kind="COMPLETION" label="Completion photos" />
                )}

                {job.status === 'OPEN' && (
                  <p className="job-assigned">
                    {job.targetProviders && job.targetProviders.length > 0 ? (
                      <>Sent to: <strong>{job.targetProviders.map((t) => t.name).join(', ')}</strong> · awaiting quotes</>
                    ) : (
                      <>Sent to {job.targetCount} provider{job.targetCount > 1 ? 's' : ''} · awaiting quotes</>
                    )}
                  </p>
                )}
                {job.providerName && job.status !== 'OPEN' && (
                  <p className="job-assigned">Assigned to <strong>{job.providerName}</strong></p>
                )}

                <div className="job-foot">
                  {job.status === 'OPEN' && (
                    <button className="btn btn-ghost-dark btn-sm" onClick={() => toggleQuotes(job.id)}>{isOpen ? 'Hide quotes' : 'View quotes'}</button>
                  )}
                  <div className="job-actions">
                    {(job.status === 'ACCEPTED' || job.status === 'IN_PROGRESS') && (
                      <button className="btn btn-ghost-dark btn-sm" disabled={busy} onClick={() => jobAction(job.id, 'cancel')}>Cancel</button>
                    )}
                    {job.status === 'COMPLETED' && review === null && reviewOpenFor !== job.id && (
                      <button className="btn btn-amber btn-sm" onClick={() => openReview(job.id)}>Leave a review</button>
                    )}
                  </div>
                </div>

                {job.status === 'COMPLETED' && review && (
                  <div className="review-done">
                    <Stars value={review.rating} />
                    {review.comment && <p className="review-comment">"{review.comment}"</p>}
                  </div>
                )}

                {reviewOpenFor === job.id && (
                  <form className="review-form" onSubmit={(e) => submitReview(e, job.id)}>
                    {reviewError && <div className="msg err">{reviewError}</div>}
                    <label>How was {job.providerName}?</label>
                    <StarInput value={rating} onChange={setRating} />
                    <label style={{ marginTop: 10 }}>Comment (optional)</label>
                    <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How did the job go?" />
                    <div className="quote-actions">
                      <button type="button" className="btn btn-ghost-dark btn-sm" onClick={() => setReviewOpenFor(null)}>Cancel</button>
                      <button type="submit" className="btn btn-amber btn-sm" disabled={busy}>{busy ? 'Submitting…' : 'Submit review'}</button>
                    </div>
                  </form>
                )}

                {caps && quotes && quotes.some((q) => q.settlementStatus === 'PENDING_PAYMENT'
                  || (q.stages ?? []).some((st) => st.settlementStatus === 'PENDING_PAYMENT')) && (
                  <div className="pay-bar">
                    <label className="pay-label">Pay with</label>
                    <select className="lv-select" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                      {caps.methods.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                    </select>
                    {caps.simulationEnabled && (
                      <>
                        <label className="pay-label">Test outcome</label>
                        <select className="lv-select" value={simulate} onChange={(e) => setSimulate(e.target.value as PaymentSimulation)}>
                          {caps.simulations.map((sim) => (
                            <option key={sim} value={sim}>{SIMULATION_LABELS[sim]}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                )}

                {isOpen && job.status === 'OPEN' && (
                  <div className="quotes-panel">
                    {actionError && <div className="msg err">{actionError}</div>}
                    {loadingQuotes && !quotes && <div className="loading">Loading quotes…</div>}
                    {quotes && quotes.length === 0 && <p className="quotes-empty">No quotes yet — your providers haven't replied.</p>}
                    {quotes && quotes.length > 0 && (
                      <div className="quote-list">
                        {quotes.map((q) => (
                          <div className="quote-item" key={q.id}>
                            <div className="quote-item-main">
                              <span className="quote-provider">{q.providerName}</span>
                              <span className="quote-price">{formatMoney(q.total)}</span>
                            </div>
                            <div className="quote-points">Earn {formatMoney(q.pointsEarned)} in Mate Points</div>
                            {q.paymentType === 'STAGED' && q.stages && q.stages.length > 0 && (
                              <div className="stage-preview">
                                <div className="stage-preview-head">Paid in stages</div>
                                {q.stages.map((st) => (
                                  <div className="stage-row" key={st.id}>
                                    <span>{st.name} · {st.percent}%</span>
                                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                      {formatMoney(st.amount)}
                                      {st.settlementStatus === 'PENDING_PAYMENT' && (
                                        <button className="btn btn-green btn-xs" disabled={busyId === st.id}
                                                onClick={() => pay(job.id, q.id, st.id)}>
                                          {busyId === st.id ? 'Paying…' : 'Pay'}
                                        </button>
                                      )}
                                      {st.settlementStatus && st.settlementStatus !== 'PENDING_PAYMENT' && (
                                        <span className="stage-settle">{settlementLabel(st.settlementStatus)}</span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.message && <p className="quote-message">{q.message}</p>}
                            <div className="quote-item-foot">
                              <span className={`status status-${q.status.toLowerCase()}`}>{q.status}</span>
                              {q.paymentType !== 'STAGED' && q.settlementStatus === 'PENDING_PAYMENT' && (
                                redeemFor === q.id ? (
                                  <span className="redeem-box">
                                    <span className="redeem-label">Use points (max {formatMoney(maxRedeem(q.total))}):</span>
                                    <input className="redeem-input" type="number" min="0" step="0.01"
                                           max={maxRedeem(q.total)} value={redeemAmt}
                                           onChange={(e) => setRedeemAmt(e.target.value)} placeholder="0.00" />
                                    <button className="btn btn-green btn-xs" disabled={busyId === q.id}
                                            onClick={() => pay(job.id, q.id, null, Math.min(Number(redeemAmt) || 0, maxRedeem(q.total)))}>
                                      {busyId === q.id ? 'Paying…' : `Pay ${formatMoney(Math.max(0, q.total - Math.min(Number(redeemAmt) || 0, maxRedeem(q.total))))}`}
                                    </button>
                                    <button className="btn btn-ghost-dark btn-xs" onClick={() => { setRedeemFor(null); setRedeemAmt('') }}>Cancel</button>
                                  </span>
                                ) : (
                                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button className="btn btn-green btn-sm" disabled={busyId === q.id} onClick={() => pay(job.id, q.id, null)}>
                                      {busyId === q.id ? 'Paying…' : `Pay ${formatMoney(q.total)}`}
                                    </button>
                                    {pointsBalance > 0 && (
                                      <button className="btn btn-ghost-dark btn-sm" onClick={() => { setRedeemFor(q.id); setRedeemAmt('') }}>Use points</button>
                                    )}
                                  </span>
                                )
                              )}
                              {q.paymentType !== 'STAGED' && q.status === 'ACCEPTED' && q.settlementStatus && q.settlementStatus !== 'PENDING_PAYMENT' && (
                                <span className={`status status-settle`}>{settlementLabel(q.settlementStatus)}</span>
                              )}
                              {q.status === 'PENDING' && (
                                <button className="btn btn-green btn-sm" disabled={busyId === q.id} onClick={() => acceptQuote(job.id, q.id)}>
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
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
