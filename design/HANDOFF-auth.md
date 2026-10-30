# Log in and Create account pages — design hand-off

References (pictures, not source): `auth-v1/login-mockup.png`,
`auth-v1/register-mockup.png`. Match the look of the Version 3 landing pages:
reuse the landing fonts (Inter / Inter Tight), colours (navy `#0F2A4A`,
yellow `#F7C21B`, light-blue page `#EAF4FC`) and the `lp-` CSS from the
Customers page wherever possible. Values in the mockups are approximate;
where they differ from the landing pages, follow the landing pages.

| Page | File | Address |
|---|---|---|
| Log in | `src/pages/Login.tsx` | `/login` |
| Create account | `src/pages/Register.tsx` | `/register` |

## Layout (both pages)
- Slim white top bar: "J" logo + JOBBY-CONNECT (links to `/`), and
  "← Back to home" on the right (links to `/`).
- One large rounded card on a light-blue page. Left half: navy panel with
  headline, sub-text and three icon steps, photo underneath. Right half:
  white form. Footer: "© Jobby-Connect 2026".
- At 375 px: hide the photo, keep a short navy band with the headline above
  the form, form full width. No sideways scrolling.
- Photos: `auth-v1/assets/login-photo.jpg` and `register-photo.jpg`, copied
  into `public/landing/` as `auth-login.jpg` and `auth-register.jpg`.
  PROVISIONAL (cut from the mockups); the owner may supply originals.
  The login photo has a curved navy edge above it in the design: draw that
  curve in CSS/SVG, don't rely on the photo.

## Log in
- Left: yellow rule, "Good to see you **again.**" (again in yellow),
  "Your jobs, your trusted mates and your rewards — all in one place.",
  icons: Manage jobs · Stay connected · Mate Points.
- Right: eyebrow "YOUR JOBBY-CONNECT ACCOUNT", "Welcome back",
  "Log in to continue.", Email address (envelope icon), Password (lock icon,
  show/hide eye button), yellow "Log in →", divider "New to Jobby-Connect?
  Create a free account" (→ `/register`), info box "One login for customers
  and service providers."
- **"Forgot password?"** → `/forgot-password` (new). See "Screens built
  now, connected by the developer" below.

## Create account
- Left: "One account. **More possibilities.**" (second line yellow),
  "Find local help today. Build your service business when you're ready.",
  steps 1 Create account → 2 Complete profile → 3 Get started.
- Right: eyebrow "JOIN JOBBY-CONNECT", "Create your free account",
  "A few details and you're ready to begin.", Full name, Email address,
  Mobile number (placeholder "04xx xxx xxx"), Password (show/hide eye; hint
  "At least 8 characters"), the sentence "By creating an account, you agree
  to our Terms and Privacy Policy." (links → `/terms`, `/privacy`), yellow
  "Create account →", "Already have an account? Log in" (→ `/login`),
  info box "Offering services? Set up your provider profile after joining."
- Footer on both pages: "© Jobby-Connect 2026 | Privacy | Terms".

## Screens built now, connected by the developer (owner decision)
Build these as finished screens. Until the developer connects them, each
shows a small amber notice at the top: "Preview — not connected yet". Mark
each place with a `// TODO(developer):` comment, list every one in
CHANGES-FOR-DEVELOPER.md under a heading **"Do not release until
connected"**, and add the matching entry to BACKEND-REQUESTS.md.

1. **Mobile number at sign-up.** Show the field; light format hint only
   (Australian mobile, 10 digits starting 04). The `register()` call stays
   exactly as it is, so the number is NOT sent yet.
   BACKEND-REQUESTS: add optional `mobile` to `POST /auth/register`
   (`RegisterRequest`), same format and uniqueness rules as the customer
   profile step, saved to `app_user.mobile` (unverified); then the
   "Complete profile" step can skip mobile when it's already filled.
2. **Forgot password** — `/forgot-password`: email field, "Send reset link"
   button, then a "Check your email" confirmation screen.
   **Reset password** — `/reset-password?token=…`: new password + confirm
   (show/hide), "At least 8 characters", "Set new password", then
   "Password updated — Log in".
   Until connected, the buttons don't call anything; they show the
   confirmation screen with the "not connected yet" notice.
   BACKEND-REQUESTS: `POST /auth/forgot-password {email}` → always replies
   OK (never reveals whether an account exists), emails a single-use link
   valid ~1 hour; `POST /auth/reset-password {token, newPassword}` →
   min 8 characters, ends the token, signs out other sessions.
3. **Terms** — `/terms` and **Privacy Policy** — `/privacy`: simple
   readable pages in the landing style (top bar, light-blue page, white
   card, headings). Content is a clear placeholder: "[Terms of Use — to be
   supplied by Jobby-Connect]" / "[Privacy Policy — to be supplied by
   Jobby-Connect]". No invented legal text. BACKEND-REQUESTS: none; the
   OWNER supplies the wording.

## Must not change (CLAUDE.md)
What the forms do: same fields sent, same `login()` / `register()` calls,
same validation and error messages shown, same redirect to /home after
success, same "already logged in → /home" behaviour. Show/hide password is
display only.

## Exception approved by the owner (this task only)
`App.tsx`: render `/login` and `/register` without the standard site header
and footer (like `/` and `/for-providers`), and add four public routes in the
same style: `/forgot-password`, `/reset-password`, `/terms`, `/privacy`.
No other route changes. Log it.

## Done when
- Both pages match the mockups' look at 1280 px and work at 375 px.
- Log in and sign up still work end to end (test with
  cust-0001@example.com / Test#Customer1, and a brand-new email).
- Wrong password still shows the error message.
- Forgot password, Reset password, Terms and Privacy pages open from their
  links, look like the rest, and show the "not connected yet" notice.
- `npm run build`: no new errors (the 3 existing ones in MyWork /
  ProviderRequests are known).
