import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { formatMoney, type AccountDocument, type DocParty } from '../types'
import { showDate } from '../components/ledger/LedgerParts'

/**
 * One invoice or receipt as issued (owner's ledger spec, Part 2, and the sample
 * documents in invoice-fullgst.png / invoice-nogst.png):
 *   INV     tax invoice (or "Invoice" when the provider isn't GST-registered)
 *   INV-C   Jobby-Connect's charges tax invoice
 *   REPT    receipt, with a PAID stamp
 *   REPT-P  payout receipt
 *
 * A4 page with print styles. "Download PDF" opens the browser's print dialog,
 * where Save as PDF is the destination - enough for now, per the spec.
 *
 * Paid date, balance and payout date come from the related documents when they
 * have been issued; nothing is recalculated.
 */
export default function DocumentView() {
  const { number = '' } = useParams<{ number: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<AccountDocument | null>(null)
  const [receipt, setReceipt] = useState<AccountDocument | null>(null)
  const [payout, setPayout] = useState<AccountDocument | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setDoc(null); setReceipt(null); setPayout(null); setError('')
    api<AccountDocument>(`/documents/${encodeURIComponent(number)}`, 'GET')
      .then((d) => {
        setDoc(d)
        // The invoice shows when it was paid; the charges invoice when the payout went out.
        if (d.type === 'INV' && d.related?.receipt) {
          api<AccountDocument>(`/documents/${encodeURIComponent(d.related.receipt)}`, 'GET').then(setReceipt).catch(() => {})
        }
        if (d.type === 'INV_C' && d.related?.payout) {
          api<AccountDocument>(`/documents/${encodeURIComponent(d.related.payout)}`, 'GET').then(setPayout).catch(() => {})
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not open this document.'))
  }, [number])

  return (
    <div className="dv">
      <div className="dv-toolbar">
        <button type="button" className="app-back" onClick={() => navigate(-1)}>← Back</button>
        {doc && (
          <div className="dv-actions">
            <button type="button" className="mt-btn-ghost" onClick={() => window.print()}><PrintIcon /> Print</button>
            <button type="button" className="mt-btn-ghost" onClick={() => window.print()}><DownloadIcon /> Download PDF</button>
          </div>
        )}
      </div>

      {error && <div className="msg err">{error}</div>}
      {!doc && !error && <div className="loading">Loading…</div>}

      {doc && <DocumentSheet doc={doc} receipt={receipt} payout={payout} />}
    </div>
  )
}

/**
 * The document itself, as printed. Shared by this page and the admin portal's
 * Documents search, so everyone sees the same layout.
 */
export function DocumentSheet({ doc, receipt, payout }: {
  doc: AccountDocument
  receipt: AccountDocument | null
  payout: AccountDocument | null
}) {
  return (
    <article className={`dv-page is-${doc.type.toLowerCase()}`} aria-label={`${doc.title} ${doc.number}`}>
      <header className="dv-head">
        <div>
          <h1 className="dv-title">{doc.title}</h1>
          <code className="dv-number">{doc.number}</code>
        </div>
        {doc.type === 'REPT' && <span className="dv-stamp">PAID</span>}
        {doc.type === 'INV' ? <SupplierBlock p={doc.from} /> : <PlatformBlock p={doc.from} />}
      </header>

      {doc.type === 'INV' && <Invoice doc={doc} receipt={receipt} />}
      {doc.type === 'INV_C' && <ChargesInvoice doc={doc} payout={payout} />}
      {doc.type === 'REPT' && <Receipt doc={doc} />}
      {doc.type === 'REPT_P' && <PayoutReceipt doc={doc} />}

      {(doc.notes ?? []).length > 0 && (
        <footer className="dv-notes">
          {(doc.notes ?? []).map((n, i) => <p key={i}>{n}</p>)}
          {doc.requestRef && <code className="dv-req">{doc.requestRef}</code>}
        </footer>
      )}
    </article>
  )
}

/* ---------- the four documents ---------- */

function Invoice({ doc, receipt }: { doc: AccountDocument; receipt: AccountDocument | null }) {
  const paid = receipt?.received ?? null
  const balance = doc.total !== null ? Math.round(((doc.total ?? 0) - (paid ?? 0)) * 100) / 100 : null
  return (
    <>
      <div className="dv-two">
        <Block label="BILL TO">
          <PartyLine p={doc.to} />
          {doc.to?.address && <div>{doc.to.address}</div>}
        </Block>
        <Block label="DETAILS">
          <div>Date: {showDate(doc.issuedAt)} (job completed)</div>
          {doc.quoteApprovedAt && <div>Quote approved: {showDate(doc.quoteApprovedAt)}</div>}
          <div>{jobLine(doc)}</div>
          {doc.requestRef && <code className="dv-req">{doc.requestRef}</code>}
        </Block>
      </div>

      <table className="dv-table">
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col" className="is-num">Price</th>
            {doc.gstRegistered && <th scope="col" className="is-num">GST</th>}
            <th scope="col" className="is-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {(doc.lines ?? []).map((l, i) => (
            <tr key={i}>
              <td>{l.description}{l.gstFree && doc.gstRegistered && (doc.gst ?? 0) > 0 ? ' *' : ''}</td>
              <td className="is-num">{formatMoney(l.price)}</td>
              {doc.gstRegistered && <td className="is-num">{l.gst !== null ? formatMoney(l.gst) : '—'}</td>}
              <td className="is-num">{formatMoney(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="dv-totals">
        <Row label="Subtotal" value={doc.subtotal} />
        {doc.gstRegistered && <Row label="GST" value={doc.gst} />}
        <Row label="Total" value={doc.total} strong />
        {receipt && paid !== null && (
          <Row label={`Paid ${showDate(receipt.issuedAt)}`} value={-paid} paid />
        )}
        {receipt && <Row label="Balance due" value={balance} strong />}
      </div>

      {doc.pointsEarned !== null && doc.pointsEarned > 0 && (
        <p className="dv-small">You earned <strong>{formatMoney(doc.pointsEarned)} Mate Points</strong>{receipt ? `. Receipt ${receipt.number}.` : '.'}</p>
      )}
    </>
  )
}

function ChargesInvoice({ doc, payout }: { doc: AccountDocument; payout: AccountDocument | null }) {
  return (
    <>
      <div className="dv-two">
        <Block label="BILL TO">
          <PartyLine p={doc.to} withAbn />
        </Block>
        <Block label="FOR">
          <div>{doc.related?.invoice}{doc.jobTitle ? ` · ${jobLine(doc)}` : ''}</div>
          <div>Date: {showDate(doc.issuedAt)}</div>
        </Block>
      </div>

      <table className="dv-table">
        <thead>
          <tr>
            <th scope="col">Platform charge</th>
            <th scope="col" className="is-num">Amount</th>
            <th scope="col" className="is-num">GST</th>
            <th scope="col" className="is-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {(doc.charges ?? []).map((c, i) => (
            <tr key={i}>
              <td>{c.label}</td>
              <td className="is-num">{formatMoney(c.amount)}</td>
              <td className="is-num">{formatMoney(c.gst)}</td>
              <td className="is-num">{formatMoney(c.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="dv-totals">
        <Row label="Subtotal" value={doc.chargesSubtotal} />
        <Row label="GST" value={doc.chargesGst} />
        <Row label="Total charges" value={doc.chargesTotal} strong />
      </div>

      <div className="dv-summary">
        <span className="dv-label">PAYOUT SUMMARY</span>
        <Row label={`Collected from customer (${doc.related?.invoice ?? ''})`} value={doc.collected} />
        <Row label="Less these charges" value={doc.chargesTotal !== null ? -doc.chargesTotal : null} />
        <Row label={payout ? `Paid to you · ${showDate(payout.issuedAt)}` : 'To be paid to you'} value={doc.paidToProvider} strong />
      </div>
    </>
  )
}

function Receipt({ doc }: { doc: AccountDocument }) {
  return (
    <>
      <div className="dv-two">
        <Block label="RECEIVED FROM">
          <PartyLine p={doc.to} />
        </Block>
        <Block label="FOR">
          <div>{doc.related?.invoice}{doc.jobTitle ? ` · ${jobLine(doc)}` : ''}</div>
        </Block>
      </div>

      <table className="dv-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Method</th>
            <th scope="col" className="is-num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(doc.receipts ?? []).map((r, i) => (
            <tr key={i}>
              <td>{showDate(r.date)}</td>
              <td>{r.method}</td>
              <td className="is-num">{formatMoney(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="dv-totals">
        <Row label="Total received" value={doc.received} strong />
        {doc.total !== null && doc.received !== null && (
          <Row label="Invoice balance" value={Math.round((doc.total - doc.received) * 100) / 100} />
        )}
      </div>
    </>
  )
}

function PayoutReceipt({ doc }: { doc: AccountDocument }) {
  return (
    <>
      <div className="dv-two">
        <Block label="PAID TO">
          <PartyLine p={doc.to} />
        </Block>
        <Block label="FOR">
          <div>{doc.related?.invoice}</div>
          <div>{jobLine(doc)}</div>
        </Block>
      </div>

      <div className="dv-summary">
        <Row label={`Collected from customer (${doc.related?.receipt ?? ''})`} value={doc.collected} />
        <Row label={`Less charges (${doc.related?.charges ?? ''})`} value={doc.chargesTotal !== null ? -doc.chargesTotal : null} />
        <Row label={`Paid to you · ${showDate(doc.issuedAt)}`} value={doc.paidToProvider} strong />
      </div>
      {doc.payoutReference && <p className="dv-small">Payment reference: {doc.payoutReference}</p>}
    </>
  )
}

/* ---------- pieces ---------- */

function jobLine(doc: AccountDocument): string {
  return [doc.jobTitle, doc.stageName ? `Stage ${doc.stageNumber}: ${doc.stageName}` : null].filter(Boolean).join(' — ')
}

function SupplierBlock({ p }: { p: DocParty | null }) {
  if (!p) return null
  return (
    <div className="dv-from">
      <strong>{p.name}</strong>
      {p.abn && <span>ABN {p.abn}</span>}
      <span>{[p.ref, p.phone].filter(Boolean).join(' · ')}</span>
    </div>
  )
}

function PlatformBlock({ p }: { p: DocParty | null }) {
  return (
    <div className="dv-from">
      <strong className="dv-brand"><span className="dv-j">J</span> {p?.name ?? 'Jobby-Connect'}</strong>
      <span>{p?.abn ? `ABN ${p.abn}` : 'ABN —'}</span>
      {p?.address && <span>{p.address}</span>}
      {(p?.email || p?.phone) && <span>{[p?.email, p?.phone].filter(Boolean).join(' · ')}</span>}
    </div>
  )
}

function PartyLine({ p, withAbn = false }: { p: DocParty | null; withAbn?: boolean }) {
  if (!p) return null
  return (
    <div>
      <strong>{p.name}</strong>{p.ref && !withAbn ? ` · ${p.ref}` : ''}
      {withAbn && <div>{[p.abn ? `ABN ${p.abn}` : null, p.ref].filter(Boolean).join(' · ')}</div>}
    </div>
  )
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="dv-block">
      <span className="dv-label">{label}</span>
      {children}
    </div>
  )
}

function Row({ label, value, strong = false, paid = false }: { label: string; value: number | null; strong?: boolean; paid?: boolean }) {
  if (value === null || value === undefined) return null
  return (
    <div className={`dv-row${strong ? ' is-strong' : ''}${paid ? ' is-paid' : ''}`}>
      <span>{label}</span>
      <span>{value < 0 ? `−${formatMoney(Math.abs(value))}` : formatMoney(value)}</span>
    </div>
  )
}

function PrintIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" /></svg>
  )
}
function DownloadIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
  )
}
