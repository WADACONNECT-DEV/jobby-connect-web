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
