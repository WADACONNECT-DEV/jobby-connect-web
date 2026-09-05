import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ListControls } from '../components/ListControls'
import { byDate, byNumber, byText, optionsFrom, useListView, usePersistedValue } from '../listView'
import {
  CATEGORY_LABELS,
  OUTCOME_LABELS,
  formatDate,
  formatMoney,
  statusLabel,
  type PaymentType,
  type ProviderQuote,
  type ProviderRequestOutcome,
  type ProviderRequestRow,
  type QuoteDraftResponse,
  type QuoteLineInput,
  type QuoteStageInput,
  type ServiceCategory,
} from '../types'

const TABS: ProviderRequestOutcome[] = ['RECEIVED', 'REPLIED', 'WON', 'LOST', 'EXPIRED', 'DECLINED']

export default function ProviderRequests() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ProviderRequestRow[] | null>(null)
  const [error, setError] = useState('')

  // Which tab is open survives leaving the page and coming Back (UAT §5.3).
  const [tab, setTab] = usePersistedValue<ProviderRequestOutcome>('provider.pipeline.tab', 'RECEIVED')

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

  // Declining is a separate flow from quoting, and from closing the quote form
  // (UAT Round 3 s5/s6). Only Confirm Decline changes the request.
  const [declineFor, setDeclineFor] = useState<string | null>(null)
  const [declineMessage, setDeclineMessage] = useState('')
  const [declineError, setDeclineError] = useState('')
  const [declining, setDeclining] = useState(false)

  // Draft handling (UAT Round 3 s7). One draft per request, overwritten on save.
  // 'dirty' is what makes Cancel able to warn before discarding unsaved edits,
  // and what re-locks Send Quote after an edit that post-dates the last Preview.
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const inTab = rows === null ? null : rows.filter((r) => r.outcome === tab)

  // Each tab keeps its own filter, sort and expand state.
  const list = useListView<ProviderRequestRow>(`provider.pipeline.${tab}`, inTab, {
    search: (row) => `${row.jobTitle} ${row.description} ${row.suburb} ${row.customerName}`,
    filters: [
      {
        key: 'category',
        label: 'industries',
        options: optionsFrom<ProviderRequestRow>(
          (row) => row.category,
          (value) => CATEGORY_LABELS[value as ServiceCategory],
        ),
        match: (row, value) => row.category === value,
      },
      {
        key: 'jobStatus',
        label: 'job statuses',
        options: optionsFrom<ProviderRequestRow>(
          (row) => row.jobStatus,
          (value) => statusLabel(value),
        ),
        match: (row, value) => row.jobStatus === value,
      },
    ],
    sorts: [
      { key: 'requested', label: 'Date requested', compare: byDate<ProviderRequestRow>((r) => r.requestedAt), defaultDir: 'desc' },
      { key: 'expires', label: 'Closing date', compare: byDate<ProviderRequestRow>((r) => r.expiresAt), defaultDir: 'asc' },
      { key: 'amount', label: 'Quote amount', compare: byNumber<ProviderRequestRow>((r) => r.quoteTotal), defaultDir: 'desc' },
      { key: 'title', label: 'Title', compare: byText<ProviderRequestRow>((r) => r.jobTitle), defaultDir: 'asc' },
    ],
    defaultSortKey: 'requested',
    defaultSortDir: 'desc',
  })

  function loadPipeline() {
    return api<ProviderRequestRow[]>('/provider/pipeline', 'GET')
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load requests.'))
  }

  useEffect(() => { loadPipeline() }, [])

  function countOf(outcome: ProviderRequestOutcome) {
    return rows === null ? 0 : rows.filter((r) => r.outcome === outcome).length
  }

  async function openQuote(jobId: string) {
    setDeclineFor(null)
    setOpenFor(jobId)
    setLines([{ description: '', amount: '', gstApplicable: true }])
    setBonus(''); setPaymentType('FULL'); setMessage(''); setStages([{ name: '', percent: '' }])
    setPreview(null); setPreviewError(''); setFormError('')
    setDraftSavedAt(null); setDirty(false)

    // Reopen where they left off if they saved a draft (UAT Round 3 s7 / 6.9).
    try {
      const saved = await api<QuoteDraftResponse | null>(`/jobs/${jobId}/quotes/draft`, 'GET')
      if (saved && saved.draft) {
        const d = saved.draft
        if (d.lineItems && d.lineItems.length > 0) {
          setLines(d.lineItems.map((l) => ({
            description: l.description ?? '',
            amount: l.amount === null || l.amount === undefined ? '' : String(l.amount),
            gstApplicable: l.gstApplicable !== false,
          })))
        }
        setBonus(d.bonusPoints ? String(d.bonusPoints) : '')
        setPaymentType((d.paymentType as PaymentType) ?? 'FULL')
        if (d.stages && d.stages.length > 0) {
          setStages(d.stages.map((st) => ({
            name: st.name ?? '',
            percent: st.percent === null || st.percent === undefined ? '' : String(st.percent),
          })))
        }
        setMessage(d.message ?? '')
        setDraftSavedAt(saved.updatedAt)
      }
    } catch {
      // No draft, or it couldn't be read - start from a blank form.
    }
  }

  /** Save the form as a draft. Nothing is sent to the customer. */
  async function saveDraft(jobId: string) {
    setFormError('')
    setSavingDraft(true)
    try {
      const saved = await api<QuoteDraftResponse>(`/jobs/${jobId}/quotes/draft`, 'PUT', {
        lineItems: lines
          .filter((l) => l.description.trim() || l.amount)
          .map((l) => ({
            description: l.description.trim(),
            amount: l.amount ? Number(l.amount) : null,
            gstApplicable: l.gstApplicable,
          })),
        bonusPoints: bonus ? Number(bonus) : null,
        paymentType,
        stages: stages
          .filter((st) => st.name.trim() || st.percent)
          .map((st) => ({ name: st.name.trim(), percent: st.percent ? Number(st.percent) : null })),
        message: message || null,
      })
      setDraftSavedAt(saved.updatedAt)
      setDirty(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this draft.')
    } finally {
      setSavingDraft(false)
    }
  }

  /**
   * Close the quote form. Discards unsaved edits only - it does NOT touch the
   * customer's request, and it does NOT delete a saved draft (UAT Round 3 s5).
   */
  function cancelQuote() {
    if (dirty && !window.confirm('Discard your unsaved changes? Anything you saved as a draft is kept.')) return
    setOpenFor(null)
    setDirty(false)
  }

  /** Open the decline confirmation. Nothing has happened to the request yet. */
  function openDecline(jobId: string) {
    setOpenFor(null)
    setDeclineFor(jobId)
    setDeclineMessage('')
    setDeclineError('')
  }

  /** Back out of declining. The request is untouched. */
  function cancelDecline() {
    setDeclineFor(null)
    setDeclineMessage('')
    setDeclineError('')
  }

  /** The only action that actually declines the request. */
  async function confirmDecline(jobId: string) {
    const text = declineMessage.trim()
    if (!text) return
    setDeclining(true)
    setDeclineError('')
    try {
      await api(`/provider/requests/${jobId}/decline`, 'POST', { message: text })
      cancelDecline()
      await loadPipeline()
      setTab('DECLINED')
    } catch (err) {
      setDeclineError(err instanceof Error ? err.message : 'Could not decline this request.')
    } finally {
      setDeclining(false)
    }
  }

  /**
   * Any change to the figures invalidates the last Preview, so Send Quote locks
   * again until the provider has seen the new totals (UAT Round 3 s7).
   */
  function edited() {
    setPreview(null)
    setDirty(true)
  }

  function setLine(i: number, field: keyof QuoteLineInput, value: string | boolean) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))
    edited()
  }
  function addLine() { setLines((prev) => [...prev, { description: '', amount: '', gstApplicable: true }]); edited() }
  function removeLine(i: number) { setLines((prev) => prev.filter((_, idx) => idx !== i)); edited() }

  function validLines() {
    return lines
      .filter((l) => l.description.trim() && l.amount && Number(l.amount) >= 0)
      .map((l) => ({
        description: l.description.trim(),
        amount: Number(l.amount),
        gstApplicable: l.gstApplicable,
      }))
  }

  function setStage(i: number, field: keyof QuoteStageInput, value: string) {
    setStages((prev) => prev.map((st, idx) => (idx === i ? { ...st, [field]: value } : st)))
    edited()
  }
  function addStage() { setStages((prev) => [...prev, { name: '', percent: '' }]); edited() }
  function removeStage(i: number) { setStages((prev) => prev.filter((_, idx) => idx !== i)); edited() }

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
      setDirty(false)
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Could not calculate preview.')
    }
  }

  async function submitQuote(e: FormEvent, jobId: string) {
    e.preventDefault()
    setFormError('')
    const items = validLines()
    if (items.length === 0) { setFormError('Add at least one line item with a price.'); return }
    if (preview === null) { setFormError('Run Preview first so you can see the full amounts before sending.'); return }
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
      setOpenFor(null)
      // Reload so the row moves out of Received and into Replied on the server's
      // say-so, rather than being tracked in local state that a refresh loses.
      await loadPipeline()
      setTab('REPLIED')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not send quote.')
    } finally {
      setSubmitting(false)
    }
  }

  const emptyCopy: Record<ProviderRequestOutcome, string> = {
    RECEIVED: "No open requests right now. Make sure your provider profile is set up so customers can find you.",
    REPLIED: "No quotes waiting on a customer decision.",
    WON: "No won quotes yet.",
    LOST: "No lost quotes — nothing here is a bad sign.",
    EXPIRED: "Nothing has expired. Quote before a request's closing date and it stays out of here.",
    DECLINED: "You haven't declined any requests.",
  }

  return (
    <>
      <div className="page-head"><h2>Requests to me</h2></div>
      <p className="page-intro">Customers who've asked you for a quote, and where each one ended up.</p>

      {error && <div className="msg err">{error}</div>}
      {rows === null && !error && <div className="loading">Loading…</div>}

      {rows !== null && (
        <div className="pipe-tabs" role="tablist">
          {TABS.map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={`pipe-tab${tab === key ? ' active' : ''}`}
              onClick={() => setTab(key)}
            >
              {OUTCOME_LABELS[key]}
              <span className="pipe-count">{countOf(key)}</span>
            </button>
          ))}
        </div>
      )}

      {inTab && inTab.length > 0 && (
        <ListControls list={list} searchPlaceholder="Search these requests" countLabel="requests" />
      )}

      {inTab && inTab.length === 0 && (
        <div className="empty">
          <p>{emptyCopy[tab]}</p>
          {tab === 'RECEIVED' && (
            <button className="btn btn-amber" style={{ marginTop: 12 }} onClick={() => navigate('/provider')}>My provider profile</button>
          )}
        </div>
      )}

      {inTab && inTab.length > 0 && list.shown === 0 && (
        <div className="empty">
          <p>No requests match these filters.</p>
          <button className="btn btn-ghost-dark" style={{ marginTop: 12 }} onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {list.shown > 0 && (
        <div className="job-list">
          {list.visible.map((row) => {
            const canQuote = row.outcome === 'RECEIVED' && row.quoteId === null
            return (
              <div className="job-card" key={row.jobId}>
                <div className="job-top">
                  <span className="job-title">{row.jobTitle}</span>
                  <span className="chip">{CATEGORY_LABELS[row.category]}</span>
                </div>
                <div className="job-meta">
                  <span>{row.suburb}</span>
                  {row.timeFrame && <span>· {row.timeFrame}</span>}
                  <span className="job-date">· from {row.customerName} on {formatDate(row.requestedAt)}</span>
                  {row.expiresAt && <span className="job-date">· closes {formatDate(row.expiresAt)}</span>}
                </div>
                <p className="job-desc">{row.description}</p>

                {row.quoteId && (
                  <div className="pipe-quote">
                    <span>Your quote{row.quotedAt ? ` · ${formatDate(row.quotedAt)}` : ''}</span>
                    <span className="pipe-quote-amt">
                      {row.quoteTotal !== null && <>Customer pays {formatMoney(row.quoteTotal)}</>}
                      {row.providerPayable !== null && <> · you get {formatMoney(row.providerPayable)}</>}
                    </span>
                  </div>
                )}

                <div className="job-foot">
                  <span className="job-by">{row.targetCount > 1 ? `You + ${row.targetCount - 1} other provider(s)` : 'Sent to you only'}</span>
                  {canQuote ? (
                    openFor === row.jobId || declineFor === row.jobId ? null : (
                      <div className="job-actions">
                        <button className="btn btn-ghost-dark btn-sm" onClick={() => openDecline(row.jobId)}>Decline</button>
                        <button className="btn btn-amber btn-sm" onClick={() => openQuote(row.jobId)}>Send a quote</button>
                      </div>
                    )
                  ) : row.outcome === 'WON' ? (
                    <span className="tag-ok">✓ Won · {statusLabel(row.jobStatus)}</span>
                  ) : row.outcome === 'REPLIED' ? (
                    <span className="tag-ok">✓ Quote sent</span>
                  ) : (
                    <span className="tag-muted">{OUTCOME_LABELS[row.outcome]}</span>
                  )}
                </div>

                {row.outcome === 'DECLINED' && row.declineMessage && (
                  <div className="decline-note">
                    <span className="decline-note-head">
                      You declined this request{row.declinedAt ? ` on ${formatDate(row.declinedAt)}` : ''}
                    </span>
                    <p>{row.declineMessage}</p>
                  </div>
                )}

                {declineFor === row.jobId && (
                  <div className="decline-form">
                    <h4>Are you sure you want to decline this request?</h4>
                    <p className="decline-lead">
                      The customer will be told you can't take it on, and will see the message you write
                      below. This cannot be undone, and you won't be able to quote on it afterwards.
                    </p>
                    {declineError && <div className="msg err">{declineError}</div>}

                    <label htmlFor={`decline-${row.jobId}`}>Your message to the customer</label>
                    <textarea
                      id={`decline-${row.jobId}`}
                      rows={3}
                      value={declineMessage}
                      onChange={(e) => setDeclineMessage(e.target.value)}
                      placeholder="e.g. Sorry, we're fully booked until 20 October — happy to quote after that."
                    />

                    <div className="decline-actions">
                      <button type="button" className="btn btn-ghost-dark btn-sm" onClick={cancelDecline}>
                        Back — don't decline
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={declineMessage.trim().length === 0 || declining}
                        onClick={() => confirmDecline(row.jobId)}
                      >
                        {declining ? 'Declining…' : 'Confirm Decline'}
                      </button>
                    </div>
                  </div>
                )}

                {canQuote && openFor === row.jobId && (
                  <form className="quote-form" onSubmit={(e) => submitQuote(e, row.jobId)}>
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
                        <select
                          className="qline-gst"
                          value={l.gstApplicable ? 'INC' : 'FREE'}
                          onChange={(e) => setLine(i, 'gstApplicable', e.target.value === 'INC')}
                          title="Does GST apply to this line?"
                          aria-label="GST treatment for this line"
                        >
                          <option value="INC">+ GST</option>
                          <option value="FREE">GST-free</option>
                        </select>
                        {lines.length > 1 && (
                          <button type="button" className="qline-x" onClick={() => removeLine(i)} title="Remove">×</button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost-dark btn-xs" onClick={addLine} style={{ marginTop: 4 }}>+ Add line</button>
                    <p className="field-hint">
                      Mark a line GST-free for anything you don't charge GST on — a government fee, a
                      permit, a disbursement passed on at cost. If you aren't GST-registered, no GST is
                      added either way.
                    </p>

                    <div className="row2" style={{ marginTop: 12 }}>
                      <div>
                        <label>Bonus Mate Points (optional, A$)</label>
                        <input type="number" min="0" step="0.01" value={bonus} onChange={(e) => { setBonus(e.target.value); edited() }} placeholder="0.00" />
                      </div>
                      <div>
                        <label>Payment</label>
                        <select value={paymentType} onChange={(e) => { setPaymentType(e.target.value as PaymentType); edited() }}>
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
                        <div className="qb-row"><span>Platform commission ({preview.commissionRate}%)</span><span>{formatMoney(preview.commission + preview.commissionGst)}</span></div>
                        <div className="qb-row"><span>Customer Mate Points ({preview.pointsRate}%)</span><span>{formatMoney(preview.points + preview.pointsGst)}</span></div>
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
                      <button type="button" className="btn btn-ghost-dark btn-sm" onClick={cancelQuote}>Cancel</button>
                      <button type="button" className="btn btn-ghost-dark btn-sm" disabled={savingDraft} onClick={() => saveDraft(row.jobId)}>
                        {savingDraft ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="btn btn-ghost-dark btn-sm" onClick={() => doPreview(row.jobId)}>Preview</button>
                      <button
                        type="submit"
                        className="btn btn-amber btn-sm"
                        disabled={submitting || preview === null}
                        title={preview === null ? 'Run Preview first to see the full amounts' : undefined}
                      >
                        {submitting ? 'Sending…' : 'Send quote'}
                      </button>
                    </div>

                    <p className="quote-hint">
                      {preview === null
                        ? 'Send quote unlocks once you have previewed the full amounts.'
                        : 'Previewed — you can still edit and save before sending.'}
                      {draftSavedAt && <> · Draft saved {formatDate(draftSavedAt)}.</>}
                      {dirty && <> · You have unsaved changes.</>}
                    </p>
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
