export type Role = 'CUSTOMER' | 'PROVIDER' | 'ADMIN'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface User {
  id: string
  email: string
  fullName: string
  mobile: string | null
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
  createdAt: string
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
  createdAt: string
}

export interface ProviderSummary {
  id: string
  userId: string
  businessName: string
  serviceArea: string
  categories: ServiceCategory[]
  averageRating: number
  reviewCount: number
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
export interface MasterIndustry {
  id: string
  code: string | null
  name: string
  active: boolean
  sortOrder: number
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

export interface CustomerQuote {
  id: string
  jobId: string
  jobTitle: string
  providerId: string
  providerName: string
  total: number
  pointsEarned: number
  paymentType: PaymentType
  stages: CustomerQuoteStage[]
  message: string | null
  status: QuoteStatus
  settlementStatus: SettlementStatus | null
  createdAt: string
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

export interface MateConnection {
  referralRecordId: string
  direction: 'REFERRED_BY_ME' | 'REFERRED_ME'
  otherPartyId: string
  otherPartyType: ReferrerType
  otherPartyName: string | null
  industry: string | null
  suburb: string | null
  pointsAmount: number
  pointsStatus: ReferralPointsStatus
  createdAt: string
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

export type ProviderRequestOutcome = 'RECEIVED' | 'REPLIED' | 'WON' | 'LOST' | 'EXPIRED'

export const OUTCOME_LABELS: Record<ProviderRequestOutcome, string> = {
  RECEIVED: 'Received',
  REPLIED: 'Replied',
  WON: 'Wins',
  LOST: 'Lost',
  EXPIRED: 'Expired',
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

export type EventType =
  | 'QUOTE_RECEIVED' | 'QUOTE_ACCEPTED' | 'QUOTE_DECLINED'
  | 'JOB_STARTED' | 'PROGRESS_UPDATED' | 'JOB_COMPLETED' | 'JOB_CANCELLED'
  | 'PAYMENT_RECEIVED' | 'REVIEW_SUBMITTED' | 'PAYOUT_RELEASED'
  | 'REFERRAL_INVITED' | 'REFERRAL_REWARDED'

export const EVENT_LABELS: Record<EventType, string> = {
  QUOTE_RECEIVED: 'Quote received',
  QUOTE_ACCEPTED: 'Quote accepted',
  QUOTE_DECLINED: 'Quote declined',
  JOB_STARTED: 'Job started',
  PROGRESS_UPDATED: 'Progress updated',
  JOB_COMPLETED: 'Job completed',
  JOB_CANCELLED: 'Job cancelled',
  PAYMENT_RECEIVED: 'Payment received',
  REVIEW_SUBMITTED: 'Review submitted',
  PAYOUT_RELEASED: 'Payout released',
  REFERRAL_INVITED: 'Referral invited',
  REFERRAL_REWARDED: 'Referral rewarded',
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
