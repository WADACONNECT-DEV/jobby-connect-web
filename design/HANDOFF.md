# Landing pages — design hand-off (Version 3)

Source: owner's design canvas "Jobby-Connect Landing Hero", artboards
`V3.dc.html` (Customers) and `Providers.dc.html` (Providers), 30 Oct 2026.

| Page | Design file | App address |
|---|---|---|
| Customers | `customers-v3/Customers.dc.html` | `/` (replaces the current Landing page) |
| Providers | `providers-v3/Providers.dc.html` | `/for-providers` (new) |

Each folder is a standalone mockup: open it with a local web server to see it
move (`python -m http.server`, then the `.dc.html` file). Treat it as a
REFERENCE: replicate the exact colours, fonts, sizes, spacing, radii, shadows
and layout in the app's own React + CSS, don't copy the mockup runtime
(`support.js`, `vendor/`).

## Owner decisions
- Two themes. Customers: white nav, light-blue hero `#EAF4FC`, navy `#0F2A4A`,
  yellow `#F7C21B`, blue cards `#F1F7FC`, navy CTA band. Providers: dark nav
  `#0B2038` with yellow top line and PROVIDERS badge, navy hero, cream
  `#FFF8E4` sections, yellow CTA band. Landing pages only for now; the
  logged-in app keeps its current colours.
- Nav: "How it works" and "For customers" scroll within the Customers page.
  "For providers" opens the Providers page. The pill switch
  "For customers | For providers" appears on both.
- Hero box on both pages: 9-slide slideshow (summary, 4 detail cards,
  4 photos), progress bar, prev / pause / next, caption "n of 9 · label",
  first slide holds 2 s longer, 5 s per slide, auto-play, no motion when the
  visitor prefers reduced motion.
- Fonts: Inter (body) and Inter Tight (headings); JetBrains Mono for the
  sample Quote ID on the Customers page.

## Wording changes to make while building
- Providers page: "About, Services and Careers pages" →
  "Home, About Us, Services and Contact Us pages" (what the app actually has).
- "Up to 3" providers / quotes (Customers page, slide 2 and card 02): keep
  "3" — matches the current request form. OWNER TO CONFIRM; spec says 4.
- The suburb / industry search boxes in the slideshow and card 01 are
  pictures of the feature, not working fields: not typeable, not focusable;
  clicking the card goes to /register.

## Links
- Create a free account, Start as a provider → `/register`
- Log in, Provider log in → `/login`
- For providers, See what providers get, I'm a provider → `/for-providers`
- For customers, I'm a customer → `/`
- How it works, See how it works, See what you get → scroll to that section

## Exceptions to CLAUDE.md approved by the owner (this task only)
1. `App.tsx`: add the `/for-providers` route for logged-out visitors, and
   render both landing pages without the standard site header and footer
   (they have their own). Logged-in users still go to /home as today.
2. `index.html`: add the Google Fonts link for the three fonts.
3. `public/landing/`: the 8 photos from the two `assets` folders.
Log each one in CHANGES-FOR-DEVELOPER.md.

## Done when
- Both pages match the designs at 1280 px wide and work at 375 px with no
  sideways scrolling.
- Slideshow: auto-plays, pause/prev/next and the progress segments work,
  keyboard reachable, stops for reduced motion.
- Every link above goes where listed.
- `npm run build` passes; no other page changed.
