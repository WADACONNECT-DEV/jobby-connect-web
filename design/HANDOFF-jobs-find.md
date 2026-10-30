# Your Requests & Jobs + Find & Request Quotes — style hand-off

No new mockup. Bring both tabs into the **same look as the finished Your
Jobby Mates page** (reference: `design/mates-v1/mates-mockup.png` and the
code you built for it). Reuse its components and `index.css` classes —
mate card, filter row, selection bar, chips, buttons — rather than making
new variants. Same rules as before: screens only, behaviour unchanged.

Do one page per step and let the owner check each:
**Part C — Your Requests & Jobs** (`src/pages/MyJobs.tsx`),
**Part D — Find & Request Quotes** (`src/pages/Search.tsx`).

---

## Part C — Your Requests & Jobs

**Header row** (as Mates): clipboard icon, "Your Requests & Jobs",
one-line intro "Every request, quote and job in one place.", yellow
"New request" button (same navigation as today).

**Sub-tabs Open · In Progress · Completed · Not Proceeded**: keep the four,
their order, names, counts and the remembered selection. Style them as a
secondary segmented bar *under* the main pill tabs — smaller, white with a
navy underline / navy text for the active one and a round count badge
(yellow when the tab has something waiting for the customer, e.g. a quote
to accept or a payment due; grey otherwise — use the counts and "owing"
values the page already calculates). At 375 px the bar scrolls sideways
inside itself.

The "money owing" banner: yellow-tint bar in the Mates selection-bar style,
same text and "Open Completed" link.

**Job card** (white card, same radius/shadow/padding as the mate card):
- Top: job title (bold) · status chip (Open = blue, In Progress = navy,
  Completed = green, Not Proceeded = grey; colours differ in lightness too)
  · created date on the right.
- Meta row: industry chip · pin + suburb · Quote Request ID(s) in a small
  monospace pill (`000000012-CAS001-PAS002-001`, exactly as issued).
- Description in grey, 2 lines then "Show more" (display only).
- "Sent to" providers as small avatar-initial chips with name; declined
  ones greyed with their decline note underneath (same text as now).
- Photos you sent: existing `ImageUploader`, framed in a light card.
- Progress: existing `ProgressBar` restyled yellow on light grey, caption
  under it; "Progress history (n)" as a text link opening the same list.
- "Assigned to {provider}" with initials avatar.
- Footer: "View quotes" / "Hide quotes" (same expand), review button or the
  finished review, as today.

**Quotes panel** (inside the card when expanded): each quote as a
comparison card — provider initials + name, big total, Mate Points earned
chip ("Earn $x in Mate Points"), the line-item table in clean rows
(description / amount, then subtotal, GST, total — same figures, display
only), staged payments as a mini timeline of stages with their state and
"Pay" button, provider message in a quote bubble, and the actions on the
right: Accept / Pay / Use points / payment method select — **same buttons,
same order of steps, same calls**. Accepted quote gets the yellow border
used for a selected mate; declined quotes greyed.

**Review form**: 1–5 large stars and the button label that changes with the
stars (5★ "Great Job Mate" … 1★ "Not Up to Standard") — keep the labels
exactly; comment box; same submit.

Empty states per sub-tab: same text, in the Mates empty-state style with
the "Find providers" button.

## Part D — Find & Request Quotes

**Header row**: magnifier icon, "Find & Request Quotes", intro "Choose the
service and the suburb — you'll see providers who cover both."
(keep the meaning of today's text).

**Search row** in the Mates filter-row style: SERVICE INDUSTRY dropdown,
SUBURB (existing `SuburbPicker`), SORT BY, navy "Search" button. Keep the
hint that both are needed. Same search call, same industries list, same
sort options.

**Result card** = the mate card layout: checkbox · initials avatar ·
business name · rating "(n reviews)" or "No reviews yet" · "{n} jobs
completed" · "+$x Mate Points offered" chip when `promoPoints > 0` ·
service area line · buttons "Add to request" / "✓ Selected" (same
selection and cap as now), "View profile", and "♡ Save as Jobby Mate" /
"♥ Saved" (same save call, disabled once saved).

**Selection bar** at the top while anything is ticked — identical to the
Mates one: "{n} of {cap} providers selected | Only selected providers will
receive your request." + "Continue with {n} →" (same navigation to the
request form). `{cap}` from `useMaxProvidersPerRequest()`.

Empty / no-results / searching states in the Mates style.

### Not shown on result cards yet (no data)
Today's result cards show `categories` — the six old categories — which are
empty for the 120 new industries. Don't show category chips. Add to
BACKEND-REQUESTS.md: provider search results should return the provider's
new **industries** (and ideally subcategories and suburbs list, like
`GET /mates`) so cards can show them.

## Must not change (CLAUDE.md)
Every API call and when it runs (jobs, quotes, accept, pay, redeem points,
review, progress, images, decline info, search, save mate); the sub-tab
grouping rules ("Not Proceeded" etc.); validation; the payment test-outcome
select (keep it where it is shown today); money figures — format only.

## Done when
- Both tabs look like the Mates page at 1280 px and work at 375 px.
- Log in as cust-0001@example.com / Test#Customer1:
  - Requests & Jobs: all four sub-tabs show the right jobs and counts;
    open a completed job's quotes; staged jobs show their stages; progress
    history opens; your existing 5★/4★ reviews show.
  - Make a fresh job end to end in the app: Find (Plumbing + Pakenham) →
    tick 2 → Continue → send → (as the provider test-plumbing@example.com /
    Test#Provider1, send a quote) → back as the customer: Accept → it moves
    to In Progress; the provider completes it → Pay (try Use points) →
    Review with stars → it shows under Completed.
  - Find: search, sort, select up to the cap, Save as Jobby Mate, View
    profile all work.
- `npm run build`: no new errors.
