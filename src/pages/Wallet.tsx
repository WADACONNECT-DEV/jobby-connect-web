import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { formatMoney, type Wallet } from '../types'
import { useListView } from '../listView'
import { EmptyState, PageHead, SearchIcon } from '../components/PageParts'
import {
  CoinIcon,
  PERIOD_OPTIONS,
  Pager,
  PeriodSummary,
  TYPE_LABELS,
  TYPE_ORDER,
  TypeChip,
  balanceCsvLine,
  buildLedger,
  customPeriod,
  downloadCsv,
  inRange,
  ledgerCsvLine,
  money,
  parsePeriod,
  periodLabel,
  periodRange,
  showDay,
  summarise,
  type DayNum,
  type LedgerRow,
} from '../components/Ledger'

const PAGE_SIZE = 25

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Wallet>('/points/wallet', 'GET')
      .then(setWallet)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your wallet.'))
  }, [])

  /* ---------- Display only: a ledger view of the rows loaded above ----------
     (HANDOFF-points Part E). The available balance is the API's figure; the
     running balance and period totals are summaries of the loaded rows. */

  const ledger = useMemo(() => (wallet ? buildLedger(wallet.history) : null), [wallet])

  // Period, type and search are remembered after Back, like Your Jobby Mates.
  const list = useListView<LedgerRow>('customer.points', ledger, {
    search: (row) => row.description,
    filters: [
      { key: 'period', label: 'periods', options: () => [], match: (row, value) => inRange(row, periodRange(value)) },
      {
        key: 'type',
        label: 'types',
        options: () => TYPE_ORDER.map((t) => ({ value: t, label: TYPE_LABELS[t] })),
        match: (row, value) => row.type === value,
      },
    ],
    sorts: [{ key: 'date', label: 'Date', compare: (a, b) => a.order - b.order, defaultDir: 'desc' }],
    defaultSortKey: 'date',
    defaultSortDir: 'desc',
  })

  const periodValue = list.view.filters.period ?? ''
  const period = parsePeriod(periodValue)
  const range = periodRange(periodValue)
  const label = periodLabel(periodValue)
  const summary = ledger ? summarise(ledger, range) : null
  const inPeriod = ledger ? ledger.filter((row) => inRange(row, range)).length : 0
  const newestFirst = list.view.sortDir === 'desc'
  const typeOrSearch = Boolean(list.view.filters.type) || list.view.search.trim() !== ''

  // 25 rows a page; back to page 1 whenever the view changes.
  const [page, setPage] = useState(1)
  const viewKey = `${list.view.search}|${JSON.stringify(list.view.filters)}|${list.view.sortDir}`
  useEffect(() => { setPage(1) }, [viewKey])
  const pages = Math.max(1, Math.ceil(list.shown / PAGE_SIZE))
  const current = Math.min(page, pages)

  // Print shows every row of the period, not just the current page.
  const [printAll, setPrintAll] = useState(false)
  useEffect(() => {
    if (!printAll) return
    window.print()
    setPrintAll(false)
  }, [printAll])

  const rowsShown = printAll ? list.visible : list.visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  // Ledger order: Closing sits next to the newest entry, Opening next to the
  // oldest (owner decision A), so they swap ends when the date sort flips.
  const opening = { label: 'Opening balance', day: range.start, cents: summary?.opening ?? 0 }
  const closing = { label: 'Closing balance', day: range.end, cents: summary?.closing ?? 0 }
  const topRow = newestFirst ? closing : opening
  const bottomRow = newestFirst ? opening : closing

  function setPeriod(key: string) {
    if (key === 'custom') list.setFilter('period', customPeriod(period.from, period.to))
    else list.setFilter('period', key === 'all' ? '' : key)
  }

  function exportCsv() {
    const slug = period.key === 'custom' ? `${period.from || 'start'}-to-${period.to || 'today'}` : period.key
    downloadCsv(`mate-points-${slug}.csv`, [
      balanceCsvLine(topRow.label, topRow.day, topRow.cents),
      ...list.visible.map(ledgerCsvLine),
      balanceCsvLine(bottomRow.label, bottomRow.day, bottomRow.cents),
    ])
  }

  const balanceRow = (row: { label: string; day: DayNum | null; cents: number }) => (
    <tr className="lg-balrow" key={row.label}>
      <td className="lg-date">{row.day !== null ? showDay(row.day) : ''}</td>
      <td className="lg-desc" colSpan={4}>{row.label}</td>
      <td className="lg-num lg-bal">{money(row.cents)}</td>
    </tr>
  )

  return (
    <div className="pg lg">
      {/* The page's own "← Home" button is gone: the dashboard frame already
          has ← Back under the tab bar. */}
      <PageHead
        icon={<CoinIcon />}
        title="Mate Points"
        intro="Earn points on every rated job and use them on your next one."
      />

      {error && <div className="pg-error" role="alert">{error}</div>}
      {wallet === null && !error && <div className="pg-loading">Loading…</div>}

      {wallet && (
        <>
          <section className="lg-balance" aria-label="Available balance">
            <span className="lg-balance-label">Available balance</span>
            <span className="lg-balance-value">{formatMoney(wallet.balance)}</span>
            <span className="lg-balance-note">Redeemable against future jobs at checkout.</span>
          </section>

          {wallet.history.length === 0 ? (
            <EmptyState>No points activity yet. Complete and rate a job to start earning.</EmptyState>
          ) : (
            <>
              <div className="pg-searchrow lg-filters lg-noprint">
                <div className="pg-field">
                  <label htmlFor="pts-period">Period</label>
                  <select id="pts-period" value={period.key} onChange={(e) => setPeriod(e.target.value)}>
                    {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {period.key === 'custom' && (
                  <>
                    <div className="pg-field">
                      <label htmlFor="pts-from">From</label>
                      <input
                        id="pts-from"
                        type="date"
                        value={period.from}
                        max={period.to || undefined}
                        onChange={(e) => list.setFilter('period', customPeriod(e.target.value, period.to))}
                      />
                    </div>
                    <div className="pg-field">
                      <label htmlFor="pts-to">To</label>
                      <input
                        id="pts-to"
                        type="date"
                        value={period.to}
                        min={period.from || undefined}
                        onChange={(e) => list.setFilter('period', customPeriod(period.from, e.target.value))}
                      />
                    </div>
                  </>
                )}
                <div className="pg-field">
                  <label htmlFor="pts-type">Type</label>
                  <select id="pts-type" value={list.view.filters.type ?? ''} onChange={(e) => list.setFilter('type', e.target.value)}>
                    <option value="">All</option>
                    {TYPE_ORDER.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="pg-field pg-field-grow">
                  <label htmlFor="pts-search">Search</label>
                  <span className="pg-input-ico">
                    <SearchIcon />
                    <input
                      id="pts-search"
                      type="search"
                      value={list.view.search}
                      placeholder="Search descriptions"
                      onChange={(e) => list.setSearch(e.target.value)}
                    />
                  </span>
                </div>
              </div>

              {summary && <PeriodSummary summary={summary} label={label} />}

              <div className="pg-toolbar">
                <h3 className="pg-count">
                  {label} · {list.shown} entr{list.shown === 1 ? 'y' : 'ies'}
                </h3>
                <div className="pg-toolbar-end lg-noprint">
                  <button type="button" className="pg-btn pg-btn-ghost lg-btn" onClick={exportCsv} disabled={list.shown === 0}>
                    Download CSV
                  </button>
                  <button type="button" className="pg-btn pg-btn-ghost lg-btn" onClick={() => setPrintAll(true)} disabled={list.shown === 0}>
                    Print
                  </button>
                </div>
              </div>

              {inPeriod === 0 ? (
                <EmptyState
                  action={
                    <button type="button" className="pg-btn pg-btn-ghost lg-noprint" onClick={() => list.setFilter('period', '')}>
                      Show all time
                    </button>
                  }
                >
                  No points activity in this period.
                </EmptyState>
              ) : list.shown === 0 ? (
                <EmptyState
                  action={<button type="button" className="pg-btn pg-btn-ghost lg-noprint" onClick={list.clear}>Clear filters</button>}
                >
                  No entries match these filters.
                </EmptyState>
              ) : (
                <>
                  {typeOrSearch && (
                    <p className="lg-note">Opening and closing balances include all activity in the period.</p>
                  )}
                  <table className="lg-table">
                    <caption className="pg-sr">Mate Points ledger, {label}</caption>
                    <thead>
                      <tr>
                        <th scope="col" aria-sort={newestFirst ? 'descending' : 'ascending'}>
                          <button
                            type="button"
                            className="lg-sortbtn"
                            onClick={list.toggleDir}
                            title={newestFirst ? 'Show oldest first' : 'Show newest first'}
                          >
                            Date <span aria-hidden="true">{newestFirst ? '↓' : '↑'}</span>
                            <span className="pg-sr">, {newestFirst ? 'newest first' : 'oldest first'}</span>
                          </button>
                        </th>
                        <th scope="col">Type</th>
                        <th scope="col">Description</th>
                        <th scope="col" className="lg-num">Earned</th>
                        <th scope="col" className="lg-num">Redeemed</th>
                        <th scope="col" className="lg-num">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(printAll || current === 1) && balanceRow(topRow)}
                      {rowsShown.map((row) => (
                        <tr key={row.key}>
                          <td className="lg-date">{row.dateText}</td>
                          <td className="lg-type"><TypeChip type={row.type} /></td>
                          <td className="lg-desc">{row.description}</td>
                          <td className="lg-num lg-amt">{row.cents >= 0 ? money(row.cents) : ''}</td>
                          <td className="lg-num lg-amt lg-out">{row.cents < 0 ? money(-row.cents) : ''}</td>
                          <td className="lg-num lg-bal"><span className="lg-bal-label">Balance </span>{money(row.balanceCents)}</td>
                        </tr>
                      ))}
                      {(printAll || current === pages) && balanceRow(bottomRow)}
                    </tbody>
                  </table>
                  <Pager page={current} pages={pages} onPage={setPage} />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
