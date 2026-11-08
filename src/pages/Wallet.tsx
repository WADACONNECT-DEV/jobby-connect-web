import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'
import { usePersistedValue } from '../listView'
import { StickyBar } from '../components/StickyBar'
import { CATEGORY_LABELS, formatMoney, type ServiceCategory, type Wallet, type WalletEntry } from '../types'

/**
 * Mate Points, as a ledger (redesign step 5, owner's points brief).
 *
 * Data is the existing GET /points/wallet call only. The balance shown at the
 * top is the API's figure, never recalculated. The running balance, opening
 * and closing rows and the period totals are display summaries of the rows
 * already loaded.
 *
 * The running balance is worked out over the whole history, oldest first, so
 * it is the same whatever filter or sort is applied.
 */

const TZ = 'Australia/Melbourne'
const PAGE_SIZE = 25

const TYPE_LABELS: Record<string, string> = {
  EARNED_STANDARD: 'Standard points earned',
  EARNED_BONUS: 'Bonus points earned',
  REDEEMED: 'Points redeemed',
  REFERRAL: 'Referral points',
  ADJUSTED: 'Adjustment',
}
const CHIP_LABELS: Record<string, string> = {
  EARNED_STANDARD: 'Standard earned',
  EARNED_BONUS: 'Bonus earned',
  REDEEMED: 'Redeemed',
  REFERRAL: 'Referral',
  ADJUSTED: 'Adjustment',
}

type Period = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'THIS_FY' | 'LAST_FY' | 'ALL' | 'CUSTOM'
const PERIODS: { key: Period; label: string }[] = [
  { key: 'THIS_MONTH', label: 'This month' },
  { key: 'LAST_MONTH', label: 'Last month' },
  { key: 'LAST_3_MONTHS', label: 'Last 3 months' },
  { key: 'THIS_FY', label: 'This financial year' },
  { key: 'LAST_FY', label: 'Last financial year' },
  { key: 'ALL', label: 'All time' },
  { key: 'CUSTOM', label: 'Custom' },
]

/** One movement with its place in the whole history. */
interface Row {
  key: string
  entry: WalletEntry
  at: number
  amount: number
  balance: number
}

/* ---------- dates (all in Melbourne time) ---------- */

function entryTime(e: WalletEntry, fallbackIndex: number): number {
  if (e.createdAt) {
    const t = Date.parse(e.createdAt)
    if (!Number.isNaN(t)) return t
  }
  const t = Date.parse(e.date)
  return Number.isNaN(t) ? fallbackIndex : t
}

const isoDayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "4 Jul 2026" in Melbourne time, always the 3-letter month. */
const dateFmt = { format: (d: Date) => { const [y, m, day] = isoDayFmt.format(d).split('-').map(Number); return `${day} ${MONTHS[m - 1]} ${y}` } }

function showDate(row: Row): string {
  return row.entry.createdAt ? dateFmt.format(new Date(row.at)) : row.entry.date
}

/** The Melbourne calendar day of a moment, as YYYY-MM-DD. */
function dayOf(ms: number): string {
  return isoDayFmt.format(new Date(ms))
}

/** Today's Melbourne date as [year, month 1-12]. */
function todayYm(): [number, number] {
  const [y, m] = dayOf(Date.now()).split('-').map(Number)
  return [y, m]
}

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

/** First day of the month `offset` months from (y, m). */
function monthStart(y: number, m: number, offset: number): string {
  const total = y * 12 + (m - 1) + offset
  return ymd(Math.floor(total / 12), (total % 12) + 1, 1)
}

/**
 * The selected period as inclusive-exclusive day strings [from, to).
 * Either side null means open-ended. Comparing YYYY-MM-DD strings keeps every
 * boundary on the Melbourne calendar.
 */
function periodRange(period: Period, from: string, to: string): [string | null, string | null] {
  const [y, m] = todayYm()
  const fyStartYear = m >= 7 ? y : y - 1
  switch (period) {
    case 'THIS_MONTH': return [monthStart(y, m, 0), monthStart(y, m, 1)]
    case 'LAST_MONTH': return [monthStart(y, m, -1), monthStart(y, m, 0)]
    case 'LAST_3_MONTHS': return [monthStart(y, m, -2), monthStart(y, m, 1)]
    case 'THIS_FY': return [ymd(fyStartYear, 7, 1), ymd(fyStartYear + 1, 7, 1)]
    case 'LAST_FY': return [ymd(fyStartYear - 1, 7, 1), ymd(fyStartYear, 7, 1)]
    case 'CUSTOM': {
      // "To" is the last day included, so the exclusive end is the day after.
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

/* ---------- page ---------- */

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [error, setError] = useState('')

  // Remembered after Back, like the other dashboard tabs (UAT §5.3).
  const [period, setPeriod] = usePersistedValue<Period>('customer.points.period', 'ALL')
  const [from, setFrom] = usePersistedValue<string>('customer.points.from', '')
  const [to, setTo] = usePersistedValue<string>('customer.points.to', '')
  const [type, setType] = usePersistedValue<string>('customer.points.type', '')
  const [search, setSearch] = usePersistedValue<string>('customer.points.search', '')
  const topBlock = useRef<HTMLDivElement | null>(null)
  const [sortDir, setSortDir] = usePersistedValue<'asc' | 'desc'>('customer.points.sort', 'desc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api<Wallet>('/points/wallet', 'GET')
      .then(setWallet)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your wallet.'))
  }, [])

  // Whole history, oldest first, each with the balance after it. The API sends
  // newest first; on a timestamp tie the API's own order decides.
  const rows: Row[] = useMemo(() => {
    if (!wallet) return []
    const indexed = wallet.history.map((entry, i) => ({ entry, i, at: entryTime(entry, -i) }))
    indexed.sort((a, b) => (a.at - b.at) || (b.i - a.i))
    let running = 0
    return indexed.map(({ entry, i, at }) => {
      running = Math.round((running + entry.amount) * 100) / 100
      return { key: `${i}`, entry, at, amount: entry.amount, balance: running }
    })
  }, [wallet])

  const [start, end] = periodRange(period, from, to)
  const inPeriod = (r: Row) => {
    const d = dayOf(r.at)
    return (start === null || d >= start) && (end === null || d < end)
  }

  const periodRows = rows.filter(inPeriod)
  const before = start === null ? [] : rows.filter((r) => dayOf(r.at) < start)
  const opening = round2(before.reduce((s, r) => s + r.amount, 0))
  const earned = round2(periodRows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0))
  const redeemed = round2(periodRows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0))
  const closing = round2(opening + earned + redeemed)

  const query = search.trim().toLowerCase()
  const shownRows = periodRows
    .filter((r) => !type || r.entry.type === type)
    .filter((r) => !query || describe(r.entry).toLowerCase().includes(query)
      || (r.entry.requestRef ?? '').toLowerCase().includes(query)
      || (r.entry.providerName ?? '').toLowerCase().includes(query))
  const ordered = sortDir === 'asc' ? shownRows : [...shownRows].reverse()

  const pages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const pageRows = ordered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  // Opening sits at the oldest end of the table and Closing at the newest end,
  // so with newest first Closing is the top row of page 1.
  const showTop = current === 1
  const showBottom = current === pages
  const topRow = sortDir === 'asc' ? 'opening' : 'closing'
  const bottomRow = sortDir === 'asc' ? 'closing' : 'opening'

  useEffect(() => { setPage(1) }, [period, from, to, type, search, sortDir])

  const hasJobColumns = rows.some((r) => r.entry.requestRef || r.entry.providerName || r.entry.category)

  function downloadCsv() {
    const header = ['Date', ...(hasJobColumns ? ['Reference', 'Company', 'Industry'] : []), 'Type', 'Description', 'Earned', 'Redeemed', 'Balance']
    const lines: string[][] = []
    const periodLine = (label: string, value: number) =>
      [label, ...(hasJobColumns ? ['', '', ''] : []), '', '', '', '', value.toFixed(2)]
    lines.push(periodLine('Opening balance', opening))
    shownRows.forEach((r) => {
      lines.push([
        showDate(r),
        ...(hasJobColumns ? [r.entry.requestRef ?? '', r.entry.providerName ?? '', categoryLabel(r.entry.category)] : []),
        TYPE_LABELS[r.entry.type] ?? r.entry.type,
        describe(r.entry),
        r.amount > 0 ? r.amount.toFixed(2) : '',
        r.amount < 0 ? (-r.amount).toFixed(2) : '',
        r.balance.toFixed(2),
      ])
    })
    lines.push(periodLine('Closing balance', closing))
    const csv = [header, ...lines].map((cols) => cols.map(csvCell).join(',')).join('\r\n')
    // The BOM makes Excel read the file as UTF-8 (the description has dashes and dots).
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mate-points-${start ?? 'all'}${end ? `-to-${end}` : ''}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? 'All time'

  return (
    <div className="mt mp">
      <div className="mt-head">
        <div className="mt-head-copy">
          <CoinIcon />
          <div>
            <h2 className="mt-title">Mate Points</h2>
            <p className="mt-sub">Earn points on every rated job and use them on your next one.</p>
          </div>
        </div>
      </div>

      {error && <div className="msg err">{error}</div>}
      {wallet === null && !error && <div className="loading">Loading…</div>}

      {wallet && (
        <>
          <div className="mp-balance">
            <span className="mp-balance-label">Available balance</span>
            <span className="mp-balance-value">{formatMoney(wallet.balance)}</span>
            <span className="mp-balance-note">Redeemable against future jobs at checkout.</span>
          </div>

          {wallet.history.length === 0 ? (
            <div className="mt-empty">
              <p>No points activity yet. Complete and rate a job to start earning.</p>
            </div>
          ) : (
            <>
              <div ref={topBlock} className="mt-top">
              <div className="mt-search mp-filters">
                <label className="mt-field">
                  <span>Period</span>
                  <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                    {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </label>
                {period === 'CUSTOM' && (
                  <>
                    <label className="mt-field">
                      <span>From</span>
                      <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                    </label>
                    <label className="mt-field">
                      <span>To</span>
                      <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                    </label>
                  </>
                )}
                <label className="mt-field">
                  <span>Type</span>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="">All</option>
                    {Object.entries(TYPE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </label>
                <label className="mt-field is-wide">
                  <span>Search</span>
                  <span className="mt-input">
                    <SearchIcon />
                    <input type="search" value={search} placeholder="Search descriptions"
                      onChange={(e) => setSearch(e.target.value)} />
                  </span>
                </label>
              </div>

              <div className="mp-summary" aria-label={`Summary for ${periodLabel}`}>
                <div className="mp-sum"><span>Opening balance</span><strong>{formatMoney(opening)}</strong></div>
                <div className="mp-sum is-earned"><span>Earned (+)</span><strong>{formatMoney(earned)}</strong></div>
                <div className="mp-sum is-redeemed"><span>Redeemed (−)</span><strong>{formatMoney(Math.abs(redeemed))}</strong></div>
                <div className="mp-sum is-closing"><span>Closing balance</span><strong>{formatMoney(closing)}</strong></div>
              </div>
              </div>

              <StickyBar anchor={topBlock}>
                <span className="sb-field">
                  <select value={period} aria-label="Period" onChange={(e) => setPeriod(e.target.value as Period)}>
                    {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </span>
                <span className="sb-field">
                  <input type="search" value={search} placeholder="Search descriptions" aria-label="Search" onChange={(e) => setSearch(e.target.value)} />
                </span>
                <span className="sb-count">{periodLabel} · {shownRows.length} entr{shownRows.length === 1 ? 'y' : 'ies'}</span>
              </StickyBar>

              <div className="mt-toolbar">
                <h3 className="mt-count">
                  {periodLabel} · {shownRows.length} entr{shownRows.length === 1 ? 'y' : 'ies'}
                </h3>
                <div className="mt-toolbar-end mp-actions">
                  <button type="button" className="mt-btn-ghost" onClick={downloadCsv}>Download CSV</button>
                  <button type="button" className="mt-btn-ghost" onClick={() => window.print()}>Print</button>
                </div>
              </div>

              {periodRows.length === 0 ? (
                <div className="mt-empty">
                  <p>No points activity in this period.</p>
                  <button className="mt-btn-navy" onClick={() => setPeriod('ALL')}>Show all time</button>
                </div>
              ) : (
                <div className="mp-table-wrap">
                  <table className={`mp-table${hasJobColumns ? ' has-job' : ''}`}>
                    <thead>
                      <tr>
                        <th scope="col">
                          <button type="button" className="mp-sort" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                            aria-label={`Date, sorted ${sortDir === 'asc' ? 'oldest first' : 'newest first'}`}>
                            Date {sortDir === 'asc' ? '↑' : '↓'}
                          </button>
                        </th>
                        {hasJobColumns && <th scope="col">Reference</th>}
                        {hasJobColumns && <th scope="col">Company</th>}
                        {hasJobColumns && <th scope="col">Industry</th>}
                        <th scope="col">Type</th>
                        <th scope="col">Description</th>
                        <th scope="col" className="is-num">Earned</th>
                        <th scope="col" className="is-num">Redeemed</th>
                        <th scope="col" className="is-num">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showTop && <PeriodRow kind={topRow} value={topRow === 'opening' ? opening : closing} jobCols={hasJobColumns} />}
                      {pageRows.length === 0 && (
                        <tr className="mp-none"><td colSpan={hasJobColumns ? 9 : 6}>No entries match these filters.</td></tr>
                      )}
                      {pageRows.map((r) => (
                        <tr key={r.key}>
                          <td className="mp-date" data-label="Date">{showDate(r)}</td>
                          {hasJobColumns && <td data-label="Reference">{r.entry.requestRef ? <code className="mp-ref">{r.entry.requestRef}</code> : ''}</td>}
                          {hasJobColumns && <td data-label="Company">{r.entry.providerName ?? ''}</td>}
                          {hasJobColumns && <td data-label="Industry">{categoryLabel(r.entry.category)}</td>}
                          <td data-label="Type"><span className={`mp-chip is-${r.entry.type.toLowerCase()}`}>{CHIP_LABELS[r.entry.type] ?? r.entry.type}</span></td>
                          <td className="mp-desc" data-label="Description">{describe(r.entry)}</td>
                          <td className="is-num mp-earned" data-label="Earned">{r.amount > 0 ? formatMoney(r.amount) : ''}</td>
                          <td className="is-num mp-redeemed" data-label="Redeemed">{r.amount < 0 ? formatMoney(-r.amount) : ''}</td>
                          <td className="is-num mp-bal" data-label="Balance">{formatMoney(r.balance)}</td>
                        </tr>
                      ))}
                      {showBottom && <PeriodRow kind={bottomRow} value={bottomRow === 'opening' ? opening : closing} jobCols={hasJobColumns} />}
                    </tbody>
                  </table>
                </div>
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
        </>
      )}
    </div>
  )
}

/** The bold Opening / Closing row for the selected period. */
function PeriodRow({ kind, value, jobCols }: { kind: 'opening' | 'closing'; value: number; jobCols: boolean }) {
  return (
    <tr className={`mp-period is-${kind}`}>
      <td colSpan={jobCols ? 8 : 5}>{kind === 'opening' ? 'Opening balance' : 'Closing balance'}</td>
      <td className="is-num" data-label={kind === 'opening' ? 'Opening balance' : 'Closing balance'}>{formatMoney(value)}</td>
    </tr>
  )
}

/* ---------- helpers ---------- */

function round2(n: number) { return Math.round(n * 100) / 100 }

/** The memo, with the job title after it when the movement belongs to a job. */
function describe(e: WalletEntry): string {
  const base = e.memo || TYPE_LABELS[e.type] || e.type
  return e.jobTitle ? `${base} · ${e.jobTitle}` : base
}

function categoryLabel(code: string | null | undefined): string {
  if (!code) return ''
  return CATEGORY_LABELS[code as ServiceCategory] ?? code
}

/** One CSV cell, quoted when it holds a comma, quote or line break. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function CoinIcon() {
  return (
    <svg aria-hidden="true" className="mt-head-ico" width="48" height="48" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#F7C21B" stroke="#D9A400" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#FFD95A" strokeWidth="1.5" />
      <path d="M12 7.2l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill="#FFF3C4" stroke="#C79300" strokeWidth="0.9" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6E86"
      strokeWidth="2.2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" /></svg>
  )
}
