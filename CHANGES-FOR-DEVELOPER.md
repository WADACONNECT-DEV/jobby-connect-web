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
