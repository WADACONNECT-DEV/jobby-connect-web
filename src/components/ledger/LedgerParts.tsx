import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { setPersistedValue, usePersistedValue } from '../../listView'
import { CATEGORY_LABELS, formatMoney, type LedgerRow, type LedgerStatement, type ServiceCategory } from '../../types'

/**
 * The Account Ledger, shared by the customer and provider pages (owner's ledger
 * spec, Part 2). Data is GET /me/ledger only: every figure comes from the issued
 * documents, and the running balance is the API's, worked out over the whole
 * history oldest first, so no filter on this screen changes a row's balance.
 *
 * The period, opening and closing rows and the summary cards are display
 * summaries of the rows already loaded. Dates are Melbourne dates.
 */

const TZ = 'Australia/Melbourne'
const PAGE_SIZE = 25

export type Period =
  | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'LAST_QUARTER'
  | 'THIS_FY' | 'LAST_FY' | 'ALL' | 'CUSTOM'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'THIS_MONTH', label: 'This month' },
  { key: 'LAST_MONTH', label: 'Last month' },
  { key: 'THIS_QUARTER', label: 'This quarter (BAS)' },
  { key: 'LAST_QUARTER', label: 'Last quarter (BAS)' },
  { key: 'THIS_FY', label: 'This financial year' },
  { key: 'LAST_FY', label: 'Last financial year' },
  { key: 'ALL', label: 'All time' },
  { key: 'CUSTOM', label: 'Custom' },
]

/* ---------- dates (Melbourne) ---------- */

const dateFmt = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' })
const isoDayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

export const showDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : '')
const dayOf = (iso: string) => isoDayFmt.format(new Date(iso))
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

function monthStart(y: number, m: number, offset: number): string {
  const total = y * 12 + (m - 1) + offset
  return ymd(Math.floor(total / 12), (total % 12) + 1, 1)
}

/**
 * The period as [from, to) Melbourne day strings; null is open-ended. BAS
 * quarters are Jul–Sep, Oct–Dec, Jan–Mar and Apr–Jun.
 */
function periodRange(period: Period, from: string, to: string): [string | null, string | null] {
  const [y, m] = isoDayFmt.format(new Date()).split('-').map(Number)
  const fy = m >= 7 ? y : y - 1
  const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1
  switch (period) {
    case 'THIS_MONTH': return [monthStart(y, m, 0), monthStart(y, m, 1)]
    case 'LAST_MONTH': return [monthStart(y, m, -1), monthStart(y, m, 0)]
    case 'THIS_QUARTER': return [monthStart(y, qStartMonth, 0), monthStart(y, qStartMonth, 3)]
    case 'LAST_QUARTER': return [monthStart(y, qStartMonth, -3), monthStart(y, qStartMonth, 0)]
    case 'THIS_FY': return [ymd(fy, 7, 1), ymd(fy + 1, 7, 1)]
    case 'LAST_FY': return [ymd(fy - 1, 7, 1), ymd(fy, 7, 1)]
    case 'CUSTOM': {
      let end: string | null = null
      if (to) {
        const d = new Date(`${to}T00:00:00Z`)
        d.setUTCDate(d.getUTCDate() + 1)
        end = d.toISOString().slice(0, 10)
      }
      return [from || null, end]
    }
    default: return [null, null]
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
const sum = (rows: LedgerRow[], pick: (r: LedgerRow) => number | null) => round2(rows.reduce((s, r) => s + (pick(r) ?? 0), 0))
const industryLabel = (code: string | null) => (code ? CATEGORY_LABELS[code as ServiceCategory] ?? code : '')

/* ---------- the page ---------- */

export function LedgerPage({ role }: { role: 'customer' | 'provider' }) {
  const navigate = useNavigate()
  const provider = role === 'provider'
  const [data, setData] = useState<LedgerStatement | null>(null)
  const [error, setError] = useState('')

  const key = (k: string) => `${role}.ledger.${k}`
  const [period, setPeriod] = usePersistedValue<Period>(key('period'), 'THIS_FY')
  const [from, setFrom] = usePersistedValue<string>(key('from'), '')
  const [to, setTo] = usePersistedValue<string>(key('to'), '')
  const [who, setWho] = usePersistedValue<string>(key('who'), '')
  const [industry, setIndustry] = usePersistedValue<string>(key('industry'), '')
  const [suburb, setSuburb] = usePersistedValue<string>(key('suburb'), '')
  const [search, setSearch] = usePersistedValue<string>(key('search'), '')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api<LedgerStatement>(`/me/ledger?role=${role}`, 'GET')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your ledger.'))
  }, [role])

  const all = data?.rows ?? []
  const [start, end] = periodRange(period, from, to)
  const inPeriod = (r: LedgerRow) => {
    const d = dayOf(r.date)
    return (start === null || d >= start) && (end === null || d < end)
  }
  const periodRows = all.filter(inPeriod)
  const opening = start === null ? 0 : sum(all.filter((r) => dayOf(r.date) < start), (r) => r.amount)
  const closing = round2(opening + sum(periodRows, (r) => r.amount))

  const options = useMemo(() => ({
    who: Array.from(new Set(all.map((r) => r.counterparty).filter(Boolean) as string[])).sort(),
    industry: Array.from(new Set(all.map((r) => r.industry).filter(Boolean) as string[])).sort(),
    suburb: Array.from(new Set(all.map((r) => r.suburb).filter(Boolean) as string[])).sort(),
  }), [all])

  const q = search.trim().toLowerCase()
  const shown = periodRows
    .filter((r) => !who || r.counterparty === who)
    .filter((r) => !industry || r.industry === industry)
    .filter((r) => !suburb || r.suburb === suburb)
    .filter((r) => !q || r.number.toLowerCase().includes(q) || (r.requestRef ?? '').toLowerCase().includes(q)
      || r.description.toLowerCase().includes(q))
  const filtered = Boolean(who || industry || suburb || q)

  useEffect(() => { setPage(1) }, [period, from, to, who, industry, suburb, search])

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const pageRows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  // Summary cards for the period (ledger spec Part 2).
  const invoiced = sum(periodRows, (r) => r.invoiced)
  const paid = sum(periodRows, (r) => r.paid)
  const sent = sum(periodRows, (r) => r.sent)
  const charges = Math.abs(sum(periodRows, (r) => r.charges))
  const received = sum(periodRows, (r) => r.received)
  const gstIn = sum(periodRows, (r) => (r.gst !== null && r.gst > 0 ? r.gst : 0))
  const gstOut = Math.abs(sum(periodRows, (r) => (r.gst !== null && r.gst < 0 ? r.gst : 0)))
  const gstNet = round2(gstIn - gstOut)
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? 'All time'

  function pay() {
    // Payment lives with the job: open Your Requests & Jobs on its Completed tab,
    // where the payment-due job is waiting.
    setPersistedValue('customer.jobs.tab', 'COMPLETED')
    navigate('/home/jobs')
  }

  /* ---------- downloads (the full filtered ledger) ---------- */

  const header = provider
    ? ['Date', 'ID', 'Request ID', 'Customer', 'Suburb', 'Description', 'Sent', 'Charges', 'Received', 'GST ±', 'Balance']
    : ['Date', 'ID', 'Request ID', 'Provider', 'Industry', 'Description', 'Invoiced', 'Paid', 'Balance']

  function table(): (string | number | null)[][] {
    const blank = header.slice(0, -1).map(() => null)
    const out: (string | number | null)[][] = []
    if (!filtered) out.push(['Opening balance', ...blank.slice(1), opening])
    shown.forEach((r) => {
      out.push(provider
        ? [showDate(r.date), r.number, r.requestRef, who2(r), r.suburb, r.description, r.sent, r.charges, r.received, r.gst, r.balance]
        : [showDate(r.date), r.number, r.requestRef, r.counterparty, industryLabel(r.industry), r.description, r.invoiced, r.paid, r.balance])
    })
    if (!filtered) out.push(['Closing balance', ...blank.slice(1), closing])
    return out
  }
  const fileBase = `account-ledger-${role}-${start ?? 'all'}${end ? `-to-${end}` : ''}`

  function downloadCsv() {
    const csv = [header, ...table()].map((cols) => cols.map((v) => csvCell(v)).join(',')).join('\r\n')
    save(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${fileBase}.csv`)
  }
  function downloadXlsx() {
    save(xlsx(header, table()), `${fileBase}.xlsx`)
  }

  const cols = provider ? 11 : 9

  return (
    <div className={`mt lg${provider ? ' is-provider' : ''}`}>
      <div className="mt-head">
        <div className="mt-head-copy">
          <LedgerIcon />
          <div>
            <h2 className="mt-title">Account Ledger</h2>
            <p className="mt-sub">
              {provider
                ? 'Invoices you sent, platform charges and payouts — with the GST for your BAS.'
                : 'Your invoices and payments, job by job.'}
            </p>
          </div>
        </div>
      </div>

      {error && <div className="msg err">{error}</div>}
      {data === null && !error && <div className="loading">Loading…</div>}

      {data && all.length === 0 && (
        <div className="mt-empty">
          <p>
            {provider
              ? 'Nothing here yet. When you mark a job complete, your invoice and the platform charges appear here, then the payout.'
              : 'Nothing here yet. Invoices appear when a provider marks your job complete, and your payments follow.'}
          </p>
        </div>
      )}

      {data && all.length > 0 && (
        <>
          <div className={`mt-search lg-filters${provider ? ' is-provider' : ''}`}>
            <label className="mt-field">
              <span>PERIOD</span>
              <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
            {period === 'CUSTOM' && (
              <>
                <label className="mt-field">
                  <span>FROM</span>
                  <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="mt-field">
                  <span>TO</span>
                  <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                </label>
              </>
            )}
            <label className="mt-field">
              <span>{provider ? 'CUSTOMER' : 'PROVIDER'}</span>
              <select value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">All</option>
                {options.who.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            {provider ? (
              <label className="mt-field">
                <span>SUBURB</span>
                <select value={suburb} onChange={(e) => setSuburb(e.target.value)}>
                  <option value="">All</option>
                  {options.suburb.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            ) : (
              <label className="mt-field">
                <span>INDUSTRY</span>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  <option value="">All</option>
                  {options.industry.map((s) => <option key={s} value={s}>{industryLabel(s)}</option>)}
                </select>
              </label>
            )}
            <label className="mt-field is-wide">
              <span>SEARCH</span>
              <span className="mt-input">
                <SearchIcon />
                <input type="search" value={search} placeholder="Number, e.g. INV-000017279, or description"
                  onChange={(e) => setSearch(e.target.value)} />
              </span>
            </label>
          </div>

          <div className="mp-summary lg-summary" aria-label={`Summary for ${periodLabel}`}>
            {provider ? (
              <>
                <div className="mp-sum"><span>Invoiced</span><strong>{formatMoney(sent)}</strong></div>
                <div className="mp-sum is-redeemed"><span>Charges</span><strong>−{formatMoney(charges)}</strong></div>
                <div className="mp-sum is-earned"><span>Received</span><strong>{formatMoney(received)}</strong></div>
                <div className="mp-sum"><span>GST net</span><strong>{formatMoney(gstNet)}</strong></div>
                <div className="mp-sum is-closing"><span>Still to receive</span><strong>{formatMoney(closing)}</strong></div>
              </>
            ) : (
              <>
                <div className="mp-sum"><span>Opening balance</span><strong>{formatMoney(opening)}</strong></div>
                <div className="mp-sum"><span>Invoiced</span><strong>{formatMoney(invoiced)}</strong></div>
                <div className="mp-sum is-earned"><span>Paid</span><strong>{formatMoney(paid)}</strong></div>
                <div className="mp-sum is-closing"><span>Balance owing</span><strong>{formatMoney(closing)}</strong></div>
              </>
            )}
          </div>

          <div className="mt-toolbar">
            <h3 className="mt-count">{periodLabel} · {shown.length} line{shown.length === 1 ? '' : 's'}</h3>
            <div className="mt-toolbar-end mp-actions">
              <button type="button" className="mt-btn-ghost" onClick={downloadXlsx}>Excel</button>
              <button type="button" className="mt-btn-ghost" onClick={downloadCsv}>CSV</button>
              <button type="button" className="mt-btn-ghost" onClick={() => window.print()}>Print / PDF</button>
            </div>
          </div>

          {periodRows.length === 0 ? (
            <div className="mt-empty">
              <p>Nothing in this period.</p>
              <button className="mt-btn-navy" onClick={() => setPeriod('ALL')}>Show all time</button>
            </div>
          ) : (
            <div className="lg-table-wrap">
              <table className={`lg-table${provider ? ' is-provider' : ''}`}>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">ID</th>
                    <th scope="col">{provider ? 'Customer' : 'Provider'}</th>
                    <th scope="col">{provider ? 'Suburb' : 'Industry'}</th>
                    <th scope="col">Description</th>
                    {provider ? (
                      <>
                        <th scope="col" className="is-num">Sent</th>
                        <th scope="col" className="is-num">Charges</th>
                        <th scope="col" className="is-num">Received</th>
                        <th scope="col" className="is-num">GST ±</th>
                      </>
                    ) : (
                      <>
                        <th scope="col" className="is-num">Invoiced</th>
                        <th scope="col" className="is-num">Paid</th>
                      </>
                    )}
                    <th scope="col" className="is-num">Balance</th>
                    <th scope="col"><span className="mc-sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {current === 1 && !filtered && (
                    <tr className="lg-period"><td colSpan={cols - 2}>Opening balance</td><td className="is-num" data-label="Opening balance">{formatMoney(opening)}</td><td /></tr>
                  )}
                  {filtered && current === 1 && (
                    <tr className="lg-note-row"><td colSpan={cols}>Filtered — balances are the running balance of your whole ledger.</td></tr>
                  )}
                  {pageRows.length === 0 && (
                    <tr className="lg-none"><td colSpan={cols}>No lines match these filters.</td></tr>
                  )}
                  {pageRows.map((r, i) => {
                    const prev = i > 0 ? pageRows[i - 1] : null
                    const newJob = prev !== null && (prev.quoteId !== r.quoteId || prev.stageId !== r.stageId)
                    return (
                      <tr key={`${r.number}-${r.kind}-${i}`} className={newJob ? 'is-group' : ''}>
                        <td className="lg-date" data-label="Date">{showDate(r.date)}</td>
                        <td data-label="ID"><code className="lg-ref" title={r.requestRef ?? undefined}>{r.number}</code></td>
                        <td data-label={provider ? 'Customer' : 'Provider'}>{provider ? who2(r) : r.counterparty}</td>
                        <td data-label={provider ? 'Suburb' : 'Industry'}>{provider ? r.suburb : industryLabel(r.industry)}</td>
                        <td className="lg-desc" data-label="Description">{r.description}</td>
                        {provider ? (
                          <>
                            <td className="is-num" data-label="Sent">{r.sent !== null ? formatMoney(r.sent) : ''}</td>
                            <td className="is-num lg-neg" data-label="Charges">{r.charges !== null ? `−${formatMoney(Math.abs(r.charges))}` : ''}</td>
                            <td className="is-num lg-pos" data-label="Received">{r.received !== null ? formatMoney(r.received) : ''}</td>
                            <td className={`is-num ${r.gst !== null && r.gst < 0 ? 'lg-neg' : 'lg-pos'}`} data-label="GST ±">
                              {r.gst === null ? '' : r.gst < 0 ? `−${formatMoney(Math.abs(r.gst))}` : `+${formatMoney(r.gst)}`}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="is-num" data-label="Invoiced">{r.invoiced !== null ? formatMoney(r.invoiced) : ''}</td>
                            <td className="is-num lg-pos" data-label="Paid">{r.paid !== null ? formatMoney(r.paid) : ''}</td>
                          </>
                        )}
                        <td className="is-num lg-bal" data-label="Balance">{formatMoney(r.balance)}</td>
                        <td className="lg-act">
                          <button type="button" className="lg-view" onClick={() => navigate(`/documents/${r.number}`)}>View</button>
                          {!provider && r.owing && (
                            <button type="button" className="lg-pay" onClick={pay}>Pay</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {current === pages && !filtered && (
                    <tr className="lg-period is-closing"><td colSpan={cols - 2}>Closing balance</td><td className="is-num" data-label="Closing balance">{formatMoney(closing)}</td><td /></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {provider && periodRows.length > 0 && (
            <p className="lg-gst">
              GST: collected {formatMoney(gstIn)} − paid on charges {formatMoney(gstOut)} = <strong>net {formatMoney(gstNet)}</strong> for {periodLabel.toLowerCase()}.
            </p>
          )}

          {pages > 1 && (
            <nav className="mp-pages" aria-label="Pages">
              <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>‹ Prev</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button type="button" key={n} className={n === current ? 'is-on' : ''} aria-current={n === current ? 'page' : undefined}
                  onClick={() => setPage(n)}>{n}</button>
              ))}
              <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Next ›</button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}

/** Provider view's counterparty: "Olivia A. · CAS706", or Jobby-Connect. */
function who2(r: LedgerRow): string {
  return [r.counterparty, r.counterpartyRef].filter(Boolean).join(' · ')
}

/* ---------- files ---------- */

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function csvCell(v: string | number | null): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'number' ? v.toFixed(2) : v
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function colName(i: number): string {
  let n = i + 1
  let s = ''
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26) }
  return s
}

/**
 * A one-sheet Excel workbook (.xlsx) built in the browser: the sheet XML packed
 * into a plain (stored, uncompressed) zip. Numbers are real numbers with a
 * two-decimal format, so they add up in Excel.
 */
export function xlsx(header: string[], rows: (string | number | null)[][]): Blob {
  const cell = (v: string | number | null, r: number, c: number, head = false) => {
    const ref = `${colName(c)}${r}`
    if (v === null || v === undefined || v === '') return ''
    if (typeof v === 'number') return `<c r="${ref}" s="1"><v>${v}</v></c>`
    return `<c r="${ref}" t="inlineStr"${head ? ' s="2"' : ''}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`
  }
  const sheetRows = [header, ...rows].map((row, ri) =>
    `<row r="${ri + 1}">${row.map((v, ci) => cell(v, ri + 1, ci, ri === 0)).join('')}</row>`).join('')
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
  const files: [string, string][] = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Account Ledger" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', sheet],
  ]
  return new Blob([zip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/* A minimal zip writer (stored entries) — just enough for the workbook above. */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function zip(files: [string, string][]): Uint8Array {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const [name, text] of files) {
    const nameBytes = enc.encode(name)
    const data = enc.encode(text)
    const crc = crc32(data)
    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034B50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0, true); lv.setUint16(8, 0, true)
    lv.setUint16(10, 0, true); lv.setUint16(12, 0x21, true); lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true)
    lv.setUint16(26, nameBytes.length, true); lv.setUint16(28, 0, true)
    local.set(nameBytes, 30)
    parts.push(local, data)

    const cd = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014B50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0, true)
    cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0x21, true); cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true); cv.setUint16(32, 0, true); cv.setUint16(34, 0, true); cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true); cv.setUint32(42, offset, true)
    cd.set(nameBytes, 46)
    central.push(cd)
    offset += local.length + data.length
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0)
  const endRec = new Uint8Array(22)
  const ev = new DataView(endRec.buffer)
  ev.setUint32(0, 0x06054B50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true)
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + cdSize + 22)
  let p = 0
  for (const part of [...parts, ...central, endRec]) { out.set(part, p); p += part.length }
  return out
}

/* ---------- icons ---------- */

function LedgerIcon() {
  return (
    <svg aria-hidden="true" className="mt-head-ico" width="46" height="46" viewBox="0 0 24 24" fill="none"
      stroke="#0B2038" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" />
      <path d="M15.5 16.5l1.5 1.5 3-3.5" stroke="#D9A400" strokeWidth="2.2" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6E86"
      strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" /></svg>
  )
}
