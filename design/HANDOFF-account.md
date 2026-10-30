# Account + Your details form (Part H)

Reference picture: `account-v1/account-mockup.png`. Same style as the
finished customer pages. Files: `src/pages/Account.tsx` (/account) and
`src/pages/CustomerProfile.tsx` (/customer-profile — the "Update your
details" form), + display-only components, CSS.

## Account page (/account)
- **Navy header band** (like the dashboard welcome band): large yellow
  initials circle, full name, Customer ID pill (and Provider ID pill when the
  user has one), line "Your details, sign-in and how you use
  Jobby-Connect." "← Back" under the band (navigate back).
- **Two cards side by side** (stack at 375 px):
  1. **Your details** — icon rows NAME · MOBILE (shown as 0498 000 204,
     display only) · ADDRESS ("Not added" in grey when empty), and an
     "Edit details" button (→ `/customer-profile`, as today's "Update your
     details").
  2. **Sign-in & security** — EMAIL (login email, read only) · PASSWORD
     "••••••••••" with a "Change password" button · YOUR IDs: CAS pill
     (+ PAS pill if any) each with a "Copy" link (copies the ID to the
     clipboard, shows "Copied" for 2 s).
     "Change password" is a **preview**: it opens a small panel with
     Current password / New password / Confirm (show/hide eyes) and a
     disabled "Save" with the amber "Preview — not connected yet" note.
     No call. Log it (below).
- **Offering your services** (full-width card). Keep all four of today's
  states, their wording and their buttons (all → `/provider`):
  - No provider profile: left text as today + 3 small steps "1 Set up your
    profile → 2 Admin review → 3 Start quoting" (step 1 highlighted); right
    blue box "Become a provider — Same account, same login — your provider
    area sits beside this one." + yellow "Become a provider →".
  - PENDING: same steps with **2 Admin review** highlighted, the pending
    message in a yellow banner, "Edit provider details".
  - REJECTED: the rejected message in a red banner, "Review provider
    details".
  - APPROVED: all three steps done (navy ticks), "You're set up as a
    provider. Your Provider tab is on the dashboard.", "Provider profile".

## Your details form (/customer-profile)
Same page serves two cases — choose the wording from
`user.customerProfileComplete` (display only):
- **First time** (not complete): title "Complete your customer profile",
  today's intro, button "Save and continue".
- **Editing** (already complete): title "Edit your details", intro "Keep
  your name, mobile and address up to date.", buttons "Cancel" (back) and
  "Save changes".
Layout: card in the new style with icon labels (Full name, Mobile
"04xx xxx xxx", Your address (optional) + today's help text), success /
error bars as elsewhere. Same fields, same validation message ("Please
enter your name and mobile."), same save call.

## Exception approved by the owner (this task only)
After a successful save **while editing**, go back to `/account` and show a
green "Your details were updated." bar there. First-time completion still
goes to `/home` as today. Log it.

## Logged for the developer (BACKEND-REQUESTS.md)
- **Change password while logged in** (Functional Spec §2.9 "password
  reset" under My Details): `POST /me/password {currentPassword,
  newPassword}` — checks the current one, min 8 characters, then signs out
  other sessions. The preview panel above connects to it.
- **Change email**: the login email can't be changed today. Needs a
  verified change (email a confirm link to the new address) — owner to
  confirm whether wanted.

## Must not change
`/me` data, the customer-profile save call and its rules, every `/provider`
link, logout, the approval logic.

## Done when
- As cust-0204@example.com / Test#Customer1 (or any test customer):
  Account shows name, CAS ID, details; Copy copies the ID; Edit details →
  "Edit your details" → change the address → Save changes → back on Account
  with the green bar and the new address; Cancel returns without saving;
  empty mobile → same error.
- Change password opens the preview panel, nothing is sent.
- A brand-new account (sign up) still sees "Complete your customer
  profile" → Save and continue → /home.
- As test-plumbing@example.com (approved provider): the APPROVED state with
  both CAS and PAS pills.
- Works at 375 px. `npm run build`: no new errors.
