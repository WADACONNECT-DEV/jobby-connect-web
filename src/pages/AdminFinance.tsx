import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { formatDate, formatMoney, type AdminPayment, type LedgerLine, type LedgerReportSummary, type PointsReport } from '../types'

export default function AdminFinance() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<LedgerReportSummary[] | null>(null)
  const [error, setError] = useState('')
  const [openAccount, setOpenAccount] = useState<string | null>(null)
  const [lines, setLines] = useState<LedgerLine[] | null>(null)
  const [linesLoading, setLinesLoading] = useState(false)

  // manual actions
  const [quoteId, setQuoteId] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [actionErr, setActionErr] = useState('')
  const [busy, setBusy] = useState(false)

  // refunds
  const [refundQuoteId, setRefundQuoteId] = useState('')
  const [refundRows, setRefundRows] = useState<AdminPayment[] | null>(null)
  const [refundErr, setRefundErr] = useState('')
  const [refundBusy, setRefundBusy] = useState<string | null>(null)

  // Mate Points report + adjustment
  const [pReport, setPReport] = useState<PointsReport | null>(null)
  const [adjCustomer, setAdjCustomer] = useState('')
  const [adjAmount, setAdjAmount] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [pointsMsg, setPointsMsg] = useState('')
  const [pointsErr, setPointsErr] = useState('')

  const loadReports = () =>
    api<LedgerReportSummary[]>('/admin/ledger/summary', 'GET')
      .then(setReports)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load reports.'))

  const loadPoints = () =>
    api<PointsReport>('/admin/points/report', 'GET').then(setPReport).catch(() => {})

  useEffect(() => { loadReports(); loadPoints() }, [])

  async function loadLines(account: string) {
    setLinesLoading(true)
    try {
      const rows = await api<LedgerLine[]>(`/admin/ledger/account/${account}`, 'GET')
      setLines(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load lines.')
    } finally {
      setLinesLoading(false)
    }
  }

  function openDrill(account: string) {
    if (openAccount === account) { setOpenAccount(null); setLines(null); return }
    setOpenAccount(account); setLines(null); loadLines(account)
  }

  async function postAction(kind: 'cash-receipt' | 'provider-payout', e: FormEvent) {
    e.preventDefault()
    setActionErr(''); setActionMsg('')
    if (!quoteId.trim() || !amount || Number(amount) <= 0) { setActionErr('Enter a quote ID and a positive amount.'); return }
    setBusy(true)
    try {
      await api<void>(`/admin/ledger/${kind}`, 'POST', {
        quoteId: quoteId.trim(),
        amount: Number(amount),
        memo: memo.trim() || null,
      })
      setActionMsg(kind === 'cash-receipt' ? 'Cash receipt recorded.' : 'Provider payout recorded.')
      setAmount(''); setMemo('')
      loadReports()
      if (openAccount) loadLines(openAccount) // refresh open drill without toggling
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : 'Could not record entry.')
    } finally {
      setBusy(false)
    }
  }

  async function lookupPayments() {
    setRefundErr(''); setRefundRows(null)
    if (!refundQuoteId.trim()) { setRefundErr('Enter a quote ID.'); return }
    try {
      const rows = await api<AdminPayment[]>(`/admin/payments?quoteId=${refundQuoteId.trim()}`, 'GET')
      setRefundRows(rows)
    } catch (e) {
      setRefundErr(e instanceof Error ? e.message : 'Could not load payments.')
    }
  }

  async function refund(paymentId: string) {
    setRefundErr(''); setRefundBusy(paymentId)
    try {
      await api<AdminPayment>(`/admin/payments/${paymentId}/refund`, 'POST', { reason: 'Customer Service refund' })
      await lookupPayments()
      loadReports()
    } catch (e) {
      setRefundErr(e instanceof Error ? e.message : 'Refund failed.')
    } finally {
      setRefundBusy(null)
    }
  }

  async function submitAdjust() {
    setPointsErr(''); setPointsMsg('')
    if (!adjCustomer.trim() || !adjAmount || Number(adjAmount) === 0) { setPointsErr('Enter a customer ID and a non-zero amount.'); return }
    try {
      await api<void>('/admin/points/adjust', 'POST', {
        customerId: adjCustomer.trim(), amount: Number(adjAmount), reason: adjReason.trim() || null,
      })
      setPointsMsg('Adjustment recorded.'); setAdjAmount(''); setAdjReason('')
      loadPoints(); loadReports()
    } catch (e) {
      setPointsErr(e instanceof Error ? e.message : 'Could not record adjustment.')
    }
  }

  return (
    <>
      <div className="page-head">
        <h2>Finance</h2>
        <button className="btn btn-ghost-dark btn-sm" onClick={() => navigate('/admin')}>← Dashboard</button>
      </div>
      <p className="page-intro">Live financial position from the double-entry ledger. Click a report to see its entries.</p>

      {error && <div className="msg err">{error}</div>}
      {reports === null && !error && <div className="loading">Loading…</div>}

      {reports && (
        <div className="fin-grid">
          {reports.map((r) => (
            <div key={r.account}
                 className={`fin-card${openAccount === r.account ? ' on' : ''}`}
                 role="button" onClick={() => openDrill(r.account)}>
              <div className="fin-label">{r.label}</div>
              <div className="fin-balance">{formatMoney(r.balance)}</div>
              <div className="fin-side">{r.naturalSide === 'CREDIT' ? 'balance owed / earned' : 'balance in / receivable'}</div>
            </div>
          ))}
        </div>
      )}

      {openAccount && (
        <div className="md-panel" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>{reports?.find((r) => r.account === openAccount)?.label} — entries</h3>
          {linesLoading && <div className="loading">Loading…</div>}
          {lines && lines.length === 0 && <div className="md-empty">No entries yet.</div>}
          {lines && lines.length > 0 && (
            <table className="md-table">
              <thead><tr><th>Date</th><th>Type</th><th>Memo</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td>{formatDate(l.date)}</td>
                    <td>{l.entryType}{l.gstType ? ` · ${l.gstType}` : ''}</td>
                    <td>{l.memo ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>{l.debit ? formatMoney(l.debit) : ''}</td>
                    <td style={{ textAlign: 'right' }}>{l.credit ? formatMoney(l.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="md-panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Record a payment (interim)</h3>
        <p className="page-intro" style={{ marginTop: 0 }}>
          Manually post a customer cash receipt or a provider payout against a quote. This is replaced by the
          payment integration later.
        </p>
        {actionErr && <div className="msg err">{actionErr}</div>}
        {actionMsg && <div className="msg ok">{actionMsg}</div>}
        <div className="row2">
          <div>
            <label>Quote ID</label>
            <input value={quoteId} onChange={(e) => setQuoteId(e.target.value)} placeholder="quote UUID" />
          </div>
          <div>
            <label>Amount (AUD)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Memo (optional)</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
          <button className="btn btn-amber btn-sm" disabled={busy} onClick={(e) => postAction('cash-receipt', e)}>Record cash receipt</button>
          <button className="btn btn-ghost-dark btn-sm" disabled={busy} onClick={(e) => postAction('provider-payout', e)}>Record provider payout</button>
        </div>
      </div>

      <div className="md-panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Payments &amp; refunds</h3>
        <p className="page-intro" style={{ marginTop: 0 }}>Look up a quote's payments and refund one (Customer Service). A refund reverses the cash receipt in the ledger.</p>
        {refundErr && <div className="msg err">{refundErr}</div>}
        <div className="row2">
          <div>
            <label>Quote ID</label>
            <input value={refundQuoteId} onChange={(e) => setRefundQuoteId(e.target.value)} placeholder="quote UUID" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-ghost-dark btn-sm" onClick={lookupPayments}>Look up payments</button>
          </div>
        </div>
        {refundRows && refundRows.length === 0 && <div className="md-empty" style={{ marginTop: 10 }}>No payments for that quote.</div>}
        {refundRows && refundRows.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {refundRows.map((p) => (
              <div className="pay-row" key={p.id}>
                <span>
                  {formatMoney(p.amount)} · {p.method} · <strong>{p.status}</strong>
                  <span className="pay-meta"> · {formatDate(p.createdAt)}{p.stageId ? ' · staged' : ''}</span>
                </span>
                {p.status === 'SUCCEEDED'
                  ? <button className="btn btn-ghost-dark btn-xs" disabled={refundBusy === p.id} onClick={() => refund(p.id)}>{refundBusy === p.id ? 'Refunding…' : 'Refund'}</button>
                  : <span className="pay-meta">{p.status === 'REFUNDED' ? 'Refunded' : ''}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="md-panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Contract Liability — Loyalty Points</h3>
        {pReport && (
          <p className="page-intro" style={{ marginTop: 0 }}>
            Outstanding points liability: <strong>{formatMoney(pReport.closingBalance)}</strong>
          </p>
        )}
        {pointsErr && <div className="msg err">{pointsErr}</div>}
        {pointsMsg && <div className="msg ok">{pointsMsg}</div>}

        <div className="row2">
          <div>
            <label>Customer ID</label>
            <input value={adjCustomer} onChange={(e) => setAdjCustomer(e.target.value)} placeholder="customer UUID" />
          </div>
          <div>
            <label>Adjustment (AUD, +/-)</label>
            <input type="number" step="0.01" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="e.g. 5 or -5" />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Reason (optional)</label>
          <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
        </div>
        <button className="btn btn-amber btn-sm" style={{ marginTop: 12 }} onClick={submitAdjust}>Record adjustment</button>

        {pReport && pReport.rows.length > 0 && (
          <table className="md-table" style={{ marginTop: 14 }}>
            <thead><tr><th>Date</th><th>Customer</th><th>Type</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Balance</th></tr></thead>
            <tbody>
              {pReport.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.date}</td>
                  <td>{r.customerName}</td>
                  <td>{r.type}</td>
                  <td style={{ textAlign: 'right', color: r.amount < 0 ? '#c0392b' : 'inherit' }}>{formatMoney(r.amount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(r.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pReport && pReport.rows.length === 0 && <div className="md-empty" style={{ marginTop: 10 }}>No points movements yet.</div>}
      </div>
    </>
  )
}
