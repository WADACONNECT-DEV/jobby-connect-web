import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ArrowIcon, EmptyState, GridIcon, InitialsAvatar, ListIcon, PageHead, PinIcon, SearchIcon } from '../components/PageParts'
import { ClampText, RefPill, SubTabs } from '../components/JobParts'
import { BubbleIcon, ClosesChip, DeclineDialog, RequestCompactCard } from '../components/RequestCards'
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
  type QuoteRate,
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
  const [confirmCancel, setConfirmCancel] = useState(false)

  // The commission + Mate Points uplift applying to the open request, so the
  // "Customer sees" column is live and correct (UAT Round 6 3.1). Read from the
  // admin rate matrix rather than assumed to be 10% - the rates are set per
  // industry, suburb and plan, so a hardcoded figure would quietly go wrong.
  const [rate, setRate] = useState<QuoteRate | null>(null)

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
   * What the customer will be shown for this line: the provider's amount plus
   * the uplift. Returns null until the rate is known, so the column shows a dash
   * rather than a figure that might be wrong.
   */
  function customerSees(amount: string): number | null {
    if (rate === null) return null
    const value = Number(amount)
    if (!amount || Number.isNaN(value) || value < 0) return null
    return Math.round(value * (1 + rate.upliftPercent / 100) * 100) / 100
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

  // List or Grid, remembered like the customer side (display option only).
  const [layout, setLayout] = usePersistedValue<'list' | 'grid'>('provider.requests.layout', 'list')

  const anyQuotable = (rows ?? []).some((r) => r.outcome === 'RECEIVED' && r.quoteId === null)

  return (
    <div className="pg pr">
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

      <DeclineDialog
        open={declineFor !== null}
        inputId={`decline-${declineFor ?? ''}`}
        message={declineMessage}
        onMessage={setDeclineMessage}
        error={declineError}
        busy={declining}
        onConfirm={() => { if (declineFor) confirmDecline(declineFor) }}
        onCancel={cancelDecline}
      />

      <PageHead
        icon={<BubbleIcon />}
        title="Requests to me"
        intro="Customers who've asked you for a quote, and where each one ended up."
      />

      {error && <div className="pg-error" role="alert">{error}</div>}
      {rows === null && !error && <div className="pg-loading">Loading…</div>}

      {rows !== null && (
        <SubTabs
          label="Requests by outcome"
          active={tab}
          onChange={setTab}
          tabs={TABS.map((key) => ({
            key,
            label: OUTCOME_LABELS[key],
            count: countOf(key),
            attention: key === 'RECEIVED' && anyQuotable,
          }))}
        />
      )}

      {/* Search, filters and sort: the same list state as before, laid out
          like the customer side. */}
      {inTab && inTab.length > 0 && (
        <div className="pg-searchrow jb-filters">
          <div className="pg-field pg-field-grow">
            <label htmlFor="pr-search">Search requests</label>
            <span className="pg-input-ico">
              <SearchIcon />
              <input
                id="pr-search"
                type="search"
                value={list.view.search}
                placeholder="Title, suburb or customer"
                onChange={(e) => list.setSearch(e.target.value)}
              />
            </span>
          </div>
          {list.filters.map((f) => (
            <div className="pg-field" key={f.key}>
              <label htmlFor={`pr-${f.key}`}>{f.key === 'category' ? 'Industry' : 'Status'}</label>
              <select id={`pr-${f.key}`} value={list.view.filters[f.key] ?? ''} onChange={(e) => list.setFilter(f.key, e.target.value)}>
                <option value="">All {f.label.toLowerCase()}</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div className="pg-field">
            <label htmlFor="pr-sort">Sort by</label>
            <span className="jb-sortbox">
              <select id="pr-sort" value={list.view.sortKey} onChange={(e) => list.setSort(e.target.value)}>
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

      {rows !== null && (
        <div className="pg-toolbar">
          {inTab && inTab.length > 0 ? (
            <h3 className="pg-count">
              {list.shown === list.total ? `${list.total} request${list.total === 1 ? '' : 's'}` : `${list.shown} of ${list.total} requests`}
            </h3>
          ) : <span />}
          <div className="pg-toolbar-end">
            {inTab && inTab.length > 0 && list.dirty && (
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

      {inTab && inTab.length === 0 && (
        <EmptyState
          action={tab === 'RECEIVED'
            ? <button type="button" className="pg-btn pg-btn-yellow" onClick={() => navigate('/provider')}>My provider profile</button>
            : undefined}
        >
          {emptyCopy[tab]}
        </EmptyState>
      )}

      {inTab && inTab.length > 0 && list.shown === 0 && (
        <EmptyState action={<button type="button" className="pg-btn pg-btn-ghost" onClick={list.clear}>Clear filters</button>}>
          No requests match these filters.
        </EmptyState>
      )}

      {list.shown > 0 && (
        <div className={layout === 'grid' ? 'jb-grid' : 'jb-list'}>
          {list.visible.map((row) => {
            const canQuote = row.outcome === 'RECEIVED' && row.quoteId === null
            const formOpen = canQuote && openFor === row.jobId
            const others = row.targetCount - 1

            // Grid: a compact card until it's opened; opening shows the full
            // card below in its place (same as the customer grid).
            if (layout === 'grid' && !list.isExpanded(row.jobId) && !formOpen) {
              return (
                <RequestCompactCard
                  key={row.jobId}
                  title={row.jobTitle}
                  customerName={row.customerName}
                  industry={CATEGORY_LABELS[row.category]}
                  suburb={row.suburb}
                  date={`Requested ${formatDate(row.requestedAt)}`}
                  refValue={row.requestRef}
                  expiresAt={row.outcome === 'RECEIVED' ? row.expiresAt : null}
                  outcomeLabel={OUTCOME_LABELS[row.outcome]}
                  attention={canQuote}
                  actionLabel={canQuote ? 'Send a quote' : 'View details'}
                  onAction={() => {
                    list.setExpanded(row.jobId, true)
                    if (canQuote) openQuote(row.jobId)
                  }}
                  onOpen={() => list.setExpanded(row.jobId, true)}
                />
              )
            }

            return (
              <article
                key={row.jobId}
                className={`jb-card pr-card${canQuote ? ' is-attention' : ''}${layout === 'grid' ? ' jb-span' : ''}`}
              >
                {layout === 'grid' && (
                  <button
                    type="button"
                    className="pg-link jb-less"
                    aria-expanded="true"
                    onClick={() => { list.setExpanded(row.jobId, false); if (formOpen) cancelQuote() }}
                  >
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
                      {row.outcome === 'RECEIVED' && row.expiresAt && <ClosesChip expiresAt={row.expiresAt} />}
                    </div>
                    <p className="pr-sub">
                      {row.customerName} · requested {formatDate(row.requestedAt)}
                      {row.timeFrame && <> · {row.timeFrame}</>}
                      {others > 0 && <> · also sent to {others} other provider{others === 1 ? '' : 's'}</>}
                    </p>
                  </div>

                  <div className="pr-side">
                    {row.quoteId && (
                      <div className="pr-amount">
                        {row.quoteTotal !== null && <span>Customer pays <strong>{formatMoney(row.quoteTotal)}</strong></span>}
                        {row.providerPayable !== null && <span>You get <strong>{formatMoney(row.providerPayable)}</strong></span>}
                        {row.quotedAt && <span className="pr-amount-date">Quoted {formatDate(row.quotedAt)}</span>}
                      </div>
                    )}
                    {canQuote ? (
                      formOpen ? null : (
                        <div className="pr-actions">
                          <button type="button" className="pg-btn pg-btn-ghost" onClick={() => openDecline(row.jobId)}>Decline</button>
                          <button type="button" className="pg-btn pg-btn-yellow" onClick={() => openQuote(row.jobId)}>
                            Send a quote <ArrowIcon />
                          </button>
                        </div>
                      )
                    ) : row.outcome === 'WON' ? (
                      <span className="pr-tag is-ok">✓ Won · {statusLabel(row.jobStatus)}</span>
                    ) : row.outcome === 'REPLIED' ? (
                      <span className="pr-tag is-ok">✓ Quote sent</span>
                    ) : (
                      <span className="pr-tag">{OUTCOME_LABELS[row.outcome]}</span>
                    )}
                  </div>
                </div>

                <ClampText text={row.description} />

                {row.outcome === 'DECLINED' && row.declineMessage && (
                  <div className="pr-declined">
                    <span className="pr-declined-head">
                      You declined this request{row.declinedAt ? ` on ${formatDate(row.declinedAt)}` : ''}
                    </span>
                    <p>{row.declineMessage}</p>
                  </div>
                )}

                {formOpen && (
                  <form className="pq" onSubmit={(e) => submitQuote(e, row.jobId)}>
                    <h4 className="pq-title">Your quote</h4>
                    {formError && <div className="pg-error" role="alert">{formError}</div>}

                    <div className="pq-section">
                      <span className="pq-label" id={`pq-lines-${row.jobId}`}>Line items</span>
                      <div className="pq-table" role="table" aria-labelledby={`pq-lines-${row.jobId}`}>
                        <div className="pq-tr pq-th" role="row">
                          <span role="columnheader">Description</span>
                          <span role="columnheader">Amount</span>
                          <span role="columnheader">GST</span>
                          <span role="columnheader">Customer sees</span>
                          <span role="columnheader" className="pg-sr">Remove</span>
                        </div>
                        {lines.map((l, i) => (
                          <div className="pq-tr" role="row" key={i}>
                            <span role="cell" className="pq-desc">
                              <input
                                aria-label={`Line ${i + 1} description`}
                                placeholder="Description (e.g. Vacate clean, 2-bed)"
                                value={l.description}
                                onChange={(e) => setLine(i, 'description', e.target.value)}
                              />
                            </span>
                            <span role="cell" className="pq-amt">
                              <span className="pq-dollar" aria-hidden="true">$</span>
                              <input
                                aria-label={`Line ${i + 1} amount`}
                                type="number" min="0" step="0.01" placeholder="0.00"
                                value={l.amount}
                                onChange={(e) => setLine(i, 'amount', e.target.value)}
                              />
                            </span>
                            <span role="cell" className="pq-gst">
                              <button
                                type="button"
                                className={`pq-toggle${l.gstApplicable ? ' on' : ''}`}
                                aria-pressed={l.gstApplicable}
                                aria-label={`GST applies to line ${i + 1}`}
                                title="Does GST apply to this line?"
                                onClick={() => setLine(i, 'gstApplicable', !l.gstApplicable)}
                              >
                                {l.gstApplicable ? '+ GST' : 'GST-free'}
                              </button>
                            </span>
                            {/* What the customer will be shown for this line, live as
                                the provider types (UAT Round 6 3.1). */}
                            <span role="cell" className="pq-sees" title="What the customer will see for this line">
                              <span className="pq-sees-label" aria-hidden="true">Customer sees </span>
                              {customerSees(l.amount) === null ? '—' : formatMoney(customerSees(l.amount) as number)}
                            </span>
                            <span role="cell" className="pq-x-cell">
                              {lines.length > 1 && (
                                <button type="button" className="pq-x" onClick={() => removeLine(i)} aria-label={`Remove line ${i + 1}`} title="Remove">×</button>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button type="button" className="pg-link pq-add" onClick={addLine}>+ Add line</button>
                      <p className="pq-hint">
                        <strong>Customer sees</strong> is your amount plus the platform's{' '}
                        {rate === null ? 'uplift' : `${rate.upliftPercent}% uplift`} — it is the figure the
                        customer is shown for that line, and the one they'll ask you about.
                      </p>
                      <p className="pq-hint">
                        Mark a line GST-free for anything you don't charge GST on — a government fee, a
                        permit, a disbursement passed on at cost. If you aren't GST-registered, no GST is
                        added either way.
                      </p>
                    </div>

                    <div className="pq-pair">
                      <div className="pg-field">
                        <label htmlFor={`pq-bonus-${row.jobId}`}>Bonus Mate Points (optional, A$)</label>
                        <input
                          id={`pq-bonus-${row.jobId}`}
                          type="number" min="0" step="0.01"
                          value={bonus}
                          onChange={(e) => { setBonus(e.target.value); edited() }}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="pg-field">
                        <span className="pq-label">Payment</span>
                        <div className="pg-seg pq-seg" role="group" aria-label="Payment">
                          <button
                            type="button"
                            className={paymentType === 'FULL' ? 'on' : ''}
                            aria-pressed={paymentType === 'FULL'}
                            onClick={() => { if (paymentType !== 'FULL') { setPaymentType('FULL'); edited() } }}
                          >
                            Full payment
                          </button>
                          <button
                            type="button"
                            className={paymentType === 'STAGED' ? 'on' : ''}
                            aria-pressed={paymentType === 'STAGED'}
                            onClick={() => { if (paymentType !== 'STAGED') { setPaymentType('STAGED'); edited() } }}
                          >
                            Staged (milestones)
                          </button>
                        </div>
                      </div>
                    </div>

                    {paymentType === 'STAGED' && (
                      <div className="pq-section pq-stages">
                        <span className="pq-label">Payment stages (percentages)</span>
                        {stages.map((st, i) => (
                          <div className="pq-stage" key={i}>
                            <input
                              aria-label={`Stage ${i + 1} name`}
                              placeholder="Stage name (e.g. Advance, Inspection)"
                              value={st.name}
                              onChange={(e) => setStage(i, 'name', e.target.value)}
                            />
                            <span className="pq-pct">
                              <input
                                aria-label={`Stage ${i + 1} percent`}
                                type="number" min="0" max="100" step="0.01" placeholder="%"
                                value={st.percent}
                                onChange={(e) => setStage(i, 'percent', e.target.value)}
                              />
                              <span aria-hidden="true">%</span>
                            </span>
                            {stages.length > 1 ? (
                              <button type="button" className="pq-x" onClick={() => removeStage(i)} aria-label={`Remove stage ${i + 1}`} title="Remove">×</button>
                            ) : <span />}
                          </div>
                        ))}
                        <button type="button" className="pg-link pq-add" onClick={addStage}>+ Add stage</button>
                        <div className={`pq-completion${completionPct() <= 0 ? ' bad' : ''}`}>
                          {completionPct() > 0
                            ? `Completion stage (auto): ${completionPct()}%`
                            : 'Stages must total less than 100% — leave room for the completion stage.'}
                        </div>
                      </div>
                    )}

                    <div className="pg-field">
                      <label htmlFor={`pq-msg-${row.jobId}`}>Message to the customer (optional)</label>
                      <input
                        id={`pq-msg-${row.jobId}`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="When you can start, what's included…"
                      />
                    </div>

                    {previewError && <div className="pg-error" role="alert">{previewError}</div>}

                    {preview && (
                      <div className="pq-breakdown" aria-label="Quote preview">
                        <h5>Preview</h5>
                        {/* The workbook's "Provider receive" chain (UAT Round 6 3.2).
                            Each amount below is shown EXCLUSIVE of GST - previously
                            each line added its own GST before display, which is where
                            the reported $33 / $33 / -$11 came from. The figures
                            themselves were always calculated on the raw line total. */}
                        <div className="pq-br"><span>Total before other charges</span><span>{formatMoney(preview.providerNet + preview.commission + preview.points)}</span></div>
                        <div className="pq-less">Less</div>
                        <div className="pq-br"><span>Platform commission ({preview.commissionRate}%)</span><span>−{formatMoney(preview.commission)}</span></div>
                        <div className="pq-br"><span>Customer Mate Points ({preview.pointsRate}%)</span><span>−{formatMoney(preview.points)}</span></div>
                        <div className="pq-br pq-muted"><span>Bonus points (you fund)</span><span>−{formatMoney(preview.bonus)}</span></div>
                        <div className="pq-br pq-sub"><span>Sub total</span><span>{formatMoney(preview.providerNet - preview.bonus)}</span></div>
                        <div className="pq-br"><span>GST 10%</span><span>{formatMoney(preview.providerPayable - (preview.providerNet - preview.bonus))}</span></div>
                        <div className="pq-br pq-you"><span>You get paid</span><span>{formatMoney(preview.providerPayable)}</span></div>
                        <div className="pq-br pq-muted"><span>Customer earns</span><span>{formatMoney(preview.pointsEarned)} in points</span></div>
                        <div className="pq-br pq-total"><span>Customer pays</span><span>{formatMoney(preview.customerTotal)}</span></div>
                        {preview.stages && preview.stages.length > 0 && (
                          <div className="pq-stage-preview">
                            <div className="pq-stage-preview-head">Payment stages</div>
                            {preview.stages.map((st, i) => (
                              <div className="pq-br" key={i}>
                                <span>{st.name}{st.completion ? ' (auto)' : ''} · {st.percent}%</span>
                                <span>{formatMoney(st.customerTotal)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pq-actions">
                      <button type="button" className="pg-btn pg-btn-ghost" onClick={cancelQuote}>Cancel</button>
                      <button type="button" className="pg-btn pg-btn-ghost" disabled={savingDraft} onClick={() => saveDraft(row.jobId)}>
                        {savingDraft ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="pg-btn pg-btn-navy" onClick={() => doPreview(row.jobId)}>Preview</button>
                      <button
                        type="submit"
                        className="pg-btn pg-btn-yellow"
                        disabled={submitting || preview === null}
                        title={preview === null ? 'Run Preview first to see the full amounts' : undefined}
                      >
                        {submitting ? 'Sending…' : 'Send Quote'}
                      </button>
                    </div>

                    <p className="pq-status">
                      {preview === null
                        ? 'Send Quote unlocks once you have previewed the full amounts.'
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
