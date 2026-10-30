# Changes for the developer

## 2026-10-30 — Customers landing page (design V3)

**Screen:** `/` for logged-out visitors (replaces the old dark hero + 6 category tiles).
**Reference:** `design/HANDOFF.md`, `design/customers-v3/Customers.dc.html`.

**What changed visually**
- New white nav: logo, "How it works", "For customers | For providers" pill, Log in, Create a free account.
- Light-blue hero with headline, two buttons, three trust badges and a 9-slide slideshow
  (overview, 4 step cards, 4 photos). Progress bar, prev/pause/next, caption "n of 9 · label".
  5 s per slide, first slide 7 s. Starts paused, with no animation, if the visitor has reduced motion turned on.
- "Everything you get with a free account": 4 cards, then Jobby Mates / Bring your own tradie strip.
  Card 01's search boxes are a picture only; the whole card links to `/register`.
- Navy "Run a local service business?" teaser and navy closing call-to-action band.
- All styles are new `lp-` classes at the end of `index.css`. The landing colours are variables on `.lp`,
  not `:root`, so the logged-in app looks the same as before.

**Files touched**
- `src/pages/Landing.tsx` (rewritten)
- `src/components/LandingNav.tsx`, `HeroSlideshow.tsx`, `LandingSteps.tsx` (new, display only, no API calls)
- `src/index.css` (block appended)

**Exceptions to CLAUDE.md, approved by the owner in `design/HANDOFF.md` (please review each):**
1. `src/App.tsx`: the `/` route moved out of `UserLayout`, so the landing page has no standard
   site header/footer. Same element as before: logged-in users still redirect to `/home`. No other route changed.
   The `/for-providers` route is **not** added yet; that comes with the Providers page. Until then,
   "For providers", "See what providers get" and "I'm a provider" fall through the existing `*` route back to `/`.
2. `index.html`: Google Fonts preconnect + stylesheet for Inter, Inter Tight and JetBrains Mono.
3. `public/landing/` (new folder): 4 customer photos from `design/customers-v3/assets`, renamed
   `garden-care.jpg`, `home-cleaning.jpg`, `home-repairs.jpg`, `trades.jpg`.

**For you to look at:** `npm run build` currently fails on 3 TypeScript errors that already exist at
commit `5f50e64`, before this change (checked on a clean copy of that commit):
- `src/pages/MyWork.tsx` lines 392 and 406: `string | null` passed where `string` is expected
- `src/pages/ProviderRequests.tsx` line 35: quote line missing `gstApplicable`

These are in quote/GST code, so I left them alone. The landing-page files type-check cleanly and `vite build` succeeds.

**Open question for the owner:** the slideshow and card 02 say "up to 3" providers/quotes (HANDOFF says keep 3;
spec says 4). I couldn't find a 3-provider limit in the web code, so it may only be enforced by the backend.

## 2026-10-30 — Providers landing page (design V3)

**Screen:** new `/for-providers` for logged-out visitors. Reference: `design/providers-v3/Providers.dc.html`.

**What changed visually**
- Provider theme: dark nav with a yellow top line and PROVIDERS badge, navy hero, cream page, yellow CTA band.
- Same 9-slide slideshow component as the Customers page (overview, 4 steps, 4 photos), in provider colours.
- "How to join" (3 steps), "Grow your business, on fair terms" (4 cards), "Bring your own customers" / "One login, both roles", CTA.
- Wording change (per HANDOFF): "About, Services and Careers pages" became "Home, About Us, Services and Contact Us pages",
  matching the mini-site tabs in `ProviderView.tsx`. The slide picture's tabs were changed to match.
- Links: Start as a provider → `/register`; Provider log in → `/login`; For customers / I'm a customer / logo → `/`.
  (The mockup pointed "Start as a provider" at the How to join section; HANDOFF says `/register`.)
- The slide pictures are illustrations only (a staged 30% / 70% quote, tab counts, a 5★ "Great Job Mate").
  Nothing is calculated.

**Files touched**
- `src/pages/Providers.tsx`, `src/components/ProviderSteps.tsx` (new, display only)
- `src/components/LandingNav.tsx`: provider wording + badge when `active="providers"`
- `src/components/LandingSteps.tsx`: exported existing helpers for reuse (no visual change)
- `src/index.css`: the colours that differ between the two themes are now variables on `.lp`, set to the
  same customer values as before, plus a new `.lp--providers` block at the end
- `src/components/HeroSlideshow.tsx`: unchanged

**Exceptions (approved in HANDOFF):**
1. `src/App.tsx`: added `/for-providers` next to `/`, outside `UserLayout`. Logged-in users are redirected to `/home`, as with `/`.
2. `public/landing/`: 4 provider photos added as `provider-quoting.jpg`, `provider-electrical.jpg`,
   `provider-garden.jpg`, `provider-cleaning.jpg`.

`npm run build` still stops on the same 3 TypeScript errors in `MyWork.tsx` / `ProviderRequests.tsx` noted above.

## 2026-10-30 — Providers landing page: slide 3 labels

**Screen:** `/for-providers`, slideshow slide 4 ("Step 3 · Do the job") picture.
**What changed:** the picture's tab labels now match the app's provider tabs exactly:
"Received quotes" → "Received", "Job done" → "Job Done". Text only.
**Files touched:** `src/components/ProviderSteps.tsx`

## 2026-10-30 — Log in and Create account pages (design/HANDOFF-auth.md)

**Screens:** `/login`, `/register`, plus new `/forgot-password`, `/reset-password`, `/terms`, `/privacy`.
**Reference:** `design/auth-v1/login-mockup.png`, `register-mockup.png`, in the V3 landing style.

**What changed visually**
- Slim white top bar (landing logo → `/`, "← Back to home"), a light-blue page, one big rounded card:
  a navy story panel on the left (headline, sub-text, icon steps, photo) and a white form on the right.
  Footer "© Jobby-Connect 2026 | Privacy | Terms".
- Log in: email (envelope icon), password (lock icon + show/hide), "Forgot password?" link, yellow "Log in →",
  "New to Jobby-Connect? Create a free account", info box. The curved navy edge over the photo is drawn in SVG.
- Create account: Full name, Email address, Mobile number (see below), Password (show/hide,
  "At least 8 characters"), Terms/Privacy sentence, yellow "Create account →", "Already have an account? Log in", info box.
- Phones / under 860px: the card is one column; the navy panel becomes a short band with just the headline.
- Show/hide password only switches the field between hidden and visible text.

**Not changed:** both `onSubmit` functions are byte-for-byte the same as before (same checks, error text,
`login()` / `register()` calls and redirect to `/home`). The forms still use the browser's email check.
Logged-in users still go from `/login` / `/register` to `/home`.

**Files touched**
- `src/pages/Login.tsx`, `src/pages/Register.tsx` (markup only)
- New: `src/components/AuthParts.tsx` (display only), `src/pages/ForgotPassword.tsx`, `ResetPassword.tsx`, `Terms.tsx`, `Privacy.tsx`
- `src/index.css` (new `au-` block at the end)
- `BACKEND-REQUESTS.md` (new)

**Exceptions approved by the owner (HANDOFF-auth):**
1. `src/App.tsx`: `/login` and `/register` moved outside `UserLayout` (no standard header/footer), with the same elements.
   Added public routes `/forgot-password`, `/reset-password`, `/terms`, `/privacy`, also outside `UserLayout`.
   These four have no logged-in redirect, so signed-in users can still read Terms/Privacy. No other route changed.
2. `public/landing/`: `auth-login.jpg` and `auth-register.jpg`, PROVISIONAL photos cut from the mockups.

### Do not release until connected
Each of these shows an amber "Preview — not connected yet" note and has a `// TODO(developer):` comment.

| What | Where | Needs |
|---|---|---|
| Mobile number at sign-up: shown, NOT sent | `src/pages/Register.tsx` (state + field) | Optional `mobile` on `POST /auth/register`, then pass it to `register()` (`auth.tsx`) |
| Forgot password: sends nothing, shows "Check your email" | `src/pages/ForgotPassword.tsx` | `POST /auth/forgot-password` |
| Reset password: saves nothing, shows "Password updated" | `src/pages/ResetPassword.tsx` | `POST /auth/reset-password`, plus min-8 / match checks and an expired-link message |
| Terms of Use: placeholder text | `src/pages/Terms.tsx` | Wording from the owner |
| Privacy Policy: placeholder text | `src/pages/Privacy.tsx` | Wording from the owner |

Details are in `BACKEND-REQUESTS.md`. The "Forgot password?" link on Log in and the Terms/Privacy links lead to these screens.

`npm run build` still stops only on the 3 known TypeScript errors in `MyWork.tsx` / `ProviderRequests.tsx`.

## 2026-10-30 — Logged-in frame (design/HANDOFF-mates.md, Part A)

**Screens:** every logged-in page gets the new top bar + footer. The dashboard (`/home/*`, both roles) gets the
welcome band, role switch and tab pills. Reference: `design/mates-v1/mates-mockup.png`.

**What changed visually**
- Top bar (white): landing "J" logo (→ `/home`, or `/` when logged out, as before), the existing `NotificationBell`
  (component unchanged; only its colours are adjusted for a white bar via `.fr-top .nb-btn`), and an account button
  (avatar initial + first name + ▾). The ▾ opens a menu with "Account settings" (→ `/account`) and "Log out", which runs
  the same `logout(); navigate('/')` as before. The menu closes on outside click or Escape.
- Navy welcome band: "Welcome back, {first name}." The line for non-providers changed (owner decision, 30 Oct) from
  "Request quotes from providers you choose." to "Your trusted local providers, ready for your next job.".
  Approved providers keep "Switch between requesting work and providing it.".
  The Mate Points pill moved into the band, with the same condition (customer side, balance loaded) and the same wallet call.
- White card: "As a customer | As a provider" underline tabs (approved providers only, same switching), tab bar
  as rounded pills (active navy), "← Back" kept under it as a small text link (UAT Round 7 §3), pending/rejected
  banners and the customer-profile gate restyled with the same conditions, text and targets.
  The old heading row ("As a customer" / "As a provider" / "Your dashboard") is removed; the role tabs and band carry it.
  The provider side keeps its tinted card (`--pane-provider`) so the two roles stay visually distinct.
- Footer on every logged-in page: "© Jobby-Connect 2026 · Privacy · Terms".
- The dashboard runs full width (`main.wrap:has(> .fr)`); other logged-in pages keep the 1000px column.
- 375px: the tab pills scroll sideways in their own strip, the points pill stacks under the welcome text, and the
  first name is hidden next to the avatar.

**Not changed:** in `Home.tsx` everything above `return (` (wallet call, role/tab memory, effects, `switchRole`) is
byte-for-byte the same as before. Tab names, order and routes are the same, and so are the `NavLink`s.

**Files touched:** `src/App.tsx` (Header + footer only), `src/pages/Home.tsx` (markup only), `src/index.css`
(new `fr-` block; old Home-only classes left in place, now unused; shared `banner` / `welcome` / `link-btn` rules not touched).

**Exception approved by the owner:** `src/App.tsx`, the `Header` component (HANDOFF-mates) **and** the `UserLayout`
footer line (owner decision, 30 Oct, so the new footer shows on every logged-in page). No routes changed.

## 2026-10-30 — Your Jobby Mates tab (design/HANDOFF-mates.md, Part B)

Built before HANDOFF-jobs-find Part C, at the owner's request (30 Oct), because that hand-off reuses these pieces.

**Screen:** customer dashboard → Your Jobby Mates. Reference: `design/mates-v1/mates-mockup.png`.

**What changed visually**
- Header row (heart-people icon, title, intro, yellow "Invite a Jobby Mate" → `/home/referrals`).
- Search row: SEARCH YOUR MATES, INDUSTRY, SUBURB (the same `useListView` search/filters) and a navy Search button.
  Filtering is still instant; the button only moves keyboard focus to the results count.
- Left "Refine your mates" panel: Rating radios and Reset (= `list.clear`), plus a "Your saved providers" note.
  Under 860px it sits behind a "Filters" button.
- Selection bar at the top while anything is ticked: "{n} of {cap} providers selected | Only selected providers
  will receive your request.", "Clear", "Continue with {n} →" (same `requestFromSelected`).
  `{cap}` = `useMaxProvidersPerRequest()`.
- "{n} saved mates", Sort by (same sorts + ↑/↓), List / Grid toggle (same remembered `customer.mates.layout`).
- New mate card: checkbox, initials avatar, name, "Saved" chip, industry chips, first 3 suburbs "+N suburbs"
  (falls back to service area), "Last used {date}", rating or "No reviews yet", jobs completed,
  "Add to request" / "✓ Selected", "View profile", "Remove mate". A selected card gets a yellow border and tint.
- "Need someone new? Find more providers →" strip (→ `/home/find`). Loading, error and empty states keep their text.

**Behaviour changes (owner decisions in HANDOFF-mates)**
- The per-card "Request a quote" button is replaced by "Add to request" / "✓ Selected" (the same selection as the
  checkbox, same cap and tooltip) + "Continue with n". The unused `requestQuote` function was removed.
- New **Rating** filter (Any / 4.0+ / 4.5+): a third entry in the existing `filters` array (key `rating`), so it's
  stored and restored by `useListView` like the others. Mates without reviews only show under "Any".

**Not changed:** `load`, `remove`, `toggle`, `requestFromSelected` (byte-for-byte), the `GET /mates` / `DELETE /mates/{id}`
calls, the `customer.mates` list key, search/industry/suburb filters, sorts, layout memory. No `listView.ts` change.

**Files touched:** `src/pages/Mates.tsx`; new `src/components/PageParts.tsx` (PageHead, SelectionBar, EmptyState,
InitialsAvatar, icons) and `src/components/ProviderCard.tsx`, both display only and meant to be reused by
Requests & Jobs and Find; `src/index.css` (new `pg-` / `pc-` block; old `mate-*` rules left, now unused).

**BACKEND-REQUESTS.md:** the six mockup items that need data, and the **provider cap mismatch** (website default 4,
`POST /jobs` max 3).

## 2026-10-30 — Your Jobby Mates: compact Grid cards

**Screen:** Your Jobby Mates, Grid view only. List view is unchanged.
**What changed visually:** Grid cards are now short, about the height of the old grid cards.
- 4 per row on desktop, 2 under 1180px, 1 under 640px.
- Checkbox + 40px initials avatar on one line, then the business name on one line (cut with "…", full name on hover).
- "Saved" chip + first industry chip on one line ("+N" when there are more; full list on hover).
- First 2 suburbs + "+N" on one line, cut with "…" (full list on hover).
- "★ 4.5 (100) · 100 jobs" on one line, or "No reviews yet · n jobs".
- "Last used" hidden in Grid (still shown in List).
- "Add to request" / "✓ Selected" and "View profile" side by side, small; "Remove mate" as a small link under them.

Same checkbox, buttons, cap and tooltip; nothing else changed.
**Files touched:** `src/components/ProviderCard.tsx` (new `compact` variant), `src/pages/Mates.tsx` (passes `compact` in Grid view),
`src/index.css` (grid columns + compact card rules; the old grid-card rules were replaced).

## 2026-10-30 — Your Jobby Mates: Grid card fixes

**Screen:** Your Jobby Mates, Grid view only (List unchanged).
- Long business names stay on one line and are cut with "…" inside the card (full name on hover). The compact card and
  each of its rows now have `min-width: 0` / `overflow: hidden`, so nothing can push past the card edge.
- When "Saved" + industry don't fit, the industry chip shrinks and is cut with "…" ("Saved" keeps its size).
- "Add to request" / "✓ Selected" is a full-width button on its own line. "View profile" and "Remove mate" are two small
  text links side by side underneath. Same actions as before; in List view "View profile" is still a button.

**Files touched:** `src/index.css` (compact card rules), `src/pages/Mates.tsx` (View profile class depends on layout).

## 2026-10-30 — Your Jobby Mates: Grid cards show the full business name

**Screen:** Your Jobby Mates, Grid view only (List unchanged).
- 3 cards per row on desktop (2 under 1180px, 1 under 640px).
- The business name moved up beside the initials avatar, in the checkbox row. It is always shown in full and wraps to a
  second line instead of being cut with "…". The separate name line below is gone, so the card height is unchanged.
- The industry chip is shown in full (no "…"); a very long one wraps rather than being cut.
- "Add to request" / "✓ Selected" spans the full card width.
- Everything else as before (suburbs line still cut with "…", stats line, the two small links).

**Files touched:** `src/components/ProviderCard.tsx` (compact card markup), `src/index.css` (compact card rules, grid columns).

## 2026-10-30 — Your Requests & Jobs (design/HANDOFF-jobs-find.md, Part C)

**Screen:** customer dashboard → Your Requests & Jobs, restyled to match Your Jobby Mates. Card sizes follow the List-view mate card.

**What changed visually**
- Header row: clipboard icon, "Your Requests & Jobs", "Every request, quote and job in one place.", yellow "New request" (still `/search`).
- Open · In Progress · Completed · Not Proceeded as a smaller white sub-tab bar under the main tabs. The active tab has
  navy text and a navy underline. Each has a round count badge: **yellow** when something waits for the customer, grey otherwise.
  Completed = payment due (the existing `owingCount`); **Open = an open request whose job status is Quoted** (new display-only
  check on jobs already loaded, approved by the owner). On phones the bar scrolls sideways.
- Payment-due banner in the yellow selection-bar style, same text, same "Open Completed".
- Search / Status / Industry / Sort laid out like the Mates search row (same `useListView('customer.jobs')` state), with
  "{n} requests" and "Clear filters".
- Job card: title, status chip (Open/Quoted blue, Accepted/In progress navy, Completed green, Not proceeded grey; same label
  text), date; industry chip, suburb, time frame, Quote Request IDs as monospace pills (exactly as issued); description cut
  to 2 lines with "Show more"; "Sent to" name chips (declined ones greyed) and the decline notes, same text; photos in a
  light card; progress bar yellow on grey (this page only; Your Work keeps its look); "Progress history (n)" link;
  "Assigned to" with an initials avatar; "View quote(s)" / "Leave a review".
- Quote card: provider avatar + name + status, big total, "Earn $x in Mate Points" chip, the price table in clean rows
  (same rows, figures and **UAT Round 6 wording**: Total / GST / Customer pay / points rows), staged payments as a small
  timeline with each stage's state and Pay button, the provider message as a speech bubble, and actions on the right in the same
  order. An accepted quote gets the yellow border; declined quotes are greyed.
- **"Pay with" moved** from the bar above the quotes into the owing quote's action column (owner decision). The test-only
  "Test outcome" select stays where it was, shown only while test payments are on.
- Review form: five large stars, and the submit button's label follows the stars (Functional Spec §2.8): 5★ "Great Job Mate",
  4★ "Good Job Mate", 3★ "Thanks for the Job", 2★ "Do Better Next Time Mate", 1★ "Not Up to Standard". Same submit.
- Empty states keep their text, in the Mates style. The per-sub-tab empty state also gets the "Find providers" button (`/search`).

**Not changed:** everything above `return (` in `MyJobs.tsx` apart from the imports and the new `REVIEW_LABELS` constant:
the loading of jobs, quotes, reviews, progress, wallet and capabilities, `subPageOf`, counts, `owingCount`, auto-expand when owing,
toggleQuotes, pay, use points, askAccept / "Accept Anyway", acceptQuote, openReview, submitReview.
All calls, timings, grouping rules and money figures are unchanged.

**Files touched:** `src/pages/MyJobs.tsx` (markup + `REVIEW_LABELS`), new `src/components/JobParts.tsx` (sub-tab bar, status
chip, ID pill, sent-to chips, 2-line text; display only), `src/index.css` (new `jb-` block scoped under `.jb`, plus
`.pg-btn-green`). Reuses `PageParts.tsx` (header, empty state, avatar, icons). No new BACKEND-REQUESTS.

## 2026-10-30 — Your Requests & Jobs: segmented sub-tabs + List / Grid

**Screen:** customer dashboard → Your Requests & Jobs.

**Sub-tabs (CSS only).** Open / In Progress / Completed / Not Proceeded are now a soft segmented switch:
- One light-blue track (`#EAF4FC`, 4px padding, fully rounded), sized to its content.
- Active tab: white pill with a soft shadow, navy bold text and a navy count badge.
- Inactive tabs: grey-navy text with a light-grey badge, slightly darker on hover.
- The yellow badge still shows on any tab when something waits for the customer.
- 150ms transition (none with reduced motion). It scrolls sideways inside itself on phones.

Same tabs, counts and behaviour.

**List / Grid toggle.** Same buttons and place as Your Jobby Mates, on every sub-tab. Remembered with
`usePersistedValue('customer.jobs.layout', 'list')` (new display preference, default List; same mechanism as Mates).
- List: the full job card, unchanged.
- Grid: 3 compact cards a row (2 under 1180px, 1 under 640px):
  - title (full, wraps), status chip, date
  - industry chip, suburb
  - the first Quote Request ID pill (+N if several; all on hover)
  - the assigned provider's initials + name, or "Sent to n providers"
  - a thin progress bar when there is progress
  - one full-width main button: "Pay now" (payment due) → "Review" (completed, not yet reviewed) → "View quotes (n)"
    (Open sub-tab; n only when the quotes are already loaded, so no new call) → otherwise "View details"
  - Yellow highlight when a payment is due or a quote has arrived on an open request (same rule as the badges).
- Clicking the main button or the card calls the existing `toggleQuotes(job.id)`, the same expand state and the same quote
  load as "View quotes" in List. The card then spans the full row and shows the full List-view card with a "Show less" link.
  "Review" also calls the existing `openReview`. Every button inside the opened card is the List-view button.
- Note: jobs with a payment due are already opened on load by the existing auto-expand, so in Grid they appear opened,
  with Pay reachable.

**Files touched:** `src/pages/MyJobs.tsx` (layout preference, toolbar toggle, grid branch), `src/components/JobParts.tsx`
(`JobCompactCard`), `src/index.css` (segmented sub-tabs, `jb-grid` / `jb-cc` rules).

## 2026-10-30 — Your Requests & Jobs: sub-tabs match the main tabs

**Screen:** Your Requests & Jobs, Open / In Progress / Completed / Not Proceeded. CSS only (`.jb-subtabs` / `.jb-subtab` / `.jb-badge`).
- The light-blue track is gone. The sub-tabs use the main tab pill style at about 80% size: 14px text, 8px × 16px padding,
  8px corners, the same 6px gap.
- Active: solid navy pill, white bold text, white count badge with a navy number.
- Inactive: no background, navy text, light-blue background on hover, light-grey count badge.
- The yellow badge still shows on any tab when something waits for the customer.
- A little more space above the sub-tabs than below. They scroll sideways inside their own strip on phones.

Same tabs, counts and behaviour.

## 2026-10-30 — Find & Request Quotes (design/HANDOFF-jobs-find.md, Part D)

**Screen:** customer dashboard → Find & Request Quotes, restyled like Your Jobby Mates.

**What changed visually**
- Header: magnifier icon, "Find & Request Quotes", "Choose the service and the suburb — you'll see providers who cover both."
- Search row in the Mates style: SERVICE INDUSTRY, SUBURB (same `SuburbPicker`), SORT BY, and a navy **Search** button (was "Apply";
  still disabled until both are chosen, with the same tooltip). The "both are needed" hint is unchanged.
- Selection bar at the top (the shared Mates `SelectionBar`): "{n} of {cap} providers selected | Only selected providers will
  receive your request.", "Clear", "Continue with {n} →" (same `proceed`). It replaces the sticky bottom bar. "Clear" is new and
  only empties the local selection.
- "{n} providers found" + List / Grid toggle, remembered with `usePersistedValue('customer.find.layout', 'list')`
  (default List, owner decision).
- Result card = the shared `ProviderCard`.
  - List: checkbox, initials avatar, name, "+$x Mate Points offered" chip (when `promoPoints > 0`), service area, ★ rating
    "(n reviews)" or "No reviews yet", "% rating" (kept so the ranking stays explainable, UAT Round 4 §3.3–3.5), jobs completed,
    "Add to request" / "✓ Selected", "View profile", "♡ Save as Jobby Mate" / "♥ Saved".
  - Grid: the same compact card as Mates (3 a row), with "View profile" and "♡ Save" as small links.
- The old category chips are no longer shown (empty for the new industries; see BACKEND-REQUESTS.md).
- Before-search, searching, no-results and error states in the Mates style (no-results text unchanged).

**Not changed:** the industries load, `runSearch`, `changeSort` (re-searches), `toggleSelect` and its cap, `saveMate`, `proceed`.
Only the imports, a tooltip string and the layout preference were added above `return (`.

**Files touched:** `src/pages/Search.tsx`; `src/components/ProviderCard.tsx` (optional `ratingPercent`, List view only;
Mates doesn't pass it); `src/index.css` (small `fd-` block, `.pg-link:disabled`).

**For you (existing gap, not changed):** the chosen industry, suburb, sort and results on this page are held in component state,
so they are not restored after Back or reload, which CLAUDE.md / UAT Round 1 §5.3 asks of list screens. Fixing it means
changing how that state is stored, so it's left for you.

## 2026-10-30 — Mate Points ledger (design/HANDOFF-points.md, Part E)

**Screen:** customer dashboard → Mate Points, redesigned as a general ledger in the Mates / Requests & Jobs style.

**What changed visually**
- Header (coin icon, "Mate Points", intro). The page's own "← Home" button is removed; the frame has ← Back.
- Navy balance card: "Available balance" (the API's `balance`, not recalculated), "Redeemable against future jobs at checkout."
- Filter row:
  - PERIOD: This month, Last month, Last 3 months (this month + the two before, to today), This / Last financial year
    (1 Jul – 30 Jun), All time (default), Custom with From / To.
  - TYPE: All + the five types.
  - SEARCH: in the description.
  - Remembered with `useListView('customer.points')`. A custom range is stored in the one `period` value
    (`custom:FROM:TO`), so no new storage.
- Period summary: Opening, Earned (+), Redeemed (−), Closing. Formulas as in HANDOFF, summed in whole cents.
- Ledger table: Date · Type (coloured chip) · Description · Earned · Redeemed · Balance.
  - New label `REFERRAL` → "Referral points".
  - Running balance over the whole history, oldest → newest (the API returns it complete, newest first, `createdAt desc`).
  - Opening / Closing rows in bold. Per **owner decision A**, Closing sits next to the newest entry and Opening next to the
    oldest, so they swap ends when the Date header flips the sort (newest first by default).
  - 25 rows a page with page numbers, and a sticky header under the top bar.
  - A note appears when Type / Search narrow the table: "Opening and closing balances include all activity in the period."
- Download CSV (built in the browser: every row in the current view across all pages plus opening/closing rows; UTF-8 BOM,
  ISO dates, plain numbers for Excel) and Print (prints the whole view without the frame, filters or buttons).
- Empty states: "No points activity yet…" (today's text); "No points activity in this period." + "Show all time";
  "No entries match these filters." + "Clear filters".
- 375px: rows stack (date + type chip on top, description with the amount on the right, balance small).

**Not changed:** the single `GET /points/wallet` call (byte-for-byte), the balance shown, all amounts.

**Checked:** a throwaway test of the ledger maths (not added to the project) against sample data. The last running balance
equals the available balance; opening + earned + redeemed = closing for this / last FY, last month, custom and all time,
and it matches the table; financial-year boundaries are right in July and in January.

**Files touched:** `src/pages/Wallet.tsx`; new `src/components/Ledger.tsx` (period ranges, date reading, running balance,
summary, type chip, pager, CSV; display only); `src/index.css` (new `lg-` block incl. print rules scoped with
`body:has(.lg)`).

**BACKEND-REQUESTS.md:** job details on wallet entries (Reference / Company / Industry columns) and the UTC date issue.

## 2026-10-30 — Mate Points ledger: planned ID column (waiting on the API)

**Not built yet; recorded so it's not lost.** When `GET /points/wallet` returns `ref` on each history entry (HIGH-priority
request in BACKEND-REQUESTS.md: `MPT` + zero-padded sequence, e.g. `MPT000123`, shown exactly as issued):
- The ledger table gains an **ID** column first, before Date, as a monospace pill (same style as the Quote Request ID pill, `jb-ref`).
- The **CSV** gains an ID column first, and **Print** shows it.
- The **search box** matches the ID as well as the description.
- On phones the ID sits on the top line of each stacked row, beside the date.

Where to change it: `WalletEntry` in `src/types.ts` (developer), `buildLedger` / `ledgerCsvLine` in `src/components/Ledger.tsx`,
and the table and `search` option in `src/pages/Wallet.tsx`.

## 2026-10-30 — Jobby Mate Referrals, customer view (design/HANDOFF-referrals.md, Part F)

**Screen:** Jobby Mate Referrals (`src/pages/JobbyMate.tsx`, serves both roles). Reference: `design/referrals-v1/referrals-mockup.png`.

**What changed visually**
- Header (people-plus icon, "Jobby Mate Referrals", new intro). The page's own "← Home" button is removed (frame has ← Back).
- "How it works" strip: 1 Invite a provider by mobile → 2 They join → 3 They accept your referral → 4 You earn Mate Points,
  plus "If they decline, you still stay connected — no points are earned."
- Two cards side by side (stacked under 860px, Invite first):
  - **Invite a provider**: "EARN POINTS" badge, labelled fields (mobile, name, industry), full-width yellow "Send invite →".
  - **Have a referral code?**: light blue, field + navy "Claim", and the tip box. The placeholder stays "Referral code"; the
    mockup's example code format wasn't shown.
- Provider-only "Invite your customers" and "Referral offers awaiting you": same content and behaviour, new card style.
- "Your connections · n" (renamed from "Your Jobby Mates", which clashed with tab 1).
  - Status filter + name / industry / suburb search.
  - Rows: initials avatar, name, industry · suburb · direction, status chip (existing `referralStatusLabel` labels; colour and
    lightness differ), "{n} pts" or "—", date, "Report unpaid".
- Notices: success in the yellow bar, errors in the red bar (same text). Empty states in the Mates style.
- Phones: rows stack (name + chip on top, details, points on the right).

**Behaviour**
- Unchanged, byte-for-byte: `load`, `claim`, `inviteProvider`, `inviteCustomers`, `decide`, `complain`, `pendingOffers`,
  `summarise`. The Send invite / Claim disabled rules are unchanged, and no `<form>` was added (Enter doesn't submit).
- Changed (asked for by HANDOFF): the connections search moved from `useState` / `useMemo` to
  `useListView('referrals.connections')`, so it is remembered after Back. It searches the same fields, joined by line breaks so
  a search can't span two fields. A new Status filter offers only the statuses present. No sort; the API order is kept.

**Mockup differences not followed (per HANDOFF):** amounts stay in points ("{n} pts"), not dollars. "Report unpaid" stays
where it is today (Points overdue **and** "They referred you"), not on a "You referred them" row as drawn.

**Files touched:** `src/pages/JobbyMate.tsx`; new `src/components/ReferralParts.tsx` (how-it-works strip, status chip,
connection row; display only); `src/index.css` (new `rf-` block; old `jm-` rules left, unused).

**BACKEND-REQUESTS.md:** invites sent but not joined yet; points unit (owner decision).

## 2026-10-30 — Request quotes on one page (design/HANDOFF-request.md, Part G)

**What changed visually**
- Request quotes is now one page: "← Back", header (document icon, "Request quotes", new intro), then four numbered cards:
  1 What do you need? (title, service industry, description with a live "n / 4000" counter),
  2 Where is the job? (suburb type-ahead + job address side by side, green "Your registered address" tag while the
  pre-filled address is unchanged, otherwise the existing "Use my registered address" link),
  3 Photos (optional) (drop zone + thumbnails with × to remove, before sending),
  4 When? (optional) (time-frame chips: As soon as possible · Within a week · Within 2 weeks · Within a month · Flexible ·
  Other… which shows the free-text box; Request expires).
- Send bar: "Your request goes only to the provider(s) you chose…", Cancel (= Back), yellow "Send request to n provider(s) →".
- Sidebar: "Sending to" (initials avatar + business name, "← Change providers" = Back) and "What happens next" with the
  Mate Points note. Under 900px it is one column with "Sending to" above the form.
- Success screen replaces the old "add photos" step: green tick, "Request sent", "Sent to …", "n photo(s) attached" or the
  partial-failure note listing each failed photo and the server's reason, the next steps, "View my request" (→ /home/jobs)
  and "Find more providers" (→ /home/find).
- "No providers selected" screen restyled only (same text, same button to /home/find).

**Behaviour**
- Unchanged: the `POST /jobs` call, body, validation check and messages; the providers passed in from Mates/Find; Enter
  still submits the form. The time-frame chips just fill the same `timeFrame` text. The "n / 4000" counter only shows
  the count (turns red over 4000); it doesn't block typing. The server's `@Size(max = 4000)` still decides.
- **Exception approved by the owner (this task only):** photos are picked before sending. After `POST /jobs` succeeds, the
  page uploads each chosen photo, one at a time, with the same call `ImageUploader` uses
  (`apiUpload('/jobs/{id}/images?kind=REQUEST', form)`), and the button shows "Uploading photos 2 of 3…". A failed photo
  doesn't undo the request. The page keeps going with the remaining photos and lists the failures on the success screen.
  `ImageUploader` itself is unchanged.

**Files touched:** `src/pages/NewRequest.tsx`; new `src/components/RequestParts.tsx` (section card, photo picker, time-frame
chips, Sending to, next steps; display only, no API calls); `src/index.css` (new `rq-` block).

`npm run build` still stops only on the 3 known TypeScript errors in `MyWork.tsx` / `ProviderRequests.tsx`. `vite build`
succeeds.

## 2026-10-30 — Account + Your details form (design/HANDOFF-account.md, Part H)

**What changed visually**
- **Account (/account):** navy band like the dashboard welcome band (yellow initials circle, full name, CAS pill, PAS pill
  when there is one, "Your details, sign-in and how you use Jobby-Connect."), then "← Back".
  - **Your details** card: Name · Mobile (shown as `0498 000 204`; display only, other formats shown as stored) · Address
    ("Not added" in grey when empty), "Edit details" → /customer-profile ("Complete your profile" while incomplete, as today).
  - **Sign-in & security** card: login email (read only), password dots + "Change password", Your IDs with "Copy" links
    (copies the ID, shows "Copied" for 2 s).
  - "Change password" opens a **preview** panel (current / new / confirm with show-hide eyes, disabled Save, amber
    "Preview — not connected yet"). Nothing is sent. The inputs aren't in a form and have no handler.
  - **Offering your services**: the same 4 states, wording and `/provider` buttons. Adds the steps 1 Set up your profile →
    2 Admin review → 3 Start quoting (step 1 highlighted when there's no profile; step 2 when PENDING; all ticked when
    APPROVED; none when REJECTED). With no profile, a blue "Become a provider" box with the yellow button. PENDING and
    REJECTED messages are now yellow / red banners.
- **Your details form (/customer-profile):** new card style with icon inputs. Wording comes from
  `customerProfileComplete` captured when the page opens. First time: "Complete your customer profile", today's intro,
  "Save and continue". Editing: "Edit your details", "Keep your name, mobile and address up to date.", "Cancel" (back) and
  "Save changes". The mobile input is `type="tel"` (phone keypad only; no browser validation).

**Behaviour**
- Unchanged: `/me` data, the `POST /me/customer-profile` call, body, validation message ("Please enter your name and
  mobile."), `refresh()`, every `/provider` link, approval logic.
- **Exception approved by the owner (this task only):** after a successful save **while editing**, the form goes to
  `/account` (`replace`, with `state: { detailsUpdated: true }`), and Account shows a green "Your details were updated."
  bar. Account then clears that history state so a reload doesn't show it again. First-time completion still goes to `/home`.

**Files touched:** `src/pages/Account.tsx`, `src/pages/CustomerProfile.tsx`; new `src/components/AccountParts.tsx` (icons,
info row, ID pill with Copy, provider steps, `formatMobile`; display only); `src/index.css` (new `ac-` block; old `acct-`
rules left, unused).

`npm run build` still stops only on the 3 known TypeScript errors in `MyWork.tsx` / `ProviderRequests.tsx`. `vite build`
succeeds. Not checked in the browser: the local API returned 500 on login (health 503) during this session.

## 2026-10-30 — Provider theme + frame (design/HANDOFF-provider.md, Part I)

**What changed visually** (provider side only; the customer side is unchanged)
- **Welcome band** when "As a provider" is open: dark navy (`#0B2038`) with a 4 px yellow top line, "Welcome back, {first
  name}." + yellow PROVIDER badge, and "Win local work, run every job, get paid. · {PAS ID}" (from `user.providerRef`).
  No Mate Points pill, as before. The customer band's JSX is unchanged.
- **Role switch**: the underline is yellow on the provider side and stays navy on the customer side.
- **Provider pane** (`.fr-card.provider`): cream `#FFF8E4` with cream borders `#E9DFC0` and a 3 px yellow top border.
  This replaces the green-teal `--pane-provider` tint. The old `--pane-provider` / `.role-pane` rules are left in place
  (unused).
- **Main provider tabs**: active pill is yellow with dark-navy text; hover is deeper cream `#FFF1C7`.
- **Inside the provider pane** (all provider tabs, including Provider Profile and Jobby Mate Referrals, without editing those
  pages):
  - The app tokens are re-pointed for that pane only: `--navy`/`--navy2` → dark navy, `--amber` → yellow,
    `--line` → cream line, `--teal` → dark navy, `--mist` → cream. `--paper` stays white, so cards stay white.
  - New-style parts: ghost buttons get cream borders; navy buttons, avatars and List/Grid "on" are dark navy;
    light-blue chips and notices become deeper cream; card borders become cream. The yellow "needs action" and
    "accepted" borders stay yellow.
  - Sub-tab colours for Parts J–L are ready: active dark navy with a yellow count badge, and a yellow badge on inactive
    tabs marked `is-attention`.

**Behaviour:** none changed. Role/tab logic, remembered role and tab, the wallet call and routes are untouched.

**Files touched:** `src/pages/Home.tsx` (welcome band markup only), `src/index.css` (new "Provider theme (Part I)"
block at the end).

`npm run build` still stops only on the 3 known TypeScript errors in `MyWork.tsx` / `ProviderRequests.tsx`. `vite build`
succeeds. Not checked in the browser: the local API still returns 500 on login.

## 2026-10-30 — Requests to Me (design/HANDOFF-provider.md, Part J)

**What changed visually**
- Header: speech-bubble icon, "Requests to me", same intro. Error in the red bar; "Loading…" in the new style.
- Sub-tabs Received · Replied · Wins · Lost · Expired · Declined use the shared `SubTabs` bar (same keys, counts and
  remembered tab `provider.pipeline.tab`). Received's badge is yellow while it holds a request you can still quote on.
- Filter row like the customer side: search ("Title, suburb or customer"), Industry, Status, Sort + direction. These are
  the same `useListView` filters, sorts and per-tab state as before; `ListControls` is no longer used on this page.
  Count line ("3 requests" / "2 of 3 requests") and Clear filters.
- **List / Grid** toggle, remembered under the new key `provider.requests.layout` (default List). Grid shows compact
  cards (one main button: "Send a quote" on quotable rows, else "View details"). Opening one shows the full card across
  the grid, with "Show less", using the list's existing expanded state.
- **Request card**:
  - Left: customer initials, job title, industry chip, suburb, Quote Request ID pill. On Received, a "Closes in n days"
    chip, or a red "Closes today" chip, worked out from `expiresAt` already on the row, by calendar day.
  - Under that: customer name · requested date · time frame · "also sent to n other provider(s)" (from `targetCount`).
    The description is cut to two lines with "Show more".
  - Right side:
    - Received: Decline and Send a quote.
    - Replied / Wins / Lost: "Customer pays $x" / "You get $y" / quoted date, with the same ✓ tags.
    - Expired / Declined: a grey tag.
  - Quotable Received rows have the yellow border. The decline note on Declined rows stays.
- **Send Quote form** (opens under the card as before):
  - Line items are a table: description, $ amount, a +GST / GST-free toggle (sets the same `gstApplicable` as the old
    dropdown), live "Customer sees", and × to remove. On phones each line stacks into a small card.
  - Payment is a Full payment / Staged (milestones) switch; it calls `edited()` only when the value changes, like the old
    `<select>`. The stages editor gets % fields and the same completion line.
  - The Preview breakdown card keeps the same rows, order and expressions, with "You get paid" and "Customer pays"
    emphasised.
  - Buttons: Cancel · Save · Preview · Send Quote. Only the label case changed ("Send quote" → "Send Quote").
- **Decline**: the inline panel is now the in-app dialog (new `DeclineDialog`, `dlg-` styles with a yellow top line). Same
  title, text, required message and "Back — don't decline" / "Confirm Decline". Confirm stays disabled until a message is
  typed. Escape or a backdrop click is the same as Back.
- Empty states: same text per tab in the new style; Received still offers "My provider profile" (→ `/provider`).

**Behaviour:** unchanged. The file's logic (lines 26–353 now: state, `openQuote`, `saveDraft`, `cancelQuote`,
`openDecline` / `cancelDecline` / `confirmDecline`, `edited`, line and stage helpers, `customerSees`, `doPreview`,
`submitQuote`, `emptyCopy`) is byte-for-byte as before. Only imports and the returned markup changed. The known
`gstApplicable` error is still there (now line 37, because of the new imports).

**Files touched:** `src/pages/ProviderRequests.tsx`; new `src/components/RequestCards.tsx` (speech-bubble icon, closes
chip, grid card, decline dialog; display only); `src/index.css` (new `pr-` / `pq-` block).

**BACKEND-REQUESTS.md:** "draft saved" / "Continue quote" on cards.

`npm run build` still stops only on the 3 known TypeScript errors. `vite build` succeeds. Not checked in the browser: the
local API still returns 500 on login.

## 2026-10-31 — Your Quotes (design/HANDOFF-provider.md, Part K)

**What changed visually**
- Header: document-tick icon, "Your quotes", same intro. "See requests" is now the header's yellow button.
- Sub-tabs Accepted · Action needed · Declined use the shared `SubTabs` bar (same keys, counts and remembered tab
  `provider.quotes.tab`). Action needed's badge is yellow when it has rows, as the old `due` style was. Accepted's badge
  is now yellow too when an accepted quote needs action (`needsAction`).
- Accepted: filter row like the customer side (search, Quote status, Payment, Work state, Sort + direction). It is the
  same `useListView('provider.quotes')` state as before; `ListControls` is no longer used here. Count line and
  Clear filters.
- **List / Grid** toggle on every sub-tab, remembered under the new key `provider.quotes.layout` (default List).
- **Quote card** (Accepted):
  - Header: job title, status chip ("Accepted"), Full / Staged payment chip, Quote Request ID, and customer initials +
    name. The name comes from the pipeline rows the page already loads, matched by `jobId`; no new call.
  - "Sent {date}". For full payment, the settlement button sits on the card.
  - Cards that need action get the yellow border and a reason line, worked out from the settlement state already on the
    quote: "Mark {stage} complete" / "Mark the job complete" / "Submit your review to release {stage or quote
    providerPayable}".
  - Three figures: Customer pays (`customerTotal`), Commission (`commission`, ex-GST, as the quote holds it), You get paid
    (`providerPayable`). Formatting only.
  - Staged quotes: a stage timeline (dot per stage: grey to do / navy-outline awaiting payment / yellow review / navy
    paid), name and %, customer total and "you get", and the existing per-stage action or settlement label.
  - "View details" / "Hide details" uses the same expanded state as the old View/Hide. It shows line items, message, and
    the points-earned / rates line.
- **Grid**: compact cards (customer pays / you get, reason line). The main button reads "Review & get paid" (opens the
  card and the review form, same `openReview`), "Open to mark complete" (opens the card), or "View details". Mark
  complete itself is only on the full card.
- **Post-job review**: same four fields and submit/cancel. Difficulty and cooperation are 1–5 button rows that set the
  same numbers as the old dropdowns (default 3). The form shows inside its quote's card when that card is on screen,
  otherwise at the top of the page as before (e.g. arriving from Your Work's link while filters hide the card).
- Action needed / Declined rows use the Part J request-card style. "Send a quote" still goes to `/home/requests`, and
  the decline note is unchanged. In Grid they show as compact cards that open in place. The open/closed state for those
  rows is local, display only.
- Empty states: same text in the new style.

**Behaviour:** unchanged. `needsAction`, the filters/sorts, `load`, the pipeline call, the `?review=` effect,
`complete`, `openReview`, `submitReview` and `unitAction`'s conditions are as before. Inside `unitAction`, only the three
elements' class names changed (Mark complete navy, Review & get paid yellow, status label as a grey pill).

**Files touched:** `src/pages/MyQuotes.tsx`; new `src/components/QuoteCards.tsx` (icon, figures, payment chip, stage
timeline, reason line, grid card, review form; display only); `src/components/RequestCards.tsx` (grid card's main button
is now optional, for Declined rows); `src/index.css` (new `pk-` block).

`npm run build` still stops only on the 3 known TypeScript errors. `vite build` succeeds. Not checked in the browser: the
local API still returns 500 on login.

## 2026-10-31 — Your Work (design/HANDOFF-provider.md, Part L)

**What changed visually**
- Header: toolbox icon, "Your work", same intro. "See requests" is the header's yellow button. Errors are in the red bar.
- Sub-tabs Open · In Progress · Completed use the shared `SubTabs` bar (same `classified` grouping, counts and
  remembered tab `work.tab`). A badge is yellow when a job in that sub-tab needs the provider. That means: ready to start,
  progress at 100% but not marked complete, or paid and awaiting the review. Same conditions as the old status line.
- **New display option:** a search / Industry / Sort row and a List / Grid toggle, over the jobs already loaded for the
  open sub-tab. It uses `useListView('provider.work.{tab}')`, and `provider.work.layout` defaults to List. The default
  sort is "Date requested", newest first; before, the order was whatever `/jobs/assigned` returned.
- **Job card**:
  - Header: title, status chip, industry chip, suburb, time frame, this provider's Quote Request ID, customer initials +
    name, requested date, and the job address (`job.jobAddress`, already on the job).
  - "Start work" / "Update progress" / "Post progress" are now at the top right, with the same conditions and handlers.
  - The old footer status text is a state line under the header, same wording, yellow when it needs the provider.
  - Description cut to two lines with "Show more".
  - **Progress** section: the same `ProgressBar` (provider colours: navy fill on cream, yellow at 100%), then "Progress
    history (n)" as a small table.
  - **Update progress** panel: same fields (percentage, note), validation and Post update / Cancel. Adds the help line
    "Add photos to an update after posting it — they attach to your latest update below." This is how it already works:
    PROGRESS photos need the posted entry's id.
  - Photos: the same two `ImageUploader`s (latest update, completion) with the same conditions.
  - **Completion** section: the same Mark complete / Mark job complete / settlement-label logic and the "Review & get
    paid" link (`reviewLink`).
  - Customer rating: same, restyled.
- **Grid**: the customer side's `JobCompactCard` (customer name in place of the provider, progress bar). The main button
  is "Review & get paid" (same `reviewLink` navigation), "Open to start", "Open to mark complete", "Update / Post
  progress" (opens the card and the same `openProgress`), or "View details". Start work and Mark complete themselves
  are only on the full card.

**Behaviour:** unchanged. Lines 1–219 (loading, `markComplete`, `action('start')`, `openProgress`, `postProgress`,
`classified`, `emptyCopy`) are as before apart from imports. In the markup, every condition and handler call is the same
expression. The two known errors are on the same, untouched `markComplete(myQuote.id, …)` calls, now at lines 596 and
610. `statusLabel` was dropped from the imports because the status chip replaced it.

**Not built:** the customer's request photos on the job card (see BACKEND-REQUESTS.md). Showing them would add a
`GET /jobs/{id}/images?kind=REQUEST` call per job, which this page doesn't make today.

**Files touched:** `src/pages/MyWork.tsx`; new `src/components/WorkParts.tsx` (icon, state line, section; display only);
`src/index.css` (new `pw-` block + provider progress-bar colours).

`npm run build` still stops only on the 3 known TypeScript errors. `vite build` succeeds. Not checked in the browser: the
local API still returns 500 on login.
