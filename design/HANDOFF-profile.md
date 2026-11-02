# Provider Profile — editor + public page, Basic and Premium (Parts M–O)

Pictures (examples only — names, photos, figures are samples):
- `profile-v1/profile-editor.png` — the provider's **Provider Profile** tab
  (editor), provider colours.
- `profile-v1/profile-basic.png` — the **public page** customers see, Basic.
- `profile-v1/profile-premium.png` — the public page, **Premium** (with
  images), modelled on the owner's I PRIME sample.

Same style as the finished screens. Files: `src/pages/ProviderProfile.tsx`
(editor), `src/pages/ProviderView.tsx` (public page), + display-only
components, CSS.

Order: **M** editor (fixes the 22-page scroll) · **N** public page, Basic ·
**O** Premium — design only on screen for now (see below). Owner checks and
commits each.

---

## Part M — the editor (`ProviderProfile.tsx`)

Today everything is one form ~22 screens long: all 120 industries as chips
and every suburb in the state (~3,000) as chips. Turn it into **one form
with five sections** and a left section menu (on phones: a dropdown /
sideways strip at the top). It is still **one form and one Save** — the
sections only change what's on screen; the save call and what it sends stay
exactly as today.

Header: "Your provider profile", "What customers see, and where and what you
work on.", right: **Preview public page** (today's preview action).

Left menu, each with a small status: ✓ complete / count / "PREMIUM":
1. **Business details** — Business name, ABN, Subscription plan (as today),
   "My business is registered for GST", Promotional Mate Points (+ today's
   help text).
2. **Services** — search box "Find an industry"; your selected industries
   as removable chips at the top; below, the industries **grouped by the 13
   groups**, collapsed by default, each group showing how many you've
   picked. For each selected industry, its subcategories as tick-chips with
   "Select all / none". Summary line as today ("4 subcategories across 7
   industries").
   (Group names: the app doesn't receive them yet — if the industries list
   has no group, show one flat A–Z list with the search box instead, and log
   it.)
3. **Service area** — "ADD SUBURBS" with the existing `SuburbPicker`
   (type-ahead; shows suburb, state, postcode); picked suburbs as removable
   chips with a count and "Clear all"; state filter if useful. **No list of
   every suburb.** Then "Area description (shown on your page)" (today's
   service area text, required as today).
4. **Public page** — Theme as three visual swatch cards (Classic navy,
   Coastal teal, Slate grey) with a mini preview; Short description (bio,
   with "n / 1000"); About Us (with "n / 4000"); Contact phone, Contact email,
   Opening hours. Today's "Your public page…" explainer.
5. **Photos & highlights — PREMIUM** — shows what Premium adds (logo, hero
   photo, service photos and descriptions, gallery, highlights) as a locked
   preview with a "PREMIUM" badge and "Coming soon". No inputs that save
   anything.

Right column (desktop): **live mini preview** of the public-page header
(business name, industry, suburbs) and a **Profile checklist** (business
name & ABN, industries & services, service area, About Us, opening hours)
— computed from the form, display only.

Bottom: sticky save bar "Unsaved changes" + **Discard** (reset the form to
the loaded profile, no call) and yellow **Save changes** (today's save).
Success / error bars as elsewhere. Required-field errors jump to their
section.

## Part N — public page, Basic (`ProviderView.tsx`)

Layout as `profile-basic.png`, using only what the page receives today:
- Header band in the provider's **theme** colour (Classic navy / Coastal
  teal / Slate) with a 4 px yellow line: initials circle, business name,
  "{industries} · {first 3 suburbs} +n suburbs", stars + "4.3 (100 reviews)".
- Tabs Home · About Us · Services · Contact Us (same as today).
- **Home**: bio as a lead paragraph; "WHAT WE DO" subcategory chips; Recent
  reviews (name shown as first name + initial, stars, date · job, comment).
  Right column: rating box (stars + **% rating** = average ÷ 5, display
  only), "Where we work" chips (+n), "Get in touch" (phone, email, hours —
  each only if filled).
- **About Us**: about text; "Where we work" chips.
- **Services**: industries as headings with their subcategory chips.
- **Contact Us**: the contact rows + today's "surest way…" line.
- Bottom bar: "Want this provider? Your request goes only to them." +
  **Save as Mate** and **Request a quote** (same actions as today).
- Empty pieces are hidden, not shown blank. 375 px: one column.

## Part O — Premium (design now, build when the data exists)

Premium (`profile-premium.png`) needs data the app does not store yet. The
screen part can only be built after the developer adds it, so for now:
**log everything below in BACKEND-REQUESTS.md** (one "Premium provider
profile" entry) and change no screens for Premium.

Premium shows, on top of Basic:
- **Logo** (square) instead of initials; **PREMIUM** badge.
- **Hero**: headline + intro, 6 key services with icons, Request a quote /
  Save as Mate, large **hero photo**.
- **Highlights strip**: up to 4 (icon, title, sub-line), e.g. "11+ years in
  business".
- **Our services** as cards: photo, name, short description; tapping one
  starts a quote request for it. (Functional Spec §3.2: "Unlimited service
  listings, each with a short description and an optional image".)
- **About Us**: up to 5 sub-sections (Spec §3.2: "Our History, Our Team,
  Our Area of Coverage…") + a photo gallery.
- **Contact Us**: website link and the service area on a map.
- **Verified provider** badge (needs the verification module — not built).

Developer needs to provide:
1. Plan entitlement: a **Premium** subscription plan with a "premium
   profile" flag (the `subscription_plan` table already exists; open item
   7.3 — tiers and price are the owner's decision).
2. Profile media storage + upload endpoints (logo, hero, gallery, service
   photos) with plan-based limits (plans already carry image limits).
3. New profile fields: headline, highlights[], website, video link
   (optional), About sub-sections[], service listings[] (title,
   description, photo, linked subcategory).
4. All of it returned on `GET /providers/{id}` and saved via the profile
   save, only when the plan allows.
5. Map: suburb coordinates (same need as the distance filter).
6. Editor: the "Photos & highlights" section becomes live.

## Also log (BACKEND-REQUESTS.md)
- Industries list without **group names** (if that's the case) — return
  `group` with each industry so the editor can group the 120.
- Service area quick-adds: "All suburbs in {council}" needs `lga` on the
  suburbs list (the database already has it, V33); "within n km" needs
  suburb coordinates.
- **Careers page** (Functional Spec §3.2: form with name, email, mobile,
  résumé upload) is still not built — owner to decide if it's wanted.

## Must not change
`GET/PUT /provider/profile` calls and what they send; required fields and
validation messages; the preview action; Save as Mate and Request a quote on
the public page; `GET /providers/{id}`.

## Done when
- **M**: as test-plumbing@example.com / Test#Provider1 → Provider Profile:
  the page fits on about 1–2 screens per section; add an industry by
  searching, tick subcategories, add 2 suburbs by typing and remove one,
  change the theme and About text → Save → reload: all kept. Discard
  restores. Empty business name → the same error, menu jumps to Business
  details. Preview opens the public page.
- **N**: as a customer, open that provider from Find or Mates: all four
  tabs in the new style and in the chosen theme colour; Save as Mate and
  Request a quote work; 375 px.
- **O**: BACKEND-REQUESTS.md has the Premium entry.
- `npm run build`: no new errors.
