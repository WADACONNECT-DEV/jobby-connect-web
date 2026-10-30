# Provider area — theme + Requests to Me, Your Quotes, Your Work (Parts I–L)

Reference picture: `provider-v1/provider-mockup.png` (names, IDs and
numbers in it are examples). Colours from the Providers landing page
(`design/providers-v3/`). Same patterns as the finished customer side —
header row, segmented sub-tabs, filter row, List/Grid toggle, cards,
selection/notice bars, empty states — **re-coloured for providers**.

Every customer becomes a provider from the same account, so the dashboard
must make it obvious which side you are on: **customer = light blue / navy;
provider = dark navy / yellow / cream**.

Build in this order, one Part per step; the owner checks and commits each:
**I** theme + frame · **J** Requests to Me · **K** Your Quotes · **L** Your
Work. Not in scope: **Provider Profile** (owner sends a separate brief
later — it only picks up the theme colours from Part I). **Jobby Mate
Referrals**: no layout change; it only picks up the provider colours when
opened from the provider side (it's the same page as the customer tab).

---

## Part I — provider theme and frame (`Home.tsx`, `index.css`)

Provider tokens (define once, scoped to the provider side, e.g. on
`.role-pane.provider` and the welcome band when the provider role is
active, so **every** provider tab — including Provider Profile and
Referrals — inherits them without editing those pages):

| Token | Value | Use |
|---|---|---|
| dark navy | `#0B2038` | welcome band, active sub-tab, avatars |
| yellow | `#F7C21B` | 4 px line on top of the band, active main tab, primary buttons, highlights |
| cream | `#FFF8E4` | provider pane background |
| cream line | `#E9DFC0` | borders inside the pane |
| deeper cream | `#FFF1C7` | "closes soon" / notice chips |

- **Welcome band**, provider side: dark navy, 4 px yellow top line,
  "Welcome back, {first name}." + yellow **PROVIDER** badge, sub-line
  "Win local work, run every job, get paid. · {PAS ID}" (PAS from the
  user already loaded). No Mate Points pill on this side (as today).
  Customer side stays exactly as it is now.
- **Role switch** "As a customer | As a provider": underline yellow when
  provider is active, navy when customer is active.
- **Provider pane**: cream background, 3 px yellow top border, cream
  borders. Replace today's green/teal provider tint (`--pane-provider`,
  teal borders) with these.
- **Main provider tabs**: same pill shape as the customer tabs, but the
  active pill is **yellow with dark-navy text**.
- **Sub-tabs** (Parts J–L): same size/spacing as the customer sub-tabs;
  active = **dark navy with white text**, count badge yellow; a badge goes
  yellow on inactive tabs too when something needs the provider's action.
- **Cards** stay white on the cream pane; primary buttons yellow; secondary
  buttons white with a cream border; links navy.
- Check that switching roles changes all colours at once and that nothing
  on the customer side changed.

## Part J — Requests to Me (`ProviderRequests.tsx`)

- Header: speech-bubble icon, "Requests to me", today's intro line.
- Sub-tabs **Received · Replied · Wins · Lost · Expired · Declined**
  (same keys, counts, remembered tab).
- Filter row (Mates style): search, industry, status, sort (existing
  filters/sorts) + **List / Grid** toggle (remembered, default List).
- **Request card** (list): customer initials avatar · job title · industry
  chip · suburb · Quote Request ID pill · "Closes in n days" chip (from the
  closing date already on the row; red "Closes today" when due) · customer
  name, requested date, "also sent to n other provider(s)" if the row says
  so, "draft saved" if a draft exists · right side: quote amount when
  replied/won/lost · actions as today (**Decline** and **Send a quote** /
  **Continue quote** on Received). Requests needing action get the yellow
  border. **Grid**: compact cards like the customer grid, one main button.
- **Send Quote form** (opens as today): restyle only. Keep the button set
  **Cancel · Save · Preview · Send Quote** exactly as UAT Round 3 fixed it:
  Save = draft only; Send stays disabled until Preview has run after the
  last edit; Cancel warns before discarding edits and never touches the
  request. Lay out: line items as a clean table (description, amount,
  +GST toggle per line, remove), "+ Add line", bonus points, payment type
  Full / Staged with the stages editor, provider message; the live
  "Customer sees" figure per line; the Preview as a breakdown card
  (subtotal, GST, commission, points, customer pays, **you get paid**).
  Figures exactly as the app calculates — formatting only.
- **Decline flow**: same rules (confirm → required message → Confirm
  Decline disabled until a message is typed → only Confirm declines),
  shown in the in-app styled dialog, provider colours.
- Empty states per sub-tab, same text, Mates style ("My provider profile"
  button as today).

## Part K — Your Quotes (`MyQuotes.tsx`)

- Header: document-tick icon, "Your quotes", today's intro.
- Sub-tabs **Accepted · Action needed · Declined** (same rules/counts);
  filters (quote status, payment type, work state, sort) + List / Grid.
- **Quote card**: job title · status chip · Quote Request ID · customer
  initials + name · three figures side by side — **Customer pays**,
  **Commission**, **You get paid** (as today's values) · payment type
  chip (Full / Staged) · for staged quotes a small stage timeline (each
  stage: name, %, amount, state: Not started → Marked complete → Awaiting
  payment → **Review & get paid** → Paid) · actions exactly as today
  (**Mark complete**, **Review & get paid** with the post-job review form:
  difficulty, cooperation, hazards, notes — same fields and rules).
  "Action needed" items get the yellow border and a short reason line
  ("Mark stage 2 complete", "Submit your review to release $x").
- Money display only; nothing recalculated.

## Part L — Your Work (`MyWork.tsx`)

- Header: hard-hat / toolbox icon, "Your work", today's intro.
- Sub-tabs **Open · In Progress · Completed** (same rules/counts) +
  filters + List / Grid.
- **Job card**: job title · status chip · customer initials + name ·
  suburb · job address · Quote Request ID · **Start job** (same rules) ·
  progress bar (provider colours) + "Update progress" panel (percent,
  note, photos via the existing `ImageUploader`) · "Progress history (n)"
  · **Mark complete** where it shows today · customer's request photos.
- Keep every current action, condition and message.

## Known issues — do not "fix"
`npm run build` already stops on 3 TypeScript errors in `MyWork.tsx` and
`ProviderRequests.tsx` (quote/GST code). Restyling those files must not
change that code; leave the errors for the developer (already logged).
Don't let the restyle add any new ones.

## Must not change
Every API call and when it runs (requests, drafts, preview, send quote,
decline, quotes, settlement complete/review, start, progress, images); the
sub-tab grouping rules; validation and all messages; money figures
(format only); routes.

## Done when (each Part)
- Log in as **test-plumbing@example.com / Test#Provider1** (approved
  provider; also a customer):
  - **I**: switching As a customer ↔ As a provider changes the whole frame
    between the two colour schemes; customer side unchanged; Provider
    Profile and Referrals pick up the cream/yellow colours.
  - **J**: as a customer (another window, cust-0001@example.com /
    Test#Customer1) send this provider a request → it appears under
    Received with the yellow border → Save a draft → Preview → Send Quote
    (disabled until Preview) → it moves to Replied. Decline another one
    with a message → Declined.
  - **K**: customer accepts → Accepted / Action needed; Mark complete →
    customer pays → **Review & get paid** → Paid; staged quotes show their
    stages.
  - **L**: Start job, update progress with a photo, history, Mark complete.
- 375 px for each; `npm run build`: no new errors.
