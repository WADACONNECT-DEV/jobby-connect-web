import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import {
  CATEGORY_LABELS,
  formatDate,
  formatMoney,
  type Job,
  type PaymentType,
  type ProviderQuote,
  type QuoteLineInput,
  type QuoteStageInput,
} from '../types'

export default function ProviderRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<Job[] | null>(null)
  const [error, setError] = useState('')

  const [openFor, setOpenFor] = useState<string | null>(null)
  const [lines, setLines] = useState<QuoteLineInput[]>([{ description: '', amount: '' }])
  const [bonus, setBonus] = useState('')
  const [paymentType, setPaymentType] = useState<PaymentType>('FULL')
  const [stages, setStages] = useState<QuoteStageInput[]>([{ name: '', percent: '' }])
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<ProviderQuote | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [quotedIds, setQuotedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    api<Job[]>('/jobs/requests', 'GET')
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load requests.'))
  }, [])

  function openQuote(jobId: string) {
    setOpenFor(jobId)
    setLines([{ description: '', amount: '' }])
    setBonus(''); setPaymentType('FULL'); setMessage(''); setStages([{ name: '', percent: '' }])
    setPreview(null); setPreviewError(''); setFormError('')
  }

  function setLine(i: number, field: keyof QuoteLineInput, value: string) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))
    setPreview(null)
  }
  function addLine() { setLines((prev) => [...prev, { description: '', amount: '' }]); setPreview(null) }
  function removeLine(i: number) { setLines((prev) => prev.filter((_, idx) => idx !== i)); setPreview(null) }

  function validLines() {
    return lines
      .filter((l) => l.description.trim() && l.amount && Number(l.amount) >= 0)
      .map((l) => ({ description: l.description.trim(), amount: Number(l.amount) }))
  }

  function setStage(i: number, field: keyof QuoteStageInput, value: string) {
    setStages((prev) => prev.map((st, idx) => (idx === i ? { ...st, [field]: value } : st)))
    setPreview(null)
  }
  function addStage() { setStages((prev) => [...prev, { name: '', percent: '' }]); setPreview(null) }
  function removeStage(i: number) { setStages((prev) => prev.filter((_, idx) => idx !== i)); setPreview(null) }

  function validStages() {
    return stages
      .filter((st) => st.name.trim() && st.percent && Number(st.percent) > 0)
      .map((st) => ({ name: st.name.trim(), percent: Number(st.percent) }))
  }
  function stagesPctSum() {
    return validStages().reduce((sum, st) => sum + st.percent, 0)
  }
  function completionPct() {
    return Math.round((100 - stagesPctSum()) * 100) / 100
  }

  async function doPreview(jobId: string) {
    setPreviewError('')
    const items = validLines()
    if (items.length === 0) { setPreviewError('Add at least one line item with a price.'); return }
    if (paymentType === 'STAGED' && stagesPctSum() >= 100) {
      setPreviewError('Stages must add up to less than 100% — the rest is the completion stage.'); return
    }
    try {
      const p = await api<ProviderQuote>(`/jobs/${jobId}/quotes/preview`, 'POST', {
        lineItems: items,
        bonusPoints: bonus ? Number(bonus) : 0,
        paymentType,
        stages: paymentType === 'STAGED' ? validStages() : null,
      })
      setPreview(p)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Could not calculate preview.')
    }
  }

  async function submitQuote(e: FormEvent, jobId: string) {
    e.preventDefault()
    setFormError('')
    const items = validLines()
    if (items.length === 0) { setFormError('Add at least one line item with a price.'); return }
    if (paymentType === 'STAGED') {
      if (validStages().length === 0) { setFormError('Add at least one stage.'); return }
      if (stagesPctSum() >= 100) { setFormError('Stages must add up to less than 100% — the rest is the completion stage.'); return }
    }
    setSubmitting(true)
    try {
      await api<ProviderQuote>(`/jobs/${jobId}/quotes`, 'POST', {
        lineItems: items,
        bonusPoints: bonus ? Number(bonus) : 0,
        paymentType,
        stages: paymentType === 'STAGED' ? validStages() : null,
        message: message || null,
      })
      setQuotedIds((prev) => new Set(prev).add(jobId))
      setOpenFor(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not send quote.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="page-head"><h2>Requests to me</h2></div>
      <p className="page-intro">Customers who've asked you for a quote. Build your quote and see exactly what you'll be paid.</p>

      {error && <div className="msg err">{error}</div>}
      {requests === null && !error && <div className="loading">Loading…</div>}

      {requests !== null && requests.length === 0 && !error && (
        <div className="empty">
          <p>No quote requests yet. Make sure your provider profile is set up so customers can find you.</p>
          <button className="btn btn-amber" style={{ marginTop: 12 }} onClick={() => navigate('/provider')}>My provider profile</button>
        </div>
      )}

      {requests && requests.length > 0 && (
        <div className="job-list">
          {requests.map((job) => {
            const quoted = quotedIds.has(job.id)
            const isOpenReq = job.status === 'OPEN'
            return (
              <div className="job-card" key={job.id}>
                <div className="job-top">
                  <span className="job-title">{job.title}</span>
                  <span className="chip">{CATEGORY_LABELS[job.category]}</span>
                </div>
                <div className="job-meta">
                  <span>{job.suburb}</span>
                  {job.timeFrame && <span>· {job.timeFrame}</span>}
                  <span className="job-date">· from {job.customerName} on {formatDate(job.createdAt)}</span>
                </div>
                <p className="job-desc">{job.description}</p>

                <div className="job-foot">
                  <span className="job-by">{job.targetCount > 1 ? `You + ${job.targetCount - 1} other provider(s)` : 'Sent to you only'}</span>
                  {!isOpenReq ? (
                    <span className="tag-muted">Closed</span>
                  ) : quoted ? (
                    <span className="tag-ok">✓ Quote sent</span>
                  ) : openFor === job.id ? null : (
                    <button className="btn btn-amber btn-sm" onClick={() => openQuote(job.id)}>Send a quote</button>
                  )}
                </div>

                {isOpenReq && openFor === job.id && !quoted && (
                  <form className="quote-form" onSubmit={(e) => submitQuote(e, job.id)}>
                    {formError && <div className="msg err">{formError}</div>}

                    <label>Line items</label>
                    {lines.map((l, i) => (
                      <div className="qline" key={i}>
                        <input
                          className="qline-desc"
                          placeholder="Description (e.g. Vacate clean, 2-bed)"
                          value={l.description}
                          onChange={(e) => setLine(i, 'description', e.target.value)}
                        />
                        <input
                          className="qline-amt"
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={l.amount}
                          onChange={(e) => setLine(i, 'amount', e.target.value)}
                        />
                        {lines.length > 1 && (
                          <button type="button" className="qline-x" onClick={() => removeLine(i)} title="Remove">×</button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost-dark btn-xs" onClick={addLine} style={{ marginTop: 4 }}>+ Add line</button>

                    <div className="row2" style={{ marginTop: 12 }}>
                      <div>
                        <label>Bonus Mate Points (optional, A$)</label>
                        <input type="number" min="0" step="0.01" value={bonus} onChange={(e) => { setBonus(e.target.value); setPreview(null) }} placeholder="0.00" />
                      </div>
                      <div>
                        <label>Payment</label>
                        <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
                          <option value="FULL">Full payment</option>
                          <option value="STAGED">Staged (milestones)</option>
                        </select>
                      </div>
                    </div>

                    {paymentType === 'STAGED' && (
                      <div className="stage-editor">
                        <label>Payment stages (percentages)</label>
                        {stages.map((st, i) => (
                          <div className="qline" key={i}>
                            <input
                              className="qline-desc"
                              placeholder="Stage name (e.g. Advance, Inspection)"
                              value={st.name}
                              onChange={(e) => setStage(i, 'name', e.target.value)}
                            />
                            <input
                              className="qline-amt"
                              type="number" min="0" max="100" step="0.01" placeholder="%"
                              value={st.percent}
                              onChange={(e) => setStage(i, 'percent', e.target.value)}
                            />
                            {stages.length > 1 && (
                              <button type="button" className="qline-x" onClick={() => removeStage(i)} title="Remove">×</button>
                            )}
                          </div>
                        ))}
                        <button type="button" className="btn btn-ghost-dark btn-xs" onClick={addStage} style={{ marginTop: 4 }}>+ Add stage</button>
                        <div className={`stage-completion${completionPct() <= 0 ? ' bad' : ''}`}>
                          {completionPct() > 0
                            ? `Completion stage (auto): ${completionPct()}%`
                            : 'Stages must total less than 100% — leave room for the completion stage.'}
                        </div>
                      </div>
                    )}

                    <label style={{ marginTop: 12 }}>Message (optional)</label>
                    <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="When you can start, what's included…" />

                    {previewError && <div className="msg err" style={{ marginTop: 10 }}>{previewError}</div>}

                    {preview && (
                      <div className="quote-breakdown">
                        <div className="qb-row"><span>Your price</span><span>{formatMoney(preview.providerNet)}</span></div>
                        {preview.providerGst > 0 && <div className="qb-row"><span>GST on your price</span><span>{formatMoney(preview.providerGst)}</span></div>}
                        <div className="qb-row"><span>Platform commission</span><span>{formatMoney(preview.commission + preview.commissionGst)}</span></div>
                        <div className="qb-row"><span>Customer Mate Points</span><span>{formatMoney(preview.points + preview.pointsGst)}</span></div>
                        {preview.bonus > 0 && <div className="qb-row qb-bonus"><span>Bonus points (you fund)</span><span>−{formatMoney(preview.bonus + preview.bonusGst)}</span></div>}
                        <div className="qb-row qb-total"><span>Customer pays</span><span>{formatMoney(preview.customerTotal)}</span></div>
                        <div className="qb-row qb-you"><span>You get paid</span><span>{formatMoney(preview.providerPayable)}</span></div>
                        <div className="qb-row qb-points"><span>Customer earns</span><span>{formatMoney(preview.pointsEarned)} in points</span></div>
                        {preview.stages && preview.stages.length > 0 && (
                          <div className="stage-preview">
                            <div className="stage-preview-head">Payment stages</div>
                            {preview.stages.map((st, i) => (
                              <div className="stage-row" key={i}>
                                <span>{st.name}{st.completion ? ' (auto)' : ''} · {st.percent}%</span>
                                <span>{formatMoney(st.customerTotal)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="quote-actions">
                      <button type="button" className="btn btn-ghost-dark btn-sm" onClick={() => setOpenFor(null)}>Cancel</button>
                      <button type="button" className="btn btn-ghost-dark btn-sm" onClick={() => doPreview(job.id)}>Preview</button>
                      <button type="submit" className="btn btn-amber btn-sm" disabled={submitting}>{submitting ? 'Sending…' : 'Send quote'}</button>
                    </div>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
