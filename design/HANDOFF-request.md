# Request quotes form + photos on one page (Part G)

Reference picture: `request-v1/request-mockup.png`. Same style as the
finished customer tabs. File: `src/pages/NewRequest.tsx` (+ display-only
components, CSS).

Today the form is page 1; after "Send request" the same page switches to a
second screen "Request sent — add photos" (photos can only be attached to a
job that already exists). The owner wants **one page**: details and photos
together, then one "Send" button.

## Layout
- "← Back" (same goBack), header: document icon, "Request quotes",
  "Tell your providers what you need. Photos help them quote accurately."
- Two columns at desktop (main form + right sidebar); one column at 375 px
  with the sidebar's "Sending to" box moved above the form.
- **Main column — four numbered section cards**:
  1. **What do you need?** JOB TITLE, SERVICE INDUSTRY (same list as
     today), DESCRIBE THE JOB with a live "n / 4000" counter and the hint
     "The more detail, the more accurate your quotes."
  2. **Where is the job?** SUBURB and JOB ADDRESS (optional) side by side.
     When the address is still the pre-filled registered address, show a
     small green "Your registered address" tag with "Change it if the job
     is somewhere else." (display only).
     Suburb: use the existing `SuburbPicker` (type-ahead) as on Find — it
     fills the same text value (UAT Round 2 asked for type-ahead here).
  3. **Photos (optional)**: a drop zone "Add photos of the job — Drag photos
     here or choose files · JPG, PNG or WebP", and thumbnails of the chosen
     files with an × to remove each, before sending.
  4. **When? (optional)**: TIME FRAME as quick-pick chips — As soon as
     possible · Within a week · Within 2 weeks · Within a month · Flexible —
     which fill the existing time-frame text (keep a way to type your own:
     an "Other…" chip that shows the text box). REQUEST EXPIRES (same field).
- **Send bar** at the bottom of the form: "Your request goes only to the
  provider(s) you chose. No one else sees it." + "Cancel" (= Back) + yellow
  "Send request to {n} provider(s) →" (same disabled/busy rules; "Sending…"
  while busy).
- **Sidebar**: "Sending to" — each chosen provider as an initials avatar +
  business name (names only; don't add a new call for ratings) and
  "← Change providers" (= Back). "What happens next" — 1 Providers are
  notified and send you their quote · 2 Compare and accept one in Your
  Requests & Jobs · 3 Pay when it's done, then rate the job — and a yellow
  note "You'll earn Mate Points on this job when you rate it."
- Error message as the red bar used elsewhere, at the top of the form.

## Exception approved by the owner (this task only)
Photos are chosen **before** sending, so the page must, after the request
is created, upload the chosen photos to it. Allowed:
1. On "Send": call `POST /jobs` exactly as today (same body, same
   validation and messages). Then, if photos were chosen, upload each one
   with the **same upload call `ImageUploader` uses**
   (`/jobs/{id}/images` with kind REQUEST), one after another, showing
   "Uploading photos 2 of 3…".
2. Then show the success screen (below). Nothing else about the job call
   changes.
3. If any photo fails (too big, too many, wrong type — the server's image
   limits decide), the request is **still sent**; the success screen says
   "Your request was sent, but n photo(s) couldn't be added: {reason}. You
   can add them from Your Requests & Jobs." (Photos can still be added
   there while the request is Open — that already works.)
Log this exception in CHANGES-FOR-DEVELOPER.md.

## Success screen (replaces today's "add photos" screen)
Same page, card in the new style: green tick, "Request sent", "Sent to
{provider names}.", "{n} photo(s) attached" (or the partial-failure note),
the "What happens next" steps, and two buttons: yellow "View my request"
(→ `/home/jobs`, as today's Done) and "Find more providers" (→ `/home/find`).

## Not built (BACKEND-REQUESTS.md)
- **Service industry**: the list is still the old 6 categories because a
  job can only store those (already logged under "jobs don't record the new
  industries"). Repeat the note here; when jobs take `industry_id`, this
  dropdown becomes the active industries list.
- **Photo limits before sending**: the limits call needs a job id, so the
  page can't warn about size/number before sending. Ask for the image limits
  to be readable without a job (e.g. `GET /master/image-limits`) so the drop
  zone can show "up to n photos, n MB each" and refuse oversize files early.

## Must not change
The job create call and its body/validation/messages; the providers passed
in from Mates/Find; the "no providers selected" screen (restyle only);
image upload endpoint and rules.

## Done when
- As cust-0001@example.com: from Mates, tick 1–2 mates → Continue → fill the
  form, pick a time-frame chip, add 2 photos, remove one, Send → "Request
  sent · 1 photo attached" → View my request: the job is under Open with
  the photo, and the provider (e.g. test-plumbing@example.com /
  Test#Provider1) sees the request and the photo.
- Send without photos → success screen without the photo line.
- Try a non-image or very large file → request still sent, the note
  explains which photo failed.
- Missing title/description → the same error as today, nothing sent.
- Works at 375 px. `npm run build`: no new errors.
