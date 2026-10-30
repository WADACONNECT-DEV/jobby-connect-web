# Logged-in frame + Your Jobby Mates — design hand-off

Reference (picture): `mates-v1/mates-mockup.png`. Same style family as the
Version 3 landing and log-in pages: Inter / Inter Tight, navy `#0F2A4A`,
yellow `#F7C21B`, light page `#F5F8FC`, white cards, the `J` logo used on the
landing pages. Where the mockup and the landing pages differ, follow the
landing pages.

This is two jobs. Do them in this order and let the owner check each:

**Part A — the logged-in frame** (every logged-in screen): top bar, welcome
band, role switch, tab bar, footer. Files: `src/App.tsx` (Header only),
`src/pages/Home.tsx`, `src/index.css`.

**Part B — the Your Jobby Mates tab.** File: `src/pages/Mates.tsx`
(+ presentational components, CSS).

Other tabs keep their current content; they will simply sit inside the new
frame until they are redesigned.

---

## Part A — logged-in frame

- **Top bar** (white): `J` logo + JOBBY-CONNECT (→ `/home`), notification
  bell (existing `NotificationBell`, unchanged), round avatar with the
  user's initial + first name + ▾. The ▾ opens a small menu with
  "Account settings" (→ `/account`, same as today's name link) and
  "Log out" (same `logout()` then `/` as today's button).
- **Welcome band** (navy): "Welcome back, {first name}." and the line under
  it (keep today's two texts: provider-approved users get "Switch between
  requesting work and providing it.", others "Your trusted local providers,
  ready for your next job."). On the right, the Mate Points pill: coin icon,
  "Mate Points", amount in yellow — only on the customer side and only when
  the balance is loaded (exactly today's conditions; it is already fetched in
  Home.tsx, don't add a new call).
- **White card** under the band holding:
  - "As a customer | As a provider" underline tabs — still only shown to
    approved providers, same switching logic.
  - The tab bar as rounded pills, active one navy.
  - **Keep the "← Back" button** under the tab bar (UAT Round 7 §3) — style
    it as a small text link, don't remove it.
  - Keep the pending / rejected provider banners and the "Complete your
    customer profile" gate exactly as they behave now, restyled.
- **Footer**: "© Jobby-Connect 2026 · Privacy · Terms" (→ `/privacy`,
  `/terms`).
- At 375 px: tab pills scroll sideways inside their own strip (not the page),
  the welcome band stacks the points pill under the text.

## Part B — Your Jobby Mates

Header row: heart-people icon, "Your Jobby Mates", "Providers you've saved.
Request a quote without searching again.", yellow "Invite a Jobby Mate"
(→ `/home/referrals`, as now).

Search row: "SEARCH YOUR MATES" box, INDUSTRY and SUBURB dropdowns, navy
Search button. These drive the existing search / industry / suburb filters
(the button can simply apply / focus; filtering stays instant as now).

Left panel "Refine your mates": **Rating** radio (Any / 4.0 and above /
4.5 and above — a new filter on `averageRating`, rows already loaded),
"Reset" (→ existing clear). Below it the "Your saved providers — Keep your
favourites close." note.

Main column:
- **Selection bar** (yellow tint) at the top while anything is ticked:
  "{n} of {cap} providers selected | Only selected providers will receive
  your request." + "Continue with {n} →" (= today's request-from-selected).
  `{cap}` stays the admin setting from `useMaxProvidersPerRequest()` — never
  type a number.
- "{count} saved mates", Sort by (existing sorts), List / Grid toggle
  (existing, remembered).
- **Mate card**: checkbox · initials avatar (from business name) · business
  name · "Saved" heart chip · industry chips · pin + first 3 suburbs
  "+N suburbs" · clock "Last used {date}" (only if `lastJobAt`) · right side:
  ★ rating "(n reviews)" or "No reviews yet", "{n} jobs completed" ·
  buttons: "Add to request" (navy) / "✓ Selected" (yellow) toggling the same
  selection, disabled at the cap with today's tooltip · "View profile" ·
  "Remove mate" text link (same remove call).
  Selected card: yellow border and light yellow background.
- Footer strip: "Need someone new? Find more providers →" (→ `/home/find`).
- Keep the empty states ("You haven't saved any providers yet…",
  "No mates match these filters") restyled.
- At 375 px: left panel becomes a "Filters" button that opens it; cards
  stack; buttons go full width under the card.

### In the mockup but NOT built yet (the app has no data for them)
Leave these out of the screen and add each to BACKEND-REQUESTS.md:

| Mockup item | Needed from the API |
|---|---|
| One-line description ("Catering for family occasions…") | provider `bio` on `GET /mates` |
| Service tags ("Private events") and the SERVICE dropdown | provider's subcategory names on `GET /mates` |
| Distance "Within 25 km" | provider and customer locations (suburb coordinates); a distance filter |
| "Offering bonus points" | provider `promoPoints` on `GET /mates` (it already exists on search results) |
| "Replies within a day" | a provider response-time measure |
| Industry icon next to the industry chip | optional: industry group on `GET /mates`; until then no icon |

Also add to BACKEND-REQUESTS.md: **provider cap mismatch** — the website
lets a customer select up to the admin setting (default 4), but
`POST /jobs` only accepts up to 3 providers (`CreateJobRequest`
`@Size(max = 3)`), so a 4th selection fails when the request is sent. The
API limit should read the same admin setting.

## Must not change (CLAUDE.md)
The `GET /mates` and `DELETE /mates/{id}` calls, the wallet call already in
Home.tsx, `logout()`, role-switch and tab-remembering logic, the profile
gate, routes, and what "Continue" / "Request" hand to `/new-request`.
The per-card "Request a quote" button is replaced by "Add to request" +
"Continue with n" (owner decision), using the same navigation.

## Exception approved by the owner (this task only)
`src/App.tsx`: restyle the `Header` component (avatar + menu) — same links
and same log-out action. Log it.

## Done when
- Frame and Mates page match the mockup at 1280 px and work at 375 px.
- Log in as cust-0001@example.com / Test#Customer1: mates load; search,
  industry, suburb, rating filters, sort, list/grid all work and are
  remembered after Back; select 1–3 mates → Continue opens the request form
  with those providers; Remove works; Invite and Find more go to the right
  tabs; bell and account menu work; Log out works.
- Log in as a provider who is also approved (e.g. test-plumbing@example.com /
  Test#Provider1): As a customer / As a provider switch works; provider tabs
  still show and work inside the new frame.
- `npm run build`: no new errors.
