// Platform-wide values the UI needs to respect.
//
// Right now the provider-per-request cap is a single constant here rather than
// scattered through the pages that enforce it (UAT Round 2 open item 7.2 asks
// for exactly that: a configured value, not a hard-coded constant repeated in
// three places).
//
// It is deliberately 3 for the moment, because that is what the API still
// enforces in JobService — the form must never let a customer pick more
// providers than the server will accept. R2-4 turns this into an admin-managed
// setting the API serves, at which point this file reads it from the API and
// nothing else has to change.

export const MAX_PROVIDERS_PER_REQUEST = 3
