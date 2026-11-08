import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { initialsOf } from '../components/mates/MateCard'
import { StatCards } from '../components/StepLine'
import { StickyBar } from '../components/StickyBar'
import { byDate, byNumber, byText, optionsFrom, useListView, usePersistedValue } from '../listView'
import {
  industryOf,
  OUTCOME_LABELS,
  formatDate,
  formatMoney,
  statusLabel,
  type PaymentType,
  type ProviderQuote,
  type ProviderRequestOutcome,
  type ProviderRequestRow,
  type QuoteDraftResponse,
  type QuoteRate,
  type QuoteLineInput,
  type QuoteStageInput,
} from '../types'

const TABS: ProviderRequestOutcome[] = ['RECEIVED', 'REPLIED', 'WON', 'LOST', 'EXPIRED', 'DECLINED']

export default function ProviderRequests() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ProviderRequestRow[] | null>(null)
  const [error, setError] = useState('')

  // Which tab is open survives leaving the page and coming Back (UAT §5.3).
  const [tab, setTab] = usePersistedValue<ProviderRequestOutcome>('provider.pipeline.tab', 'RECEIVED')

  const [openFor, setOpenFor] = useState<string | null>(null)
  const [lines, setLines] = useState<QuoteLineInput[]>([{ description: '', amount: '', gstApplicable: true }])
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
  const [confirmCancel, setConfirmCancel] = useState(false)

  // The commission + Mate Points uplift applying to the open request, so the
  // "Customer sees" column is live and correct (UAT Round 6 3.1). Read from the
  // admin rate matrix rather than assumed to be 10% - the rates are set per
  // industry, suburb and plan, so a hardcoded figure would quietly go wrong.
  const [rate, setRate] = useState<QuoteRate | null>(null)

  // List or Grid, remembered (redesign step 9). List is the default.
  const [layout, setLayout] = usePersistedValue<'list' | 'grid'>('provider.pipeline.layout', 'list')

  const inTab = rows === null ? null : rows.filter((r) => r.outcome === tab)

  // Each tab keeps its own filter, sort and expand state.
  const list = useListView<ProviderRequestRow>(`provider.pipeline.${tab}`, inTab, {
    search: (row) => `${row.jobTitle} ${row.description} ${row.suburb} ${row.customerName}`,
    filters: [
      {
        key: 'category',
        label: 'industries',
        options: optionsFrom<ProviderRequestRow>(
          // By industry name (step J1); older jobs use their category's label.
          (row) => industryOf(row),
        ),
        match: (row, value) => industryOf(row) === value,
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
    setRate(null)

    api<QuoteRate>(`/jobs/${jobId}/quotes/rate`, 'GET')
      .then(setRate)
      .catch(() => { /* the column falls back to a dash rather than a wrong figure */ })

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
      // So the card shows "draft saved" / "Continue quote" straight away.
      setRows((prev) => prev?.map((r) => (r.jobId === jobId ? { ...r, draftSavedAt: saved.updatedAt } : r)) ?? prev)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this draft.')
    } finally {
      setSavingDraft(false)
    }
  }

  /**
   * Close the quote form. Discards unsaved edits only - it does NOT touch the
   * customer's request, and it does NOT delete a saved draft (UAT Round 3 s5).
   *
   * With unsaved edits this asks first, through the in-app dialog rather than
   * the browser's own pop-up (UAT Round 4 s5).
   */
  function cancelQuote() {
    if (dirty) { setConfirmCancel(true); return }
    setOpenFor(null)
    setDirty(false)
  }

  function discardAndClose() {
    setConfirmCancel(false)
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

  /**
   * What the customer will be shown for this line (owner's ledger spec, Part 0):
   *  - a +GST line of a GST-registered provider: amount x (1 + uplift), GST on top;
   *  - a GST-free line, or any line of a provider not registered for GST:
   *    amount x (1 + uplift x 1.1), no GST.
   * Returns null until the rate is known, so the column shows a dash rather
   * than a figure that might be wrong. The saved quote is priced by the server;
   * this is the live figure while typing.
   */
  function customerSees(amount: string, gstApplicable: boolean): number | null {
    if (rate === null) return null
    const value = Number(amount)
    if (!amount || Number.isNaN(value) || value < 0) return null
    const uplift = rate.upliftPercent / 100
    const factor = rate.gstRegistered !== false && gstApplicable ? 1 + uplift : 1 + uplift * 1.1
    return Math.round(value * factor * 100) / 100
  }

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

  /** Which sub-tabs hold something waiting on the provider: a request still to answer. */
  const needsAction = (key: ProviderRequestOutcome) =>
    key === 'RECEIVED' && (rows ?? []).some((r) => r.outcome === 'RECEIVED' && r.quoteId === null)

  const optionsFor = (key: string) => list.filters.find((f) => f.key === key)?.options ?? []
  const topBlock = useRef<HTMLDivElement | null>(null)
  const countLabel = list.shown === list.total ? `${list.total} request${list.total === 1 ? '' : 's'}` : `${list.shown} of ${list.total} requests`

  const subTabs = (
    <div className="mj-subtabs" role="tablist" aria-label="Requests to me">
      {TABS.map((key) => (
        <button
          key={key}
          role="tab"
          aria-selected={tab === key}
          className={`mj-subtab${tab === key ? ' is-on' : ''}`}
          onClick={() => setTab(key)}
        >
          {OUTCOME_LABELS[key]}
          <span className={`mj-badge${needsAction(key) ? ' is-waiting' : ''}`}>{countOf(key)}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="mt pr">
      <ConfirmDialog
        open={confirmCancel}
        title="Discard your unsaved changes?"
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        danger
        onConfirm={discardAndClose}
        onCancel={() => setConfirmCancel(false)}
      >
        <p>
          Anything you saved as a draft is kept — only the edits made since your last save will be
          lost. The customer's request is not affected either way.
        </p>
      </ConfirmDialog>

      <div className="mt-head">
        <div className="mt-head-copy">
          <BubbleIcon />
          <div>
            <h2 className="mt-title">Requests to me</h2>
            <p className="mt-sub">Customers who've asked you for a quote, and where each one ended up.</p>
          </div>
        </div>
      </div>

      {error && <div className="msg err">{error}</div>}
      {rows === null && !error && <div className="loading">Loading…</div>}

      {rows !== null && rows.length > 0 && (
        <StatCards items={[
          { label: 'New requests', value: String(rows.filter((r) => r.outcome === 'RECEIVED' && r.quoteId === null).length), tone: 'hi' },
          { label: 'Quotes out', value: String(rows.filter((r) => r.outcome === 'REPLIED').length) },
          { label: 'Won', value: String(rows.filter((r) => r.outcome === 'WON').length) },
          // Work marked complete and not yet paid out: awaiting the customer's
          // payment or your review. Staged quotes settle per stage, so they are
          // counted on Your Quotes instead.
          { label: 'Awaiting payout', value: formatMoney(rows.filter((r) => r.outcome === 'WON' && (r.settlementStatus === 'PENDING_PAYMENT' || r.settlementStatus === 'PENDING_REVIEW')).reduce((sum, r) => sum + (r.providerPayable ?? 0), 0)), tone: 'pos' },
        ]} />
      )}

      <div ref={topBlock} className="mt-top">
      {rows !== null && subTabs}

      {inTab && inTab.length > 0 && (
        <div className="mt-search pr-filters">
          <label className="mt-field is-wide">
            <span>Search requests</span>
            <span className="mt-input">
              <SearchIcon />
              <input type="search" value={list.view.search} placeholder="Title, suburb or customer"
                onChange={(e) => list.setSearch(e.target.value)} />
            </span>
          </label>
          <label className="mt-field">
            <span>Industry</span>
            <select value={list.view.filters.category ?? ''} onChange={(e) => list.setFilter('category', e.target.value)}>
              <option value="">All industries</option>
              {optionsFor('category').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="mt-field">
            <span>Status</span>
            <select value={list.view.filters.jobStatus ?? ''} onChange={(e) => list.setFilter('jobStatus', e.target.value)}>
              <option value="">All</option>
              {optionsFor('jobStatus').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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

      {inTab && inTab.length > 0 && (
        <h3 className="mt-count">{countLabel}</h3>
      )}
      </div>

      {inTab && inTab.length > 0 && (
        <StickyBar anchor={topBlock}>
          {subTabs}
          <span className="mt-input">
            <SearchIcon />
            <input type="search" value={list.view.search} placeholder="Title, suburb or customer" aria-label="Search requests"
              onChange={(e) => list.setSearch(e.target.value)} />
          </span>
          <span className="sb-count">{countLabel}</span>
        </StickyBar>
      )}

      {inTab && inTab.length === 0 && (
        <div className="mt-empty">
          <p>{emptyCopy[tab]}</p>
          {tab === 'RECEIVED' && (
            <button className="mt-continue" onClick={() => navigate('/provider')}>My provider profile</button>
          )}
        </div>
      )}

      {inTab && inTab.length > 0 && list.shown === 0 && (
        <div className="mt-empty">
          <p>No requests match these filters.</p>
          <button className="mt-btn-ghost" onClick={list.clear}>Clear filters</button>
        </div>
      )}

      {list.shown > 0 && (
        <div className={layout === 'grid' ? 'pr-grid' : 'pr-list'}>
          {list.visible.map((row) => {
            const canQuote = row.outcome === 'RECEIVED' && row.quoteId === null
            const panelOpen = openFor === row.jobId || declineFor === row.jobId
            const closes = closesIn(row)
            const others = row.targetCount - 1
            return (
              <article className={`pr-card pr-${layout}${canQuote ? ' is-action' : ''}${panelOpen ? ' is-open' : ''}`} key={row.jobId}>
                <div className="pr-head">
                  <span className="mc-avatar pr-avatar" aria-hidden="true">{initialsOf(row.customerName)}</span>
                  <div className="pr-body">
                    <h3 className="pr-title">{row.jobTitle}</h3>
                    <div className="pr-meta">
                      <span className="mc-chip">{industryOf(row)}</span>
                      <span className="mc-line"><PinIcon /> {row.suburb}</span>
                      {row.requestRef && <span className="mj-ref"><code>{row.requestRef}</code></span>}
                      {closes && <span className={`pr-closes${closes.today ? ' is-today' : ''}`}>{closes.label}</span>}
                    </div>
                    <p className="pr-sub">
                      {row.customerName} · requested {formatDate(row.requestedAt)}
                      {others > 0 && <> · also sent to {others} other provider{others === 1 ? '' : 's'}</>}
                      {row.timeFrame && <> · {row.timeFrame}</>}
                      {canQuote && row.draftSavedAt && <> · <span className="pr-draft">draft saved</span></>}
                    </p>
                    {layout === 'list' && <p className="pr-desc">{row.description}</p>}
                  </div>

                  <div className="pr-side">
                    {row.quoteId && (
                      <div className="pr-amt">
                        {row.quoteTotal !== null && <span><span className="pr-amt-label">Customer pays</span> {formatMoney(row.quoteTotal)}</span>}
                        {row.providerPayable !== null && <span className="pr-amt-you"><span className="pr-amt-label">You get</span> {formatMoney(row.providerPayable)}</span>}
                        {row.quotedAt && <span className="pr-amt-label">Quoted {formatDate(row.quotedAt)}</span>}
                      </div>
                    )}
                    {canQuote ? (
                      panelOpen ? null : (
                        <div className="pr-actions">
                          <button className={layout === 'grid' ? 'pr-link' : 'mt-btn-ghost'} onClick={() => openDecline(row.jobId)}>Decline</button>
                          <button className="mt-continue" onClick={() => openQuote(row.jobId)}>
                            {row.draftSavedAt ? 'Continue quote' : 'Send a quote'} →
                          </button>
                        </div>
                      )
                    ) : row.outcome === 'WON' ? (
                      <span className="pr-tag is-won">✓ Won · {statusLabel(row.jobStatus)}</span>
                    ) : row.outcome === 'REPLIED' ? (
                      <span className="pr-tag is-sent">✓ Quote sent</span>
                    ) : (
                      <span className="pr-tag">{OUTCOME_LABELS[row.outcome]}</span>
                    )}
                  </div>
                </div>

                {row.outcome === 'DECLINED' && row.declineMessage && (
                  <div className="mj-declined">
                    <span className="mj-declined-head">
                      You declined this request{row.declinedAt ? ` on ${formatDate(row.declinedAt)}` : ''}
                    </span>
                    <p>{row.declineMessage}</p>
                  </div>
                )}

                {declineFor === row.jobId && (
                  <div className="pr-panel pr-decline">
                    <h4>Are you sure you want to decline this request?</h4>
                    <p className="pr-panel-lead">
                      The customer will be told you can't take it on, and will see the message you write
                      below. This cannot be undone, and you won't be able to quote on it afterwards.
                    </p>
                    {declineError && <div className="jr-msg is-err">{declineError}</div>}

                    <label className="mt-field" htmlFor={`decline-${row.jobId}`}>
                      <span>Your message to the customer</span>
                      <textarea
                        id={`decline-${row.jobId}`}
                        rows={3}
                        value={declineMessage}
                        onChange={(e) => setDeclineMessage(e.target.value)}
                        placeholder="e.g. Sorry, we're fully booked until 20 October — happy to quote after that."
                      />
                    </label>

                    <div className="pr-panel-actions">
                      <button type="button" className="mt-btn-ghost" onClick={cancelDecline}>
                        Back — don't decline
                      </button>
                      <button
                        type="button"
                        className="pr-danger"
                        disabled={declineMessage.trim().length === 0 || declining}
                        onClick={() => confirmDecline(row.jobId)}
                      >
                        {declining ? 'Declining…' : 'Confirm Decline'}
                      </button>
                    </div>
                  </div>
                )}

                {canQuote && openFor === row.jobId && (
                  <form className="pr-panel pr-quote" onSubmit={(e) => submitQuote(e, row.jobId)}>
                    <h4>Your quote</h4>
                    {formError && <div className="jr-msg is-err">{formError}</div>}

                    <div className="pr-lines" role="table" aria-label="Line items">
                      <div className="pr-line is-head" role="row">
                        <span role="columnheader">Line item</span>
                        <span role="columnheader">Amount</span>
                        <span role="columnheader">GST</span>
                        <span role="columnheader">Customer sees</span>
                        <span aria-hidden="true" />
                      </div>
                      {lines.map((l, i) => (
                        <div className="pr-line" role="row" key={i}>
                          <input
                            placeholder="Description (e.g. Vacate clean, 2-bed)"
                            aria-label="Description"
                            value={l.description}
                            onChange={(e) => setLine(i, 'description', e.target.value)}
                          />
                          <input
                            type="number" min="0" step="0.01" placeholder="0.00" aria-label="Amount"
                            value={l.amount}
                            onChange={(e) => setLine(i, 'amount', e.target.value)}
                          />
                          <select
                            value={l.gstApplicable ? 'INC' : 'FREE'}
                            onChange={(e) => setLine(i, 'gstApplicable', e.target.value === 'INC')}
                            title="Does GST apply to this line?"
                            aria-label="GST treatment for this line"
                          >
                            <option value="INC">+ GST</option>
                            <option value="FREE">GST-free</option>
                          </select>
                          {/* What the customer will be shown for this line, live as
                              the provider types (UAT Round 6 3.1). */}
                          <span className="pr-sees" title="What the customer will see for this line">
                            {customerSees(l.amount, l.gstApplicable) === null ? '—' : formatMoney(customerSees(l.amount, l.gstApplicable) as number)}
                          </span>
                          {lines.length > 1
                            ? <button type="button" className="pr-x" onClick={() => removeLine(i)} aria-label="Remove line">×</button>
                            : <span aria-hidden="true" />}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="pr-link is-add" onClick={addLine}>+ Add line</button>
                    <p className="pr-hint">
                      <strong>Customer sees</strong> is your amount plus the platform's{' '}
                      {rate === null ? 'uplift' : `${rate.upliftPercent}% uplift`}
                      {rate !== null && <> ({Math.round(rate.upliftPercent * 1.1 * 100) / 100}% on a line with no GST added, which then carries the platform's GST)</>}
                      {' '}— it is the figure the customer is shown for that line, and the one they'll ask you about.
                    </p>
                    <p className="pr-hint">
                      Mark a line GST-free for anything you don't charge GST on — a government fee, a
                      permit, a disbursement passed on at cost. If you aren't GST-registered, no GST is
                      added either way.
                    </p>

                    <div className="pr-two">
                      <label className="mt-field">
                        <span>BONUS MATE POINTS (OPTIONAL, A$)</span>
                        <input type="number" min="0" step="0.01" value={bonus} onChange={(e) => { setBonus(e.target.value); edited() }} placeholder="0.00" />
                      </label>
                      <div className="mt-field">
                        <span>Payment</span>
                        <div className="pr-seg" role="group" aria-label="Payment type">
                          <button type="button" className={paymentType === 'FULL' ? 'is-on' : ''} aria-pressed={paymentType === 'FULL'}
                            onClick={() => { if (paymentType !== 'FULL') { setPaymentType('FULL'); edited() } }}>Full payment</button>
                          <button type="button" className={paymentType === 'STAGED' ? 'is-on' : ''} aria-pressed={paymentType === 'STAGED'}
                            onClick={() => { if (paymentType !== 'STAGED') { setPaymentType('STAGED'); edited() } }}>Staged (milestones)</button>
                        </div>
                      </div>
                    </div>

                    {paymentType === 'STAGED' && (
                      <div className="pr-stages">
                        <span className="pr-stages-title">Payment stages (percentages)</span>
                        {stages.map((st, i) => (
                          <div className="pr-stage" key={i}>
                            <input
                              placeholder="Stage name (e.g. Advance, Inspection)"
                              aria-label="Stage name"
                              value={st.name}
                              onChange={(e) => setStage(i, 'name', e.target.value)}
                            />
                            <input
                              type="number" min="0" max="100" step="0.01" placeholder="%" aria-label="Stage percent"
                              value={st.percent}
                              onChange={(e) => setStage(i, 'percent', e.target.value)}
                            />
                            {stages.length > 1
                              ? <button type="button" className="pr-x" onClick={() => removeStage(i)} aria-label="Remove stage">×</button>
                              : <span aria-hidden="true" />}
                          </div>
                        ))}
                        <button type="button" className="pr-link is-add" onClick={addStage}>+ Add stage</button>
                        <div className={`pr-completion${completionPct() <= 0 ? ' is-bad' : ''}`}>
                          {completionPct() > 0
                            ? `Completion stage (auto): ${completionPct()}%`
                            : 'Stages must total less than 100% — leave room for the completion stage.'}
                        </div>
                      </div>
                    )}

                    <label className="mt-field">
                      <span>Message to the customer (optional)</span>
                      <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="When you can start, what's included…" />
                    </label>

                    {previewError && <div className="jr-msg is-err">{previewError}</div>}

                    {preview && (() => {
                      // How the owner's ledger spec (Part 0) says Preview should read:
                      // invoice to customer, less platform charges (commission, Mate
                      // Points and any bonus you fund, each with its GST), you get paid.
                      // Sums of the priced figures only; nothing is recalculated.
                      const chargesGst = preview.commissionGst + preview.pointsGst + preview.bonusGst
                      const charges = preview.commission + preview.points + preview.bonus + chargesGst
                      return (
                        <div className="pr-breakdown">
                          <div className="pr-b-row is-total">
                            <span>Invoice to customer</span>
                            <span>{formatMoney(preview.customerTotal)} <span className="pr-b-incl">(incl GST {formatMoney(preview.invoiceGst ?? 0)})</span></span>
                          </div>
                          <div className="pr-b-row">
                            <span>Less platform charges</span>
                            <span>−{formatMoney(charges)} <span className="pr-b-incl">(incl GST {formatMoney(chargesGst)})</span></span>
                          </div>
                          <div className="pr-b-row is-you"><span>You get paid</span><span>{formatMoney(preview.providerPayable)}</span></div>
                          <div className="pr-b-row is-points"><span>Customer earns</span><span>{formatMoney(preview.pointsEarned)} in points</span></div>
                          {preview.stages && preview.stages.length > 0 && (
                            <div className="pr-b-stages">
                              <span className="pr-b-less">Payment stages</span>
                              {preview.stages.map((st, i) => (
                                <div className="pr-b-row" key={i}>
                                  <span>{st.name}{st.completion ? ' (auto)' : ''} · {st.percent}%</span>
                                  <span>{formatMoney(st.customerTotal)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    <div className="pr-panel-actions">
                      <button type="button" className="mt-btn-ghost" onClick={cancelQuote}>Cancel</button>
                      <button type="button" className="mt-btn-ghost" disabled={savingDraft} onClick={() => saveDraft(row.jobId)}>
                        {savingDraft ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="mt-btn-ghost" onClick={() => doPreview(row.jobId)}>Preview</button>
                      <button
                        type="submit"
                        className="mt-continue"
                        disabled={submitting || preview === null}
                        title={preview === null ? 'Run Preview first to see the full amounts' : undefined}
                      >
                        {submitting ? 'Sending…' : 'Send quote'}
                      </button>
                    </div>

                    <p className="pr-hint is-status">
                      {preview === null
                        ? 'Send quote unlocks once you have previewed the full amounts.'
                        : 'Previewed — you can still edit and save before sending.'}
                      {draftSavedAt && <> · Draft saved {formatDate(draftSavedAt)}.</>}
                      {dirty && <> · You have unsaved changes.</>}
                    </p>
                  </form>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * "Closes in n days" from the request's closing date, for requests still
 * waiting on a quote. Null when there's no closing date or it has passed.
 */
function closesIn(row: ProviderRequestRow): { label: string; today: boolean } | null {
  if (row.outcome !== 'RECEIVED' || row.quoteId !== null || !row.expiresAt) return null
  const ms = new Date(row.expiresAt).getTime() - Date.now()
  if (ms <= 0) return null
  const days = Math.floor(ms / 86400000)
  if (days === 0) return { label: 'Closes today', today: true }
  return { label: `Closes in ${days} day${days === 1 ? '' : 's'}`, today: false }
}

/* ---------- icons (decorative) ---------- */

function BubbleIcon() {
  return (
    <svg aria-hidden="true" className="mt-head-ico" width="46" height="46" viewBox="0 0 24 24" fill="none"
      stroke="#0B2038" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12.5h5" stroke="#D9A400" strokeWidth="2" />
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
