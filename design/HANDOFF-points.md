# Mate Points — ledger-style redesign (Part E)

No mockup. Same look as the finished Your Jobby Mates / Requests & Jobs
pages (header row, filter row, cards, chips, list styling). File:
`src/pages/Wallet.tsx` (+ display-only components, CSS). Data: the existing
`GET /points/wallet` call only — `balance` and `history[]` with
`type`, `amount` (+ earned / − spent), `memo`, `date` ("dd MMM yyyy").
No new calls.

The owner wants the history to read like a **general ledger**: a table with
a date-period filter, opening and closing balance, and a running balance.

## Layout
1. **Header row**: coin icon, "Mate Points", intro "Earn points on every
   rated job and use them on your next one." Remove the page's own
   "← Home" button (the frame already has ← Back).
2. **Balance card** (navy, like the welcome band): "Available balance"
   and the balance large in yellow, "Redeemable against future jobs at
   checkout."
3. **Filter row** (Mates filter-row style):
   - PERIOD: This month · Last month · Last 3 months · This financial year
     (1 Jul – 30 Jun) · Last financial year · All time (default) · Custom
     (two date fields, From / To).
   - TYPE: All · Standard points earned · Bonus points earned · Points
     redeemed · Referral points · Adjustment.
   - SEARCH: text search in the description.
   - Remember the choices after Back (use the existing `listView` helpers,
     like Mates).
4. **Period summary** — four small cards for the selected period:
   Opening balance · Earned (+) · Redeemed (−) · Closing balance.
   Calculated from the rows already loaded (display totals only):
   opening = sum of all entries dated before the period start; earned =
   sum of positive entries in the period; redeemed = sum of negative
   entries in the period; closing = opening + earned + redeemed.
5. **Ledger table**:

   | Date | Type | Description | Earned | Redeemed | Balance |
   |---|---|---|---|---|---|

   - Type as a coloured chip: Standard earned (green), Bonus earned
     (yellow), Redeemed (navy outline), Referral (blue), Adjustment (grey).
     Add the missing label: `REFERRAL` → "Referral points" (today it shows
     the raw word).
   - Earned / Redeemed in separate columns, right-aligned, `$0.00`;
     the other column blank.
   - **Balance** = running balance after each entry, worked out over the
     whole history in date order (oldest → newest), so it is right whatever
     the filter or sort.
   - First row "Opening balance" and last row "Closing balance" (bold) for
     the selected period, like a ledger.
   - Sort by date, newest first by default; the column header toggles.
   - 25 rows per page with page numbers when there are more.
   - Sticky table header when scrolling.
6. **Actions** above the table, right: "Download CSV" (the rows shown for
   the selected period, built in the browser — no API) and "Print".
7. **Empty states**: no activity at all → today's text in the Mates empty
   style; nothing in the selected period → "No points activity in this
   period." + "Show all time".
8. **375 px**: the table becomes stacked rows (date + type chip on top,
   description, amount right, balance small), no sideways page scroll.

## Columns the owner asked for but the app can't fill yet
The wallet entries don't say which job they belong to. Leave these columns
out and add to BACKEND-REQUESTS.md:

> `GET /points/wallet` — for each history entry also return: `jobId`,
> `jobTitle`, the **Quote Request ID** (`requestRef`), the provider's
> **business name**, the job's **industry**, and the full timestamp in ISO
> format. (The `points_transaction` row already holds `job_id` and
> `quote_id`, so these can be joined.) Also: `date` is formatted in UTC, so
> an entry made in the morning in Australia can show the previous day —
> format in Australia/Melbourne or return ISO and let the screen format it.

When the developer adds those fields, the table gains **Reference**,
**Company** and **Industry** columns after Date, and the job title joins
the description.

## Must not change
The wallet call, the balance shown (from the API, not recalculated), any
points amounts. Running balance and period totals are display summaries
of the loaded rows only.

## Done when
- Log in as cust-0001@example.com / Test#Customer1: balance matches the
  top-bar pill; All time shows every entry; the last row's running balance
  equals the available balance.
- Pick "This financial year", "Last month", and a Custom range: opening +
  earned + redeemed = closing in the summary, and the table matches.
- Filter by Points redeemed; search; sort; page; Download CSV opens in
  Excel with the same rows; Print looks clean.
- Works at 375 px. `npm run build`: no new errors.
