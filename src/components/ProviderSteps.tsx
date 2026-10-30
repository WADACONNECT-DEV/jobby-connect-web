import { ArrowIcon, Head, Line, Point, StarIcon, SumBox } from './LandingSteps'
import type { Size } from './LandingSteps'

/* Slides and cards for the Providers landing page (design V3,
   design/providers-v3). Display only. The pictures are illustrations; no
   real quote, payout or count is shown or calculated here.
   In the design only the slides have a picture; the cards are text only. */

const NAVY = '#0F2A4A'
const GOLD = '#D9A400'
const YELLOW = '#F7C21B'
const STAR = 'M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z'

/* ---------- icons ---------- */

const ProfileIcon = ({ size }: { size?: number }) => (
  <Line size={size}>
    <path d="M3 4h18v16H3z" />
    <path d="M7 9h6M7 13h10" stroke={GOLD} />
  </Line>
)
const PinIcon = () => (
  <Line>
    <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.5" stroke={GOLD} />
  </Line>
)
const LockIcon = () => (
  <Line>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={GOLD} />
  </Line>
)
const QuoteDocIcon = () => (
  <Line>
    <path d="M14 3H6v18h12V7z" />
    <path d="M9 9h5M9 13h6M9 17h4" stroke={GOLD} />
  </Line>
)
const ListIcon = () => (
  <Line>
    <path d="M4 5h16M4 12h16M4 19h10" />
    <circle cx="19" cy="19" r="2" fill={YELLOW} stroke={GOLD} />
  </Line>
)
const DoneIcon = ({ size }: { size?: number }) => (
  <Line size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-6" stroke={GOLD} />
  </Line>
)
const BankIcon = () => (
  <Line>
    <path d="M2 6h20v12H2z" />
    <circle cx="12" cy="12" r="2.5" stroke={GOLD} />
  </Line>
)

/* ---------- the four steps ---------- */
/* The caller supplies the wrapper (`lp-step lp-step--slide|card`). */

export function SetupStep({ size }: { size: Size }) {
  return (
    <>
      <Head n="01" title="Set up your business" size={size} />
      {size === 'slide' && (
        <div className="lp-pic lp-pic-setup" aria-hidden="true">
          <span className="lp-biz">
            <span className="lp-biz-mark">YB</span>
            <span className="lp-biz-txt">
              <strong>[Your business name]</strong>
              <span className="lp-biz-ok">✓ Approved</span>
            </span>
          </span>
          {/* The provider mini-site pages, as named in the app (ProviderView). */}
          <span className="lp-site-tabs">
            <span className="is-on">Home</span>
            <span>About Us</span>
            <span>Services</span>
            <span>Contact Us</span>
          </span>
          <span className="lp-sketch" style={{ width: '90%' }} />
          <span className="lp-sketch" style={{ width: '70%' }} />
        </div>
      )}
      <div className="lp-points">
        <Point icon={<ProfileIcon />} title="Your public profile">
          Home, About Us, Services and Contact Us pages to show your work.
        </Point>
        <Point icon={<PinIcon />} title="Choose where you work">
          {size === 'slide' ? 'Pick your industries, suburbs and services.' : 'Pick your industries, suburbs and services. Kept private.'}
        </Point>
      </div>
    </>
  )
}

export function QuoteStep({ size }: { size: Size }) {
  return (
    <>
      <Head n="02" title="Win the right work" size={size} />
      {size === 'slide' && (
        <div className="lp-pic lp-pic-rows" aria-hidden="true">
          <span className="lp-row lp-row-head">
            <span>Your quote</span>
            <span className="lp-row-muted">3 line items</span>
          </span>
          <span className="lp-row lp-row-cream">
            <span>Stage 1 · Deposit</span>
            <strong>30%</strong>
          </span>
          <span className="lp-row lp-row-cream">
            <span>Stage 2 · Completion</span>
            <strong>70%</strong>
          </span>
          <span className="lp-fake-btn">Send quote</span>
        </div>
      )}
      <div className="lp-points">
        <Point icon={<LockIcon />} title="Private requests, no lead fees">Only customers who chose you. Never a resold lead.</Point>
        <Point icon={<QuoteDocIcon />} title="Quotes your way">Itemised or staged quotes, plus bonus points to stand out.</Point>
      </div>
    </>
  )
}

export function RunStep({ size }: { size: Size }) {
  return (
    <>
      <Head n="03" title="Run every job" size={size} />
      {size === 'slide' && (
        <div className="lp-pic lp-pic-rows lp-pic-tabs" aria-hidden="true">
          <span className="lp-row lp-row-cream">
            <span>Received</span>
            <span className="lp-count">3</span>
          </span>
          <span className="lp-row lp-row-cream">
            <span>Replied</span>
            <strong>5</strong>
          </span>
          <span className="lp-row lp-row-win">
            <strong>Wins</strong>
            <strong className="lp-row-green">2</strong>
          </span>
          <span className="lp-row lp-row-cream">
            <span>Job Done</span>
            <strong>8</strong>
          </span>
        </div>
      )}
      <div className="lp-points">
        <Point icon={<ListIcon />} title="Everything in one place">Requests, replies, wins and finished jobs, sorted for you.</Point>
        <Point icon={<DoneIcon />} title="Mark it done">Complete the whole job, or stage by stage.</Point>
      </div>
    </>
  )
}

export function PaidStep({ size }: { size: Size }) {
  return (
    <>
      <Head n="04" title="Get paid, build your name" size={size} />
      {size === 'slide' && (
        <div className="lp-pic lp-pic-paid" aria-hidden="true">
          <span className="lp-track-steps">
            <span><span className="lp-dot lp-dot-done" />Customer paid</span>
            <span><span className="lp-dot lp-dot-done" />Your review</span>
            <span className="is-now"><span className="lp-dot lp-dot-payout" />Payout released</span>
          </span>
          <span className="lp-stars">
            {[0, 1, 2, 3, 4].map((k) => (
              <svg key={k} width="15" height="15" viewBox="0 0 24 24" fill={YELLOW}>
                <path d={STAR} />
              </svg>
            ))}
            <span className="lp-stars-label">Great Job Mate</span>
          </span>
        </div>
      )}
      <div className="lp-points">
        <Point icon={<BankIcon />} title="Automatic payouts">Paid to your bank once you submit your job review.</Point>
        <Point icon={<StarIcon />} title="Ratings that work for you">Good reviews lift you up in customer search.</Point>
      </div>
    </>
  )
}

/* ---------- slide 1: overview loop ---------- */

export function ProviderOverviewSlide() {
  return (
    <div className="lp-sum">
      <div className="lp-sum-grid">
        <SumBox n="1" title="Set up" desc="Profile & service area" icon={<ProfileIcon size={34} />} />
        <ArrowIcon />
        <SumBox
          n="2"
          title="Quote"
          desc="Private requests only"
          icon={
            <Line size={34}>
              <path d="M14 3H6v18h12V7z" />
              <path d="M9 9h5M9 13h6" />
              <circle cx="17" cy="17" r="4" fill={YELLOW} stroke={YELLOW} />
              <path d="M15.3 17l1.2 1.2 2.2-2.4" stroke={NAVY} />
            </Line>
          }
        />
        <span />
        <span />
        <ArrowIcon d="M12 5v14M6 13l6 6 6-6" />
        <SumBox
          n="4"
          title="Get paid"
          desc="Straight to your bank"
          icon={
            <Line size={34}>
              <path d="M2 6h20v12H2z" />
              <circle cx="12" cy="12" r="2.5" fill={YELLOW} stroke={GOLD} />
            </Line>
          }
        />
        <ArrowIcon d="M19 12H5M11 6l-6 6 6 6" />
        <SumBox n="3" title="Do the job" desc="Mark it complete" icon={<DoneIcon size={34} />} />
      </div>
      <div className="lp-sum-points lp-sum-points--dark">
        <span className="lp-coin lp-coin--flat">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill={NAVY}>
            <path d={STAR} />
          </svg>
        </span>
        <span className="lp-sum-points-txt">
          <span className="lp-sum-points-t">Build your reputation</span>
          <span className="lp-sum-points-d">Good ratings lift you up in customer search.</span>
        </span>
      </div>
    </div>
  )
}
