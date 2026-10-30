# Jobby Mate Referrals — customer view (Part F)

Reference picture: `referrals-v1/referrals-mockup.png` (the names, amounts
and the code in it are made-up examples). Same style as the finished Mates,
Requests & Jobs and Mate Points tabs. File: `src/pages/JobbyMate.tsx`
(+ display-only components, CSS). Rules: Jobby Mate Referral Program Spec
(Flow A, §3) and the existing behaviour — screens only.

`JobbyMate.tsx` serves BOTH roles (customer tab and provider tab). This part
redesigns the **customer view**. The provider-only sections ("Invite your
customers", "Referral offers awaiting you") keep their layout and behaviour;
just put them in the same card style so they don't look broken. The
provider view gets its own redesign later.

## Layout (customer view)
1. **Header**: people-plus icon, "Jobby Mate Referrals", intro "Bring a
   provider you trust onto Jobby-Connect — and stay connected as Jobby
   Mates." Remove the page's own "← Home" button (the frame has ← Back).
2. **How it works strip** (light blue, yellow number circles):
   1 Invite a provider by mobile → 2 They join Jobby-Connect → 3 They
   accept your referral → 4 You earn Mate Points. Under it, small grey
   text: "If they decline, you still stay connected — no points are
   earned." (Spec §3.1 / §5.)
3. **Two cards side by side** (stack at 375 px, Invite first):
   - **Invite a provider** (white, wider, "EARN POINTS" badge): text "Know a
     great tradie or local business? Send them an invite. When they join and
     accept, you earn Mate Points." Fields: PROVIDER MOBILE NUMBER
     (04xx xxx xxx), THEIR NAME (OPTIONAL), INDUSTRY (OPTIONAL); full-width
     yellow "Send invite →". Same call, same rules, same success / error
     messages (already a member, duplicate invite, etc.).
   - **Have a referral code?** (blue card): "Someone invited you? Enter the
     code from your message to connect with them." REFERRAL CODE field +
     navy "Claim" (disabled until typed, as now). Note box: "Codes are in
     the text message your Jobby Mate sent you."
4. **Your connections** (rename from "Your Jobby Mates", which clashes with
   tab 1 — UAT Round 2 asks for the two to stay separate). Count after the
   title. Right: a STATUS filter (All + the statuses present) and the
   existing name / industry / suburb search, both remembered after Back.
   One row per connection:
   initials avatar · name (or "Provider" / "Customer") · industry · suburb ·
   "You referred them" / "They referred you" · status chip using the app's
   existing labels (`referralStatusLabel`): Points granted (green), Offer
   pending and Payment pending (yellow), Connected (grey), Declined (grey
   outline), Points overdue (red, also differs in lightness) · the points
   amount shown exactly as today ("{n} pts"; "—" when 0) · date ·
   "Report unpaid" only where it shows today. Same complaint call.
5. **Empty state**: "No connections yet. Send your first invite above." in
   the Mates empty style. Notices (success / error) as the yellow / red
   message bars used elsewhere.
6. 375 px: rows stack (name + chip on top, details, amount right).

## Not built (logged, no screen work)
Add to BACKEND-REQUESTS.md:
- **Invites sent but not joined yet**: the customer can't see invites they
  sent until that person registers, so there is no "Invited — waiting to
  join" row. Needs the customer's open invites (`ReferralInvite` with
  status SENT / EXPIRED) returned with the connections.
- **Points shown as "pts" here but as dollars in Mate Points**: owner to
  decide one unit for referral rewards; with the spec's $-per-point rate
  the screen could show both ("20 pts · $2.00").

## Must not change
Invite, claim, complaint calls and their rules; provider accept / decline
and bulk invite (provider sections); filters' behaviour; status values.

## Done when
- As cust-0001@example.com / Test#Customer1: send an invite to a new
  number (e.g. 0400 000 999) → success message; send again → the duplicate
  message; invite an existing test provider's mobile (0499000001) → the
  "already a member" message; claim a wrong code → the error.
- Connections list, status filter and search work and are remembered.
- As test-plumbing@example.com (provider tab → Jobby Mate Referrals): the
  provider sections still work and look tidy.
- Works at 375 px. `npm run build`: no new errors.
