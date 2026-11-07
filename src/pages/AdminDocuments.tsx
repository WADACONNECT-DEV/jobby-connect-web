import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { formatMoney, type AccountDocument, type AdminDocumentTrace, type DocumentBackfillResult, type DocumentType } from '../types'
import { DocumentSheet } from './DocumentView'
import { showDate } from '../components/ledger/LedgerParts'

const TYPE_LABELS: Record<DocumentType, string> = {
  INV: 'Invoice (provider → customer)',
  INV_C: 'Charges tax invoice (Jobby-Connect → provider)',
  REPT: 'Receipt (customer payment)',
  REPT_P: 'Payout receipt (provider)',
}

/**
 * Admin: find any invoice or receipt and see its whole job (owner's ledger
 * spec, Part 1.6). Search by document number — INV-…, INV-…-C, REPT-…,
 * REPT-…-P, whole or part — or by Quote Request ID.
 */
export default function AdminDocuments() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<AdminDocumentTrace[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<{ doc: AccountDocument; receipt: AccountDocument | null; payout: AccountDocument | null } | null>(null)

  // Backfill: documents for jobs completed before documents existed (ledger spec 1.7).
  const [backfillBusy, setBackfillBusy] = useState(false)
  const [backfill, setBackfill] = useState<DocumentBackfillResult | null>(null)
  const [backfillError, setBackfillError] = useState('')

  async function runBackfill() {
    if (!window.confirm('Issue invoices and receipts for every job completed before documents existed? Numbers that already exist are skipped, so this is safe to run again. On a large database it takes a few minutes.')) return
    setBackfillBusy(true); setBackfillError(''); setBackfill(null)
    try {
      setBackfill(await api<DocumentBackfillResult>('/admin/documents/backfill', 'POST'))
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'The backfill failed.')
    } finally {
      setBackfillBusy(false)
    }
  }

  async function search(e: FormEvent) {
    e.preventDefault()
    setError(''); setOpen(null)
    if (q.trim().length < 3) { setError('Enter at least 3 characters of a number or Quote Request ID.'); return }
    setBusy(true)
    try {
      setResults(await api<AdminDocumentTrace[]>(`/admin/documents/search?q=${encodeURIComponent(q.trim())}`, 'GET'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setBusy(false)
    }
  }

  async function view(number: string) {
    setError('')
    try {
      const doc = await api<AccountDocument>(`/admin/documents/${encodeURIComponent(number)}`, 'GET')
      const get = (n: string | null | undefined) => (n
        ? api<AccountDocument>(`/admin/documents/${encodeURIComponent(n)}`, 'GET').catch(() => null)
        : Promise.resolve(null))
      const [receipt, payout] = await Promise.all([
        doc.type === 'INV' ? get(doc.related?.receipt) : Promise.resolve(null),
        doc.type === 'INV_C' ? get(doc.related?.payout) : Promise.resolve(null),
      ])
      setOpen({ doc, receipt, payout })
      setTimeout(() => document.getElementById('ad-doc')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that document.')
    }
  }

  return (
    <div className="ad">
      <div className="page-head">
        <h2>Documents</h2>
        <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/admin')}>← Dashboard</button>
      </div>
      <p className="page-intro">
        Find any invoice or receipt by its number (INV-…, INV-…-C, REPT-…, REPT-…-P, whole or part) or by
        Quote Request ID, and see every document, payment and payout for that job.
      </p>

      <form className="ad-search" onSubmit={search}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. INV-000017279 or 000017279-CAS706-PAS005-001"
          aria-label="Document number or Quote Request ID"
        />
        <button className="btn btn-amber btn-sm" type="submit" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
      </form>

      {error && <div className="msg err">{error}</div>}
      {results !== null && results.length === 0 && <div className="md-empty">No document matches “{q.trim()}”.</div>}

      <section className="md-panel ad-backfill">
        <div className="ad-backfill-row">
          <div>
            <h3 className="ad-backfill-title">Backfill documents</h3>
            <p className="page-intro" style={{ margin: 0 }}>
              Issues the invoice, charges invoice, receipt and payout receipt for every job completed before
              documents existed, dated when each thing happened. Numbers that already exist are skipped, so it's
              safe to run again. It also runs once by itself when the app starts on a database that hasn't had it.
            </p>
          </div>
          <button className="btn btn-amber btn-sm" disabled={backfillBusy} onClick={runBackfill}>
            {backfillBusy ? 'Running… this can take a few minutes' : 'Run backfill'}
          </button>
        </div>
        {backfillError && <div className="msg err">{backfillError}</div>}
        {backfill && (
          <div className={`msg ${backfill.errors === 0 ? 'ok' : 'err'}`}>
            Checked {backfill.quotesChecked} accepted quote{backfill.quotesChecked === 1 ? '' : 's'} ·{' '}
            {backfill.unitsPastCompletion} job{backfill.unitsPastCompletion === 1 ? '' : 's'}/stage{backfill.unitsPastCompletion === 1 ? '' : 's'} past completion ·{' '}
            <strong>{backfill.documentsIssued} document{backfill.documentsIssued === 1 ? '' : 's'} issued</strong>
            {backfill.errors > 0 && <> · {backfill.errors} skipped with errors. First: {backfill.firstError}</>}
            {backfill.errors === 0 && backfill.documentsIssued === 0 && <> · everything already had its documents.</>}
          </div>
        )}
      </section>

      {results?.map((t) => (
        <section className="md-panel ad-trace" key={t.quoteId}>
          <div className="ad-trace-head">
            <div>
              <h3>{t.jobTitle ?? 'Job'}</h3>
              {t.requestRef && <code className="ad-ref">{t.requestRef}</code>}
            </div>
            <div className="ad-parties">
              <div><span className="ad-label">CUSTOMER</span>{t.customer?.name ?? '—'}{t.customer?.ref ? ` · ${t.customer.ref}` : ''}</div>
              <div>
                <span className="ad-label">PROVIDER</span>{t.provider?.name ?? '—'}{t.provider?.ref ? ` · ${t.provider.ref}` : ''}
                {t.provider?.abn && <span className="ad-sub"> · ABN {t.provider.abn}</span>}
              </div>
            </div>
          </div>

          {t.units.map((u) => (
            <div className="ad-unit" key={u.stageId ?? 'whole'}>
              <span className="ad-label">{u.label.toUpperCase()}</span>
              <table className="md-table ad-table">
                <thead><tr><th>Number</th><th>Document</th><th>Issued</th><th className="is-num">Amount</th><th className="is-num">GST</th><th /></tr></thead>
                <tbody>
                  {u.documents.map((d) => (
                    <tr key={d.number}>
                      <td><code className="ad-ref">{d.number}</code></td>
                      <td>{TYPE_LABELS[d.type]}</td>
                      <td>{showDate(d.issuedAt)}</td>
                      <td className="is-num">{formatMoney(d.total)}</td>
                      <td className="is-num">{d.gst ? formatMoney(d.gst) : '—'}</td>
                      <td className="is-num"><button className="btn btn-ghost-dark btn-xs" onClick={() => view(d.number)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {t.payments.length > 0 && (
            <div className="ad-unit">
              <span className="ad-label">PAYMENTS</span>
              <table className="md-table ad-table">
                <thead><tr><th>Date</th><th>For</th><th>Method</th><th className="is-num">Cash</th><th className="is-num">Mate Points</th><th>Status</th><th>Reference</th></tr></thead>
                <tbody>
                  {t.payments.map((p, i) => (
                    <tr key={i}>
                      <td>{showDate(p.date)}</td>
                      <td>{p.unit}</td>
                      <td>{p.method}</td>
                      <td className="is-num">{formatMoney(p.cash)}</td>
                      <td className="is-num">{p.matePoints ? formatMoney(p.matePoints) : '—'}</td>
                      <td>{p.status}</td>
                      <td><code className="ad-ref">{p.reference ?? '—'}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {open && (
        <section id="ad-doc" className="ad-doc">
          <div className="dv-toolbar">
            <button type="button" className="btn btn-ghost-dark btn-sm" onClick={() => setOpen(null)}>Close document</button>
            <button type="button" className="btn btn-ghost-dark btn-sm" onClick={() => window.print()}>Print / PDF</button>
          </div>
          <div className="dv"><DocumentSheet doc={open.doc} receipt={open.receipt} payout={open.payout} /></div>
        </section>
      )}
    </div>
  )
}
