export type Role = 'CUSTOMER' | 'PROVIDER' | 'ADMIN'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface User {
  id: string
  email: string
  fullName: string
  mobile: string | null
  /** Defaults the job address on a quote request (UAT Round 2 s5.2). */
  registeredAddress: string | null
  /** Permanent account IDs, e.g. CAS001 / PAS002 (UAT Round 4 s8.1). */
  customerRef: string | null
  providerRef: string | null
  roles: Role[]
  customerProfileComplete: boolean
  hasProviderProfile: boolean
  providerApprovalStatus: ApprovalStatus | null
}

export interface AuthResponse {
  token: string
  user: User
}

export type ServiceCategory =
  | 'TRADES'
  | 'CLEANING'
  | 'PERSONAL'
  | 'PROFESSIONAL'
  | 'EVENTS'
  | 'REMOVALS'

export type JobStatus =
  | 'OPEN'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export interface Job {
  id: string
  title: string
  category: ServiceCategory
  description: string
  suburb: string
  jobAddress: string | null
  timeFrame: string | null
  expiresAt: string | null
  status: JobStatus
  customerId: string
  customerName: string
  providerId: string | null
  providerName: string | null
  targetCount: number
  /** Who the request was actually sent to, named (UAT Round 2 s6.1). */
  targetProviders: JobTargetProvider[]
  createdAt: string
  /** The job's industry (step J1); null on older jobs, which show the category. */
  industryId?: string | null
  industryName?: string | null
}

/** A provider a quote request was sent to. */
export interface JobTargetProvider {
  userId: string
  name: string
  /** REQUESTED, QUOTED, DECLINED or EXPIRED. */
  status: string
  /** Present when the provider declined — shown to the customer (Round 3 9.1). */
  declineMessage: string | null
  /** Full Quote Request ID for this provider (UAT Round 4 s8.4). */
  requestRef: string | null
}

export type QuoteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'

export interface Quote {
  id: string
  jobId: string
  jobTitle: string
  providerId: string
  providerName: string
  amount: number
  currency: string
  message: string | null
  status: QuoteStatus
  createdAt: string
}

export interface Review {
  id: string
  jobId: string
  jobTitle: string
  providerId: string
  providerName: string
  reviewerId: string
  reviewerName: string
  rating: number
  comment: string | null
  createdAt: string
}

export interface ProviderRating {
  average: number
  count: number
  reviews: Review[]
}

export interface Ref {
  id: string
  name: string
}

export interface ProviderProfile {
  id: string
  userId: string
  businessName: string
  abn: string | null
  bio: string | null
  serviceArea: string
  active: boolean
  gstRegistered: boolean
  subscriptionPlanId: string | null
  subscriptionPlanName: string | null
  industries: Ref[]
  subcategories: Ref[]
  suburbs: Ref[]
  categories: ServiceCategory[]
  siteTheme: SiteTheme
  aboutText: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactHours: string | null
  /** Promotional Mate Points advertised on quotes, in dollars. */
  promoPoints: number
  createdAt: string
  /** Whether the provider's plan unlocks the Premium public profile (V39). */
  premiumProfile?: boolean
  /** What's saved for the Premium page (V41), Premium or not. */
  premium?: PremiumContent | null
}

/* ---- Premium profile content (step P3) ---- */

export const HIGHLIGHT_ICONS = ['YEARS', 'LICENSED', 'INSURED', 'FAST_REPLY', 'LOCAL', 'GUARANTEE', 'AWARD', 'TEAM'] as const
export type HighlightIcon = (typeof HIGHLIGHT_ICONS)[number]
export const HIGHLIGHT_ICON_LABELS: Record<HighlightIcon, string> = {
  YEARS: 'Years in business',
  LICENSED: 'Licensed',
  INSURED: 'Insured',
  FAST_REPLY: 'Fast reply',
  LOCAL: 'Local',
  GUARANTEE: 'Guarantee',
  AWARD: 'Award',
  TEAM: 'Team',
}

export interface PremiumHighlight { icon: HighlightIcon | null; title: string; subLine: string | null }
export interface PremiumAboutSection { title: string; body: string | null }
export interface PremiumServiceListing {
  /** Null on a listing not saved yet. Sent back on save so its photo stays attached. */
  id: string | null
  title: string
  description: string | null
  subcategoryId: string | null
  subcategoryName?: string | null
}

export interface PremiumContent {
  headline: string | null
  intro: string | null
  website: string | null
  videoUrl: string | null
  highlights: PremiumHighlight[]
  aboutSections: PremiumAboutSection[]
  serviceListings: PremiumServiceListing[]
}

export interface ProviderSummary {
  id: string
  userId: string
  businessName: string
  serviceArea: string
  categories: ServiceCategory[]
  averageRating: number
  reviewCount: number
  /** Stars earned as a % of the maximum possible (UAT Round 4 s3.3). */
  ratingPercent: number
  jobsCompleted: number
  /** Promotional Mate Points this provider advertises, in dollars. */
  promoPoints: number
  /** Redesign step 4: the same chips a saved mate shows. */
  industries: string[]
  services: string[]
  suburbs: string[]
}

/** How search results are ordered (UAT Round 4 s3.5). */
export type ProviderSearchSort = 'RATING' | 'JOB_COUNT' | 'POINTS_OFFERED'

export const SEARCH_SORT_LABELS: Record<ProviderSearchSort, string> = {
  RATING: 'Rating',
  JOB_COUNT: 'Job count',
  POINTS_OFFERED: 'Special points offered',
}

export type SiteTheme = 'CLASSIC' | 'COASTAL' | 'SLATE'

export const THEME_LABELS: Record<SiteTheme, string> = {
  CLASSIC: 'Classic — navy & amber',
  COASTAL: 'Coastal — teal',
  SLATE: 'Slate — muted grey',
}

/** One industry and the subcategories a provider covers within it. */
export interface ProviderService {
  industry: string
  subcategories: string[]
}

export interface ProviderPublic {
  id: string
  userId: string
  businessName: string
  serviceArea: string
  bio: string | null
  categories: ServiceCategory[]
  averageRating: number
  reviewCount: number
  reviews: Review[]
  siteTheme: SiteTheme
  aboutText: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactHours: string | null
  services: ProviderService[]
  suburbs: string[]
  /** Whether this provider's plan unlocks the Premium public profile (V39). */
  premiumProfile?: boolean
  /** The Premium page content (V41); null unless the plan grants Premium. */
  premium?: PremiumContent | null
}

export interface Mate {
  providerUserId: string
  providerName: string
  businessName: string | null
  serviceArea: string | null
  averageRating: number
  reviewCount: number
  industries: string[]
  suburbs: string[]
  jobsCompleted: number
  lastJobAt: string | null
  savedAt: string
  /** Redesign step 3: description, service tags and bonus offer for the Mates tab. */
  bio: string | null
  services: string[]
  /** Bonus points the provider offers, in dollars. 0 = no offer. */
  promoPoints: number
}

// Admin types (unchanged)
export interface AdminOverview {
  totalUsers: number
  totalProviders: number
  totalJobs: number
  jobsByStatus: Record<string, number>
  totalReviews: number
  platformAverageRating: number
  pendingPayouts: number
  heldFundsCents: number
  paymentIssues: number
}
export interface AdminJobRow {
  id: string; title: string; category: string; status: string
  customerName: string; providerName: string | null; createdAt: string; updatedAt: string
}
export interface AdminProviderRow {
  userId: string; businessName: string; ownerName: string; serviceArea: string
  active: boolean; categories: ServiceCategory[]; averageRating: number; reviewCount: number
}
export interface AdminFlag {
  severity: 'INFO' | 'WARN'; type: string; message: string; jobId: string | null; since: string | null
}

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  TRADES: 'Trades',
  CLEANING: 'Cleaning',
  PERSONAL: 'Personal',
  PROFESSIONAL: 'Professional',
  EVENTS: 'Events',
  REMOVALS: 'Removals',
}

// Simple keyword parse for the chat-style search box (Phase A).
// Extracts a category and an optional suburb from free text like
// "vacate cleaning in Pakenham". A smarter parser can replace this later.
export function parseSearch(text: string): { category: ServiceCategory | null; suburb: string | null } {
  const lower = text.toLowerCase()
  const keywordMap: Record<string, ServiceCategory> = {
    clean: 'CLEANING', vacate: 'CLEANING', 'move-out': 'CLEANING', tidy: 'CLEANING',
    garden: 'TRADES', lawn: 'TRADES', plumb: 'TRADES', electric: 'TRADES', paint: 'TRADES', trade: 'TRADES', repair: 'TRADES',
    remov: 'REMOVALS', move: 'REMOVALS', relocat: 'REMOVALS',
    event: 'EVENTS', party: 'EVENTS', wedding: 'EVENTS', cater: 'EVENTS',
    personal: 'PERSONAL', care: 'PERSONAL', tutor: 'PERSONAL', trainer: 'PERSONAL',
    account: 'PROFESSIONAL', legal: 'PROFESSIONAL', consult: 'PROFESSIONAL', design: 'PROFESSIONAL', professional: 'PROFESSIONAL',
  }
  let category: ServiceCategory | null = null
  for (const key of Object.keys(keywordMap)) {
    if (lower.includes(key)) { category = keywordMap[key]; break }
  }
  let suburb: string | null = null
  const m = lower.match(/\b(?:in|at|near|around)\s+([a-z][a-z\s]+?)(?:\s+for|\s+to|[.,!?]|$)/)
  if (m) suburb = m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase())
  return { category, suburb }
}

export function statusLabel(s: JobStatus | QuoteStatus | string): string {
  // UAT Round 7 §7: there is no "Cancelled" status anywhere in the product.
  // Nothing can produce this value any more (Round 7 §9 removed the only path
  // to it), but jobs cancelled before that still hold it and must still read
  // sensibly. "Not Proceeded" is the label the customer's sub-page uses for
  // this whole group, so a stray badge agrees with the page it sits on.
  //
  // Display only — the stored value is untouched.
  if (s === 'CANCELLED') return 'Not proceeded'
  return s.replace('_', ' ')
}

export function formatMoney(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}


// ---- Master data (Phase B) ----
/**
 * What to show as a job's industry (step J1): its industry name, or the old
 * category's label on jobs made before industries were recorded.
 */
export function industryOf(x: { industryName?: string | null; category: ServiceCategory }): string {
  return x.industryName || CATEGORY_LABELS[x.category] || x.category
}

export interface MasterIndustry {
  id: string
  code: string | null
  name: string
  active: boolean
  sortOrder: number
  /** The industry's group from the owner's master list (redesign step 11), when known. */
  group?: string | null
  groupOrder?: number | null
}

export interface MasterSubcategory {
  id: string
  industryId: string
  name: string
  active: boolean
  sortOrder: number
}

export interface MasterSuburb {
  id: string
  name: string
  state: string
  postcode: string | null
  active: boolean
  /** Local council, e.g. "Casey" (redesign step 11), when known. */
  lga?: string | null
}

export interface MasterPlan {
  id: string
  name: string
  active: boolean
  sortOrder: number
  minImages: number
  maxImages: number
  maxImageMb: number
  customerDefault: boolean
  /** Premium provider profile plan (V39): on/off, price in dollars (null until set), MONTHLY or YEARLY. */
  premiumProfile?: boolean
  price?: number | null
  billingPeriod?: 'MONTHLY' | 'YEARLY' | null
}

export interface MasterRate {
  id: string
  industryId: string
  industryName: string
  suburbId: string | null
  suburbName: string | null
  planId: string | null
  planName: string | null
  commissionBps: number
  matePointsBps: number
  promoLabel: string | null
  active: boolean
  effectiveFrom: string | null
  effectiveTo: string | null
}

// Percent helpers for basis points (1000 bps = 10.00%)
export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2)
}
export function percentToBps(percent: number): number {
  return Math.round(percent * 100)
}


// ---- Quotes (Phase C: priced, multi-line) ----
export type PaymentType = 'FULL' | 'STAGED'

export interface QuoteLineInput {
  description: string
  amount: string // dollars as text in the form
  /** Whether GST applies to this line (UAT Round 3 s3). Defaults to true. */
  gstApplicable: boolean
}

export interface QuoteStageInput {
  name: string
  percent: string // percent as text in the form (e.g. "25")
}

// What the CUSTOMER sees: total + points only (never the breakdown).
export interface CustomerQuoteStage {
  id: string
  name: string
  percent: number
  amount: number
  pointsEarned: number
  settlementStatus: SettlementStatus | null
}

/** One quote line as the customer sees it - already uplifted (UAT Round 6 s2). */
export interface CustomerQuoteLine {
  description: string
  amount: number
  /** No GST is added to this line — shown with "* GST-free item" (ledger spec Part 0). */
  gstFree?: boolean
}

export interface CustomerQuote {
  id: string
  jobId: string
  jobTitle: string
  providerId: string
  providerName: string
  /** Each line at the customer-facing amount. Never the provider's raw price. */
  lineItems: CustomerQuoteLine[]
  /** Sum of the lines, before GST. */
  subTotal: number
  /** One combined GST figure. */
  gst: number
  /** What the customer pays: subTotal + gst. */
  total: number
  /** The standard loyalty share, in dollars. */
  standardPoints: number
  /** The provider-funded bonus. Zero, never null, when none was offered. */
  bonusPoints: number
  pointsEarned: number
  paymentType: PaymentType
  stages: CustomerQuoteStage[]
  message: string | null
  status: QuoteStatus
  settlementStatus: SettlementStatus | null
  createdAt: string
}

/** The rates applying to a job, for the live "Customer sees" column (Round 6 s3.1). */
export interface QuoteRate {
  commissionPercent: number
  pointsPercent: number
  /** What turns the provider's price into the customer-facing figure. */
  upliftPercent: number
  /** Whether the provider is registered for GST (ledger spec Part 0). */
  gstRegistered?: boolean
}

export interface ProviderQuoteLine {
  description: string
  amount: number
}

// What the PROVIDER sees: the full breakdown.
export interface ProviderQuote {
  id: string | null
  jobId: string
  jobTitle: string
  paymentType: PaymentType
  lineItems: ProviderQuoteLine[]
  providerNet: number
  providerGst: number
  commission: number
  commissionGst: number
  points: number
  pointsGst: number
  bonus: number
  bonusGst: number
  customerTotal: number
  pointsEarned: number
  providerPayable: number
  commissionRate: number
  pointsRate: number
  stages: ProviderQuoteStage[]
  message: string | null
  status: QuoteStatus | null
  settlementStatus: SettlementStatus | null
  createdAt: string | null
  /** GST on the provider's invoice to the customer, as shown to the customer (ledger spec Part 0). */
  invoiceGst?: number
}

export interface ProviderQuoteStage {
  id: string | null
  name: string
  percent: number
  completion: boolean
  customerTotal: number
  providerPayable: number
  pointsEarned: number
  settlementStatus: SettlementStatus | null
}

// ---- Admin identity (separate domain from customer/provider) ----
export interface AdminUser {
  id: string
  email: string
  fullName: string
  superAdmin: boolean
  permissionLevel: string | null
  active: boolean
  mustChangePassword: boolean
}

export interface AdminAuthResponse {
  token: string
  admin: AdminUser
}

// ---- Admin management (D-2, Super Admin only) ----
export interface CreateAdminInput {
  email: string
  fullName: string
  superAdmin: boolean
  permissionLevel?: string | null
}

export interface CreatedAdmin {
  admin: AdminUser
  temporaryPassword: string
}

// ---- Admin: provider approvals queue (D-3) ----
export interface ProviderApproval {
  userId: string
  businessName: string
  abn: string | null
  serviceArea: string
  status: ApprovalStatus
  submittedAt: string
}

// ---- Payments (Phase E) ----
export type SettlementStatus = 'PENDING_COMPLETION' | 'PENDING_PAYMENT' | 'PENDING_REVIEW' | 'PAID'

export type PaymentMethod = 'CARD' | 'DEBIT_CARD' | 'PAYPAL' | 'AFTERPAY' | 'STUB'

export interface PaymentResult {
  id: string
  quoteId: string
  stageId: string | null
  amount: number
  method: string
  status: string
  reference: string | null
  createdAt: string
}

// ---- Settlement / provider review (Phase E-2) ----
export interface ProviderReviewInput {
  quoteId: string
  stageId: string | null
  difficulty: number
  cooperation: number
  hazards: string
  notes: string
}

export interface SettlementResult {
  quoteId: string
  stageId: string | null
  status: SettlementStatus
  payoutAmount: number | null
}

export function settlementLabel(st: SettlementStatus): string {
  switch (st) {
    case 'PENDING_COMPLETION': return 'Awaiting completion'
    case 'PENDING_PAYMENT': return 'Awaiting payment'
    case 'PENDING_REVIEW': return 'Paid — awaiting provider review'
    case 'PAID': return 'Paid out'
    default: return st
  }
}

// ---- Mate Points wallet (Phase F) ----
export interface WalletEntry {
  type: string
  amount: number
  memo: string | null
  date: string
  /**
   * Redesign step 5 (ledger view). Full timestamp, so same-day movements keep
   * their order and dates show in Melbourne time. The job fields are null when
   * a movement isn't tied to a job (referral, adjustment).
   */
  createdAt?: string | null
  jobId?: string | null
  jobTitle?: string | null
  requestRef?: string | null
  providerName?: string | null
  /** The job's category code; label it with CATEGORY_LABELS. */
  category?: string | null
}
export interface Wallet {
  balance: number
  history: WalletEntry[]
}

// ---- Admin payments / refunds (Phase E-3) ----
export interface AdminPayment {
  id: string
  quoteId: string
  stageId: string | null
  amount: number
  method: string
  status: string
  reference: string | null
  createdAt: string
}

// ---- Admin Mate Points report (Phase F-3) ----
export interface PointsReportRow {
  date: string
  customerName: string
  type: string
  amount: number
  runningBalance: number
  memo: string | null
}
export interface PointsReport {
  closingBalance: number
  rows: PointsReportRow[]
}

// ---- Admin: financial ledger reports (Phase D) ----
export interface LedgerReportSummary {
  account: string
  label: string
  balance: number
  naturalSide: 'DEBIT' | 'CREDIT'
}

export interface LedgerLine {
  id: string
  date: string
  entryType: string
  account: string
  gstType: string | null
  debit: number
  credit: number
  memo: string | null
  quoteId: string | null
  stageId: string | null
  jobId: string | null
  customerId: string | null
  providerId: string | null
}


// ===================================================================
// ---- Jobby Mate Referral Program (Phase G) ----
// APPEND this block to the END of src/types.ts (do not remove anything).
// ===================================================================

export type ReferrerType = 'CUSTOMER' | 'PROVIDER'

export type ReferralPointsStatus =
  | 'NONE'
  | 'OFFERED'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'DECLINED'
  | 'PAYMENT_OVERDUE'
  /** Redesign step 6: an invite nobody has registered from yet (display only). */
  | 'INVITED' | 'INVITE_EXPIRED'

export interface MateConnection {
  /** Null on an invite row. */
  referralRecordId: string | null
  direction: 'REFERRED_BY_ME' | 'REFERRED_ME'
  otherPartyId: string
  otherPartyType: ReferrerType
  otherPartyName: string | null
  industry: string | null
  suburb: string | null
  pointsAmount: number
  pointsStatus: ReferralPointsStatus
  createdAt: string
  /** Redesign step 6: pointsAmount in dollars at the admin per-point rate. */
  pointsValue?: number | null
  /** Set only on an invite row (no referralRecordId yet). */
  inviteId?: string | null
  inviteMobile?: string | null
  expiresAt?: string | null
}

export interface SendInviteRequest {
  mobiles: string[]
  inviteeType: ReferrerType
  nameHint?: string | null
  industryHint?: string | null
  pointsOffered?: number | null
}

export interface InviteSkipped {
  mobile: string
  reason: string
}
export interface InviteResult {
  sent: string[]
  skipped: InviteSkipped[]
}

export interface ReferralActionResult {
  referralRecordId: string
  pointsStatus: ReferralPointsStatus
  message: string
}

export function referralStatusLabel(s: ReferralPointsStatus): string {
  switch (s) {
    case 'NONE': return 'Connected'
    case 'OFFERED': return 'Offer pending'
    case 'PENDING_PAYMENT': return 'Payment pending'
    case 'PAID': return 'Points granted'
    case 'DECLINED': return 'Declined'
    case 'PAYMENT_OVERDUE': return 'Points overdue'
    case 'INVITED': return 'Invited — waiting to join'
    case 'INVITE_EXPIRED': return 'Invite expired'
    default: return s
  }
}

// ---- Admin: referral config & settings (Phase G-1) ----
export interface ReferralConfig {
  id: string
  suburb: string | null
  industry: string | null
  pointsPerReferral: number
  effectiveFrom: string
  effectiveTo: string | null
  default: boolean
}

export interface ReferralSettings {
  id: number
  centsPerPoint: number
  flowBMinPoints: number | null
  flowBMaxPoints: number | null
  flowBBatchLimit: number
  linkExpiryDays: number
  flowAResponseDays: number
  paymentGraceDays: number
  updatedAt: string
}

export interface ReferralQueueRow {
  referralRecordId: string
  kind: 'PAYMENT_OVERDUE' | 'COMPLAINT'
  referrerId: string | null
  referrerType: string | null
  refereeId: string | null
  refereeType: string | null
  pointsAmount: number
  detail: string | null
  createdAt: string | null
}

/* ---- Provider request pipeline (dashboard tabs, Spec §3.4 / Series 2 §3.4) ---- */

export type ProviderRequestOutcome = 'RECEIVED' | 'REPLIED' | 'WON' | 'LOST' | 'EXPIRED' | 'DECLINED'

export const OUTCOME_LABELS: Record<ProviderRequestOutcome, string> = {
  RECEIVED: 'Received',
  REPLIED: 'Replied',
  WON: 'Wins',
  LOST: 'Lost',
  EXPIRED: 'Expired',
  DECLINED: 'Declined',
}

export interface ProviderRequestRow {
  jobId: string
  jobTitle: string
  category: ServiceCategory
  description: string
  suburb: string
  timeFrame: string | null
  customerName: string
  jobStatus: JobStatus
  expiresAt: string | null
  requestedAt: string
  targetCount: number
  outcome: ProviderRequestOutcome
  quoteId: string | null
  quoteTotal: number | null
  providerPayable: number | null
  quoteStatus: QuoteStatus | null
  settlementStatus: SettlementStatus | null
  quotedAt: string | null
  /** Set only on a request this provider declined (UAT Round 3 s6/s8). */
  declineMessage: string | null
  declinedAt: string | null
  /** Full Quote Request ID for this record (UAT Round 4 s8.4). */
  requestRef: string | null
  /** Redesign step 9: when an unsent quote draft was last saved, else null. */
  draftSavedAt?: string | null
  /** The job's industry name (step J1); null on older jobs, which show the category. */
  industryName?: string | null
}

/** A saved, unpriced quote form (UAT Round 3 s7). One per request. */
export interface QuoteDraftPayload {
  lineItems: { description: string; amount: number | null; gstApplicable: boolean }[]
  bonusPoints: number | null
  paymentType: PaymentType
  stages: { name: string; percent: number | null }[]
  message: string | null
}

export interface QuoteDraftResponse {
  draft: QuoteDraftPayload | null
  updatedAt: string
}

/** Declining a request, with the message the customer will see. */
export interface DeclineRequestInput {
  message: string
}

/* ---- Job progress (percentage-complete indicator, Spec 2.6) ---- */

export interface ProgressEntry {
  id: string
  jobId: string
  percent: number
  note: string | null
  createdAt: string
}

/* ---- Job images (Spec 2.2 / 2.6 / 7.5) ---- */

export type AttachmentKind = 'REQUEST' | 'PROGRESS' | 'COMPLETION'

export interface Attachment {
  id: string
  jobId: string
  progressId: string | null
  kind: AttachmentKind
  originalFilename: string | null
  contentType: string
  sizeBytes: number
  width: number | null
  height: number | null
  createdAt: string
}

/** The image rules in force for the current user on a job. */
export interface ImageLimits {
  planId: string | null
  planName: string
  minImages: number
  maxImages: number
  maxImageMb: number
}

/* ---- Notifications + message outbox (Spec 2.3 / 3.3) ---- */

/**
 * Must stay in step with EventType on the API side — an event with no entry in
 * EVENT_LABELS below renders as a blank line in the notification centre.
 *
 * Three request events were missing here: the API has sent REQUEST_DECLINED and
 * REQUEST_EXPIRED all along, and REQUEST_SENT has never once been delivered
 * because the notification write failed every time (fixed separately today).
 * Now that it works, those notifications start arriving — with no label unless
 * they are listed.
 */
export type EventType =
  | 'QUOTE_RECEIVED' | 'QUOTE_ACCEPTED' | 'QUOTE_DECLINED'
  | 'REQUEST_SENT' | 'REQUEST_DECLINED' | 'REQUEST_EXPIRED'
  | 'JOB_STARTED' | 'PROGRESS_UPDATED' | 'JOB_COMPLETED' | 'JOB_CANCELLED'
  | 'PAYMENT_RECEIVED' | 'REVIEW_SUBMITTED' | 'PAYOUT_RELEASED' | 'REVIEW_REQUESTED'
  | 'REFERRAL_INVITED' | 'REFERRAL_REWARDED'
  | 'PASSWORD_RESET' | 'EMAIL_CHANGE_CONFIRM' | 'EMAIL_CHANGED'

export const EVENT_LABELS: Record<EventType, string> = {
  QUOTE_RECEIVED: 'Quote received',
  QUOTE_ACCEPTED: 'Quote accepted',
  QUOTE_DECLINED: 'Quote declined',
  REQUEST_SENT: 'New quote request',
  REQUEST_DECLINED: 'Request declined',
  REQUEST_EXPIRED: 'Request expired',
  JOB_STARTED: 'Job started',
  PROGRESS_UPDATED: 'Progress updated',
  JOB_COMPLETED: 'Job completed',
  // Kept for notifications sent before UAT Round 7 §9 removed the only action
  // that could raise this event. Relabelled for the same reason statusLabel is:
  // the word does not appear in the product any more.
  JOB_CANCELLED: 'Job closed',
  PAYMENT_RECEIVED: 'Payment received',
  REVIEW_SUBMITTED: 'Review submitted',
  PAYOUT_RELEASED: 'Payout released',
  REVIEW_REQUESTED: 'Rate your provider',
  REFERRAL_INVITED: 'Referral invited',
  REFERRAL_REWARDED: 'Referral rewarded',
  // Email only (redesign step 2) - shows in the admin Communications log.
  PASSWORD_RESET: 'Password reset link',
  EMAIL_CHANGE_CONFIRM: 'Confirm new email',
  EMAIL_CHANGED: 'Email changed notice',
}

export interface NotificationItem {
  id: string
  eventType: EventType
  title: string
  body: string | null
  link: string | null
  jobId: string | null
  read: boolean
  createdAt: string
}

export type MessageChannel = 'IN_APP' | 'EMAIL' | 'SMS'
export type MessageStatus = 'SENT' | 'FAILED' | 'SKIPPED'

/** One delivery record on the admin Communications screen. */
export interface OutboxEntry {
  id: string
  channel: MessageChannel
  eventType: EventType
  recipientId: string | null
  recipientName: string | null
  recipientAddress: string | null
  subject: string | null
  body: string | null
  status: MessageStatus
  providerRef: string | null
  error: string | null
  jobId: string | null
  createdAt: string
}

/* ---- Payment methods & Round 1 failure simulation (Series 2 4.1) ---- */

export type PaymentSimulation =
  | 'SUCCESS' | 'DECLINED' | 'INSUFFICIENT_FUNDS' | 'TIMEOUT' | 'GATEWAY_ERROR'

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: 'Credit card',
  DEBIT_CARD: 'Debit card',
  PAYPAL: 'PayPal',
  AFTERPAY: 'Afterpay',
  STUB: 'Sandbox',
}

export const SIMULATION_LABELS: Record<PaymentSimulation, string> = {
  SUCCESS: 'Succeed',
  DECLINED: 'Declined',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  TIMEOUT: 'Processor timeout',
  GATEWAY_ERROR: 'Gateway error',
}

export interface PaymentCapabilities {
  methods: PaymentMethod[]
  simulationEnabled: boolean
  simulations: PaymentSimulation[]
}

/** Platform-wide configuration served by GET /master/settings (V25). */
export interface PlatformSettings {
  maxProvidersPerRequest: number
  updatedAt: string
}

/* ---- Account Ledger and documents (owner's ledger spec, step L3) ---- */

export type DocumentType = 'INV' | 'INV_C' | 'REPT' | 'REPT_P'

export interface DocParty {
  name: string | null
  abn: string | null
  ref: string | null
  address: string | null
  email: string | null
  phone: string | null
}

export interface DocLine { description: string; price: number; gst: number | null; total: number; gstFree: boolean }
export interface DocCharge { label: string; amount: number; gst: number; total: number }
export interface DocReceipt { date: string; method: string; amount: number }

/** An issued invoice or receipt, exactly as issued (GET /documents/{number}). */
export interface AccountDocument {
  number: string
  type: DocumentType
  title: string
  issuedAt: string
  requestRef: string | null
  from: DocParty | null
  to: DocParty | null
  jobTitle: string | null
  stageName: string | null
  stageNumber: number | null
  quoteApprovedAt: string | null
  completedAt: string | null
  gstRegistered: boolean
  lines: DocLine[] | null
  subtotal: number | null
  gst: number | null
  total: number | null
  pointsEarned: number | null
  charges: DocCharge[] | null
  chargesSubtotal: number | null
  chargesGst: number | null
  chargesTotal: number | null
  receipts: DocReceipt[] | null
  received: number | null
  collected: number | null
  paidToProvider: number | null
  payoutReference: string | null
  related: { invoice: string | null; charges: string | null; receipt: string | null; payout: string | null } | null
  notes: string[] | null
}

export type LedgerRowKind = 'INVOICE' | 'PAYMENT' | 'POINTS' | 'SENT' | 'CHARGES' | 'PAYOUT'

export interface LedgerRow {
  date: string
  kind: LedgerRowKind
  number: string
  requestRef: string | null
  jobId: string
  quoteId: string
  stageId: string | null
  counterparty: string | null
  counterpartyRef: string | null
  industry: string | null
  suburb: string | null
  description: string
  invoiced: number | null
  paid: number | null
  sent: number | null
  charges: number | null
  received: number | null
  gst: number | null
  amount: number
  balance: number
  owing: boolean
}

export interface LedgerStatement {
  role: 'customer' | 'provider'
  from: string | null
  to: string | null
  opening: number
  closing: number
  totals: {
    invoiced: number; paid: number; owing: number
    sent: number; charges: number; received: number
    gstCollected: number; gstOnCharges: number; gstNet: number; stillToReceive: number
  }
  rows: LedgerRow[]
}

/* ---- Admin: document search and trace (ledger spec Part 1.6, step L4) ---- */

export interface DocumentSummary {
  number: string
  type: DocumentType
  issuedAt: string
  total: number
  gst: number
  stageId: string | null
  requestRef: string | null
}

export interface AdminDocumentTrace {
  quoteId: string
  requestRef: string | null
  jobTitle: string | null
  customer: DocParty | null
  provider: DocParty | null
  units: { stageId: string | null; label: string; documents: DocumentSummary[] }[]
  payments: { date: string; unit: string; method: string; cash: number; matePoints: number | null; status: string; reference: string | null }[]
}

/** What a run of the document backfill did (Admin → Documents → Run backfill). */
export interface DocumentBackfillResult {
  quotesChecked: number
  unitsPastCompletion: number
  documentsIssued: number
  errors: number
  firstError: string | null
  finishedAt: string
  markedDone: boolean
}

/** Jobby-Connect's business details for its documents (ledger spec Part 1.8). */
export interface BusinessDetails {
  legalName: string | null
  abn: string | null
  address: string | null
  email: string | null
  phone: string | null
  collectedNote: string | null
  updatedAt: string | null
}

/* ---- Premium profile photos (step P2) ---- */

export type ProfileMediaKind = 'LOGO' | 'HERO' | 'GALLERY' | 'SERVICE'

/** One photo on a provider's Premium public profile. Bytes come from /profile-media/{id}. */
export interface ProfileMedia {
  id: string
  kind: ProfileMediaKind
  /** For SERVICE photos: the service listing it belongs to. */
  serviceRef: string | null
  sortOrder: number
  originalFilename: string | null
  width: number | null
  height: number | null
  createdAt: string
}

