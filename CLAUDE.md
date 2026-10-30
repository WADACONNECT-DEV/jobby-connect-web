# Jobby-Connect web — screen-only work rules

This copy of `jobby-connect-web` is being used by the product owner to improve
**screens only**: layout, wording, visual design, and how lists are shown.
The developer owns all logic and will review every change. Follow these rules
in every session, even if a request seems to need an exception — if it does,
say so and log it (see "When a change needs logic") instead of doing it.

## Stack
React 18 + TypeScript + Vite. Plain CSS in `src/index.css` with colour tokens on
`:root` (`--navy`, `--amber`, `--teal`, `--green`, `--ink`, `--grey`, `--line`,
`--mist`, `--paper`). No Tailwind, no UI library. Backend: Spring Boot on
http://localhost:8080; website on http://localhost:5173.

## You MAY change
- JSX layout and markup inside `src/pages/*.tsx` and `src/components/*.tsx`
- `src/index.css` (reuse the existing tokens and class names where possible)
- Labels, headings, help text, empty states, error wording
- How already-loaded data is displayed: column order, cards vs tables, grouping,
  summary counts/totals calculated from rows already on the page, sticky
  headers, collapsible sections, page-by-page display (e.g. 25 per page) of a
  list the page has already loaded
- New purely presentational components in `src/components/` (they take props
  and render; they do not call the API)

## You must NOT change
- `src/api.ts`, `src/auth.tsx`, `src/adminAuth.tsx`, `src/types.ts`,
  `src/platform.ts`, `src/main.tsx`, `src/App.tsx` routes
- `src/listView.ts` behaviour: filter/sort/search state must still survive
  Back navigation and reload (UAT Round 1 §5.3). Adding a display option is
  fine; changing how state is stored is not.
- Any `api(...)` / `apiUpload(...)` call: its path, method, request body, or
  when it is called
- What a button or form *does*: which call it makes, validation rules, which
  states allow which action, redirects after an action
- Anything about money: amounts, GST, commission, Mate Points, payouts.
  Display formatting only (e.g. `$1,234.50`), never the calculation
- The backend (`jobby-connect-api`), database, migrations, `package.json`
  dependencies, Vite config

## Must keep working
- Mobile first: every screen usable at 375px wide, no sideways scrolling
- Review button labels by stars (5★ "Great Job Mate" … 1★ "Not Up to Standard")
- Customer tabs: My Details, Quote Requested, Received Quotes, Accepted Jobs,
  Completed Jobs. Provider tabs: Received, Expired, Replied, Wins, Lost,
  Job Done (Pending Payment / Pending Review / Paid)
- IDs shown exactly as issued: CASnnn, PASnnn, Quote Request IDs

## When a change needs logic
If a screen needs data the page doesn't already have, faster loading (server
paging/search), or a behaviour change: do NOT build it. Add an entry to
`BACKEND-REQUESTS.md` (create it if missing) with: screen, what the user
needs, what the API would have to provide, and why. Then build the best
screen-only version, or stop and explain.

## Every session
1. Before finishing, run `npm run build` — it must pass with no TypeScript errors.
2. Append a short entry to `CHANGES-FOR-DEVELOPER.md`: date, screen, what
   changed visually, files touched.
3. Check `git diff --stat` only lists files from "You MAY change" (plus the two
   .md files). If anything else appears, undo it.
4. Do not commit or push; the owner does that after checking in the browser.
