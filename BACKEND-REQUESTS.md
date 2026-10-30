# Backend requests

Things a screen needs that the website can't do on its own. Each entry: screen,
what the user needs, what the API would have to provide, and why.

## 2026-10-30 — Mobile number at sign-up

- **Screen:** Create account (`/register`, `src/pages/Register.tsx`)
- **User need:** give a mobile number when signing up, so they don't have to enter it again
  at the "Complete profile" step.
- **API needed:** add an optional `mobile` to `POST /auth/register` (`RegisterRequest`), with the
  same format and uniqueness rules as the customer profile step. Save it to `app_user.mobile` as
  unverified. Then the "Complete profile" step can skip mobile when it's already filled.
- **Why:** the field is on the screen now but is not sent. `register()` still takes
  (fullName, email, password). Marked `TODO(developer)` in `Register.tsx`.

## 2026-10-30 — Forgot password / Reset password

- **Screens:** `/forgot-password` (`src/pages/ForgotPassword.tsx`) and
  `/reset-password?token=…` (`src/pages/ResetPassword.tsx`)
- **User need:** get back into an account after forgetting the password.
- **API needed:**
  - `POST /auth/forgot-password { email }`: always replies OK (never reveals whether an account
    exists). Emails a single-use link to `/reset-password?token=…`, valid about 1 hour.
  - `POST /auth/reset-password { token, newPassword }`: minimum 8 characters. Ends the token and
    signs out other sessions.
- **Website side once connected:** call these from the two screens. On the reset screen, add the
  "at least 8 characters" and "passwords match" checks and an expired/used-link message. Remove
  the Preview notices. These checks were left out on purpose, because validation rules belong to
  the developer.
- **Why:** both screens are finished but call nothing yet; they only show their confirmation step.

## Terms and Privacy Policy

No API needed. The owner supplies the wording for `/terms` and `/privacy`.

## 2026-10-30 — Your Jobby Mates: mockup items not built (no data yet)

- **Screen:** customer dashboard → Your Jobby Mates (`src/pages/Mates.tsx`), mockup `design/mates-v1/mates-mockup.png`.
- **User need / API needed**, each left off the screen until the data exists:

| Mockup item | Needed from the API |
|---|---|
| One-line description ("Catering for family occasions…") | provider `bio` on `GET /mates` |
| Service tags ("Private events") and the SERVICE dropdown | the provider's subcategory names on `GET /mates` |
| Distance "Within 25 km" | provider and customer locations (suburb coordinates) and a distance filter |
| "Offering bonus points" filter | provider `promoPoints` on `GET /mates` (it already exists on search results) |
| "Replies within a day" filter | a provider response-time measure |
| Industry icon next to the industry chip | optional: industry group on `GET /mates`; until then, no icon |

## 2026-10-30 — Provider cap mismatch (affects Mates and Find)

- **Screens:** Your Jobby Mates and Find & Request Quotes → "Continue with n" → New request.
- **Problem:** the website lets a customer select up to the admin setting `maxProvidersPerRequest`
  (default 4, `src/platform.ts:18`), but `POST /jobs` only accepts up to 3 providers
  (`CreateJobRequest.java:25`, `@NotEmpty @Size(min = 1, max = 3) List<UUID> providerIds`).
  A 4th selection fails when the request is sent.
- **API needed:** the `POST /jobs` limit should read the same admin setting instead of a fixed 3.
