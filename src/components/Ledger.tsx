import { formatMoney, type WalletEntry } from '../types'

/* Mate Points ledger (HANDOFF-points Part E). Display only: everything here
   is worked out from the wallet rows the page already loaded. The available
   balance itself always comes from the API, never from these sums. Amounts
   are added up in whole cents so totals don't drift by a cent. */

/* ---------- types and labels ---------- */

export const TYPE_LABELS: Record<string, string> = {
  EARNED_STANDARD: 'Standard points earned',
  EARNED_BONUS: 'Bonus points earned',
  REDEEMED: 'Points redeemed',
  REFERRAL: 'Referral points',
  ADJUSTED: 'Adjustment',
}
/** Order of the Type filter, as the hand-off lists them. */
export const TYPE_ORDER = ['EARNED_STANDARD', 'EARNED_BONUS', 'REDEEMED', 'REFERRAL', 'ADJUSTED']

const TYPE_TONE: Record<string, string> = {
  EARNED_STANDARD: 'standard',
  EARNED_BONUS: 'bonus',
  REDEEMED: 'redeemed',
  REFERRAL: 'referral',
  ADJUSTED: 'adjusted',
}

export const typeLabel = (type: string) => TYPE_LABELS[type] ?? type

export function TypeChip({ type }: { type: string }) {
  return <span className={`lg-chip lg-chip-${TYPE_TONE[type] ?? 'adjusted'}`}>{typeLabel(type)}</span>
}

/* ---------- dates ---------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A calendar day as a sortable number, e.g. 20260709. */
export type DayNum = number

const dayOf = (y: number, m: number, d: number): DayNum => y * 10000 + (m + 1) * 100 + d
const dayFromDate = (dt: Date): DayNum => dayOf(dt.getFullYear(), dt.getMonth(), dt.getDate())

/** Reads the wallet's "dd MMM yyyy" (and ISO "yyyy-mm-dd", should the API switch to it). */
export function parseDay(text: string): DayNum | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (iso) return dayOf(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const parts = text.trim().split(/\s+/)
  if (parts.length !== 3) return null
  const m = MONTHS.findIndex((name) => name.toLowerCase() === parts[1].slice(0, 3).toLowerCase())
  const d = Number(parts[0])
  const y = Number(parts[2])
  if (m < 0 || !d || !y) return null
  return dayOf(y, m, d)
}

const pad = (n: number) => String(n).padStart(2, '0')
const splitDay = (day: DayNum) => ({ y: Math.floor(day / 10000), m: Math.floor(day / 100) % 100, d: day % 100 })

/** "01 Jul 2026" */
export function showDay(day: DayNum): string {
  const { y, m, d } = splitDay(day)
  return `${pad(d)} ${MONTHS[m - 1]} ${y}`
}
/** "2026-07-01", for CSV and date inputs. */
export function isoDay(day: DayNum): string {
  const { y, m, d } = splitDay(day)
  return `${y}-${pad(m)}-${pad(d)}`
}

/* ---------- periods ---------- */

export const PERIOD_OPTIONS = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3', label: 'Last 3 months' },
  { value: 'this-fy', label: 'This financial year' },
  { value: 'last-fy', label: 'Last financial year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
] as const

/** Inclusive day range; null = open-ended. */
export type Range = { start: DayNum | null; end: DayNum | null }

/**
 * The period choice is stored as one remembered filter value:
 * '' = All time, 'this-month' etc., or 'custom:FROM:TO' with ISO dates
 * (either may be blank). Keeping it in one value means one remembered
 * setting, so Back restores the custom dates too.
 */
export function parsePeriod(value: string): { key: string; from: string; to: string } {
  if (!value) return { key: 'all', from: '', to: '' }
  if (value.startsWith('custom:')) {
    const [, from = '', to = ''] = value.split(':')
    return { key: 'custom', from, to }
  }
  return { key: value, from: '', to: '' }
}

export const customPeriod = (from: string, to: string) => `custom:${from}:${to}`

/** Financial year = 1 Jul – 30 Jun. */
export function periodRange(value: string, today = new Date()): Range {
  const { key, from, to } = parsePeriod(value)
  const y = today.getFullYear()
  const m = today.getMonth()
  const lastDay = (yy: number, mm: number) => new Date(yy, mm + 1, 0).getDate()
  const fyStartYear = m >= 6 ? y : y - 1
  switch (key) {
    case 'this-month':
      return { start: dayOf(y, m, 1), end: dayOf(y, m, lastDay(y, m)) }
    case 'last-month': {
      const lm = new Date(y, m - 1, 1)
      return { start: dayFromDate(lm), end: dayOf(lm.getFullYear(), lm.getMonth(), lastDay(lm.getFullYear(), lm.getMonth())) }
    }
    case 'last-3': {
      // This month and the two before it, up to today.
      const s = new Date(y, m - 2, 1)
      return { start: dayFromDate(s), end: dayFromDate(today) }
    }
    case 'this-fy':
      return { start: dayOf(fyStartYear, 6, 1), end: dayOf(fyStartYear + 1, 5, 30) }
    case 'last-fy':
      return { start: dayOf(fyStartYear - 1, 6, 1), end: dayOf(fyStartYear, 5, 30) }
    case 'custom':
      return { start: from ? parseDay(from) : null, end: to ? parseDay(to) : null }
    default:
      return { start: null, end: null }
  }
}

export function periodLabel(value: string): string {
  const { key, from, to } = parsePeriod(value)
  if (key === 'custom') {
    const f = from ? showDay(parseDay(from) as DayNum) : 'the start'
    const t = to ? showDay(parseDay(to) as DayNum) : 'today'
    return `${f} – ${t}`
  }
  return PERIOD_OPTIONS.find((o) => o.value === key)?.label ?? 'All time'
}

/* ---------- ledger rows ---------- */

export type LedgerRow = {
  key: string
  /** 0 = oldest entry. */
  order: number
  type: string
  description: string
  cents: number
  dateText: string
  day: DayNum | null
  /** Running balance after this entry, over the whole history. */
  balanceCents: number
}

const toCents = (amount: number) => Math.round(amount * 100)

/**
 * The API sends the history newest first and complete. Walk it oldest →
 * newest so each row carries the balance after it, whatever the filter or
 * sort later shows. Same-day entries keep the order the API gave them.
 */
export function buildLedger(history: WalletEntry[]): LedgerRow[] {
  let balance = 0
  return [...history].reverse().map((h, i) => {
    const cents = toCents(h.amount)
    balance += cents
    return {
      key: `${i}`,
      order: i,
      type: h.type,
      description: h.memo || typeLabel(h.type),
      cents,
      dateText: h.date,
      day: parseDay(h.date),
      balanceCents: balance,
    }
  })
}

export function inRange(row: LedgerRow, range: Range): boolean {
  if (range.start === null && range.end === null) return true
  if (row.day === null) return false
  if (range.start !== null && row.day < range.start) return false
  if (range.end !== null && row.day > range.end) return false
  return true
}

export type Summary = { opening: number; earned: number; redeemed: number; closing: number }

/** Opening = everything before the period; earned / redeemed = + / − within it. */
export function summarise(rows: LedgerRow[], range: Range): Summary {
  let opening = 0
  let earned = 0
  let redeemed = 0
  rows.forEach((r) => {
    if (range.start !== null && r.day !== null && r.day < range.start) opening += r.cents
    else if (inRange(r, range)) {
      if (r.cents >= 0) earned += r.cents
      else redeemed += r.cents
    }
  })
  return { opening, earned, redeemed, closing: opening + earned + redeemed }
}

export const money = (cents: number) => formatMoney(cents / 100)
/** "−$20.00" with a real minus sign. */
export const signed = (cents: number) => (cents < 0 ? `−${money(-cents)}` : `+${money(cents)}`)

/* ---------- pieces ---------- */

export const CoinIcon = () => (
  <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24">
    <ellipse cx="12" cy="17" rx="8" ry="3.2" fill="#D9A400" />
    <ellipse cx="12" cy="13.5" rx="8" ry="3.2" fill="#F7C21B" stroke="#D9A400" strokeWidth="0.8" />
    <ellipse cx="12" cy="10" rx="8" ry="3.2" fill="#FFD95A" stroke="#D9A400" strokeWidth="0.8" />
  </svg>
)

export function PeriodSummary({ summary, label }: { summary: Summary; label: string }) {
  const cards = [
    { title: 'Opening balance', value: money(summary.opening), tone: '' },
    { title: 'Earned (+)', value: signed(summary.earned), tone: 'is-earned' },
    { title: 'Redeemed (−)', value: summary.redeemed === 0 ? money(0) : signed(summary.redeemed), tone: 'is-redeemed' },
    { title: 'Closing balance', value: money(summary.closing), tone: 'is-closing' },
  ]
  return (
    <section className="lg-summary" aria-label={`Summary for ${label}`}>
      {cards.map((c) => (
        <div key={c.title} className={`lg-sum ${c.tone}`}>
          <span className="lg-sum-title">{c.title}</span>
          <span className="lg-sum-value">{c.value}</span>
        </div>
      ))}
    </section>
  )
}

/** Page numbers: first, last, and the pages either side of the current one. */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  if (pages <= 1) return null
  const shown: (number | 'gap')[] = []
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) shown.push(n)
    else if (shown[shown.length - 1] !== 'gap') shown.push('gap')
  }
  return (
    <nav className="lg-pager lg-noprint" aria-label="Ledger pages">
      <button type="button" className="lg-page" disabled={page === 1} onClick={() => onPage(page - 1)}>‹ Prev</button>
      {shown.map((n, i) =>
        n === 'gap' ? (
          <span key={`gap-${i}`} className="lg-gap" aria-hidden="true">…</span>
        ) : (
          <button
            key={n}
            type="button"
            className={`lg-page${n === page ? ' on' : ''}`}
            aria-current={n === page ? 'page' : undefined}
            aria-label={`Page ${n}`}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        ),
      )}
      <button type="button" className="lg-page" disabled={page === pages} onClick={() => onPage(page + 1)}>Next ›</button>
    </nav>
  )
}

/* ---------- CSV (built in the browser, no API) ---------- */

export type CsvLine = { date: string; type: string; description: string; earned: string; redeemed: string; balance: string }

const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const plain = (cents: number) => (cents / 100).toFixed(2)

export function ledgerCsvLine(row: LedgerRow): CsvLine {
  return {
    date: row.day !== null ? isoDay(row.day) : row.dateText,
    type: typeLabel(row.type),
    description: row.description,
    earned: row.cents >= 0 ? plain(row.cents) : '',
    redeemed: row.cents < 0 ? plain(-row.cents) : '',
    balance: plain(row.balanceCents),
  }
}

export function balanceCsvLine(label: string, day: DayNum | null, cents: number): CsvLine {
  return { date: day !== null ? isoDay(day) : '', type: '', description: label, earned: '', redeemed: '', balance: plain(cents) }
}

/** Excel-friendly: UTF-8 mark, quoted cells, Windows line ends, plain numbers. */
export function downloadCsv(filename: string, lines: CsvLine[]) {
  const header = ['Date', 'Type', 'Description', 'Earned', 'Redeemed', 'Balance']
  const body = lines.map((l) => [l.date, l.type, l.description, l.earned, l.redeemed, l.balance].map(csvCell).join(','))
  const text = '﻿' + [header.join(','), ...body].join('\r\n') + '\r\n'
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
