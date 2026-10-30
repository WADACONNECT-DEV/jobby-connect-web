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

## 2026-10-30 — Find & Request Quotes: industries on search results

- **Screen:** customer dashboard → Find & Request Quotes (`src/pages/Search.tsx`).
- **User need:** see what each provider does on the result card, as on Your Jobby Mates.
- **API needed:** `GET /providers/search` should return the provider's new **industries**, and ideally their subcategory names
  and suburbs list, like `GET /mates` does.
- **Why:** results only carry `categories` (the six old categories), which are empty for the 120 new industries, so the
  cards no longer show category chips. The service-area line is shown instead until this exists.

## 2026-10-30 — Mate Points ledger: job details and dates on wallet entries

- **Screen:** customer dashboard → Mate Points (`src/pages/Wallet.tsx`), ledger table.
- **User need:** the owner wants Reference, Company and Industry columns, and the job title in the description, so each
  points entry can be traced to its job.
- **API needed (owner's wording, HANDOFF-points):**

  > `GET /points/wallet` — for each history entry also return: `jobId`,
  > `jobTitle`, the **Quote Request ID** (`requestRef`), the provider's
  > **business name**, the job's **industry**, and the full timestamp in ISO
  > format. (The `points_transaction` row already holds `job_id` and
  > `quote_id`, so these can be joined.) Also: `date` is formatted in UTC, so
  > an entry made in the morning in Australia can show the previous day —
  > format in Australia/Melbourne or return ISO and let the screen format it.

- **Why:** the wallet entries don't say which job they belong to. When these fields exist, the table gains **Reference**,
  **Company** and **Industry** columns after Date, and the job title joins the description. The screen already reads ISO
  dates, so switching `date` to ISO needs no screen change.

## 2026-10-30 — HIGH PRIORITY — Mate Points transaction ID (`ref`)

- **Screen:** customer dashboard → Mate Points ledger (`src/pages/Wallet.tsx`); also the admin portal.
- **User need:** each Mate Points entry needs a permanent, unique reference that customers and support can quote.
- **API / database needed:**
  - Format: **`MPT` + zero-padded sequence**, minimum 6 digits, never truncated (same rule as CAS / PAS), e.g. `MPT000123`.
  - Issued from a **database sequence** when the entry is created; **never reused**.
  - **Backfill** existing entries in date order.
  - Return it as **`ref`** on each `GET /points/wallet` history entry, together with the job's **Quote Request ID**
    (`requestRef`) where the entry belongs to a job (see the entry above).
  - It must also be **searchable in the admin portal**.
  - Admin portal: searching an MPT number opens the entry with its customer (CAS), job and Quote Request ID, provider (PAS), payment and the related ledger lines.
- **Screen, once `ref` is returned:** the ledger shows an **ID** column first (monospace pill, like the Quote Request ID). It's
  included in the CSV and Print, and the search box also matches it.
- **Why:** entries currently have no identifier, so a customer or support can't point to one specific entry.

## 2026-10-30 — Jobby Mate Referrals: invites sent but not joined yet

- **Screen:** customer dashboard → Jobby Mate Referrals (`src/pages/JobbyMate.tsx`), "Your connections".
- **User need:** see invites they've sent that haven't been taken up yet ("Invited — waiting to join").
- **API needed:** return the customer's open invites (`ReferralInvite` with status `SENT` / `EXPIRED`) with the connections from
  `GET /me/jobby-mates` (or a sibling endpoint), with mobile (masked is fine), name / industry hint, sent date and status.
- **Why:** a connection only appears once the invited person registers, so a customer can't see or follow up an invite they sent.

## 2026-10-30 — Jobby Mate Referrals: points unit (owner to decide)

- **Screens:** Jobby Mate Referrals (shows referral rewards as "{n} pts") vs Mate Points (shows dollars, e.g. "$20.00").
- **Decision needed (owner):** one unit for referral rewards. With the spec's $-per-point rate the screen could show both,
  e.g. "20 pts · $2.00". That needs the rate (or the dollar value) returned with each connection.

## 2026-10-30 — Request quotes: industry list and photo limits

- **Screen:** Request quotes (`src/pages/NewRequest.tsx`).
- **Service industry:** the dropdown still shows the 6 old categories, because a job can only store a `ServiceCategory`.
  **API needed:** `POST /jobs` accepting an `industryId` (and returning it on the job). Then the dropdown becomes the active
  industries list. **Why:** providers are now registered under the 120 new industries.
- **Photo limits before sending:** the limits call is `GET /jobs/{id}/images/limits`, so the page can't read them until the
  job exists. **API needed:** limits readable without a job, e.g. `GET /master/image-limits` (max photos, max MB, plan).
  **Why:** the drop zone could then show "up to n photos, n MB each" and refuse oversize files before sending, instead of
  reporting failed photos after the request has gone.

## 2026-10-30 — Account: change password while logged in

- **Screen:** Account (`src/pages/Account.tsx`), Sign-in & security → "Change password" (preview panel today).
- **User need:** change their password from My Details (Functional Spec §2.9 "password reset").
- **API needed:** `POST /me/password { currentPassword, newPassword }`. It checks the current password, requires at least 8
  characters, then signs out other sessions.
- **Why:** there is no logged-in password change today; the panel's fields and Save are ready to connect to it.

## 2026-10-30 — Account: change login email (owner to confirm)

- **Screen:** Account, Sign-in & security → Email (read only today).
- **User need:** change the email they log in with.
- **API needed:** a verified change, e.g. `POST /me/email { newEmail }` that emails a confirm link to the new address, and a
  confirm endpoint that switches it.
- **Why:** the login email can't be changed today. Owner to confirm whether this is wanted.
