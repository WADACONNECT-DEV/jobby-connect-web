import type { ReactNode } from 'react'

/* Pictures and copy shared by the landing-page slideshow and the
   "Everything you get" cards (design V3). Display only — the search boxes
   and quote cards drawn here are illustrations, not working controls. */

/** 'slide' = inside the hero slideshow, 'card' = in the cards grid. */
export type Size = 'slide' | 'card'

const NAVY = '#0F2A4A'
const GOLD = '#D9A400'
const YELLOW = '#F7C21B'
const STAR = 'M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z'
const HEART = 'M12 21l-8.4-8.1a5.3 5.3 0 0 1 7.5-7.5L12 6.3l.9-.9a5.3 5.3 0 0 1 7.5 7.5z'

/* ---------- icons ---------- */

type IconProps = { size?: number; children: ReactNode; join?: boolean }

export function Line({ size = 18, children, join = true }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={NAVY}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin={join ? 'round' : undefined}
    >
      {children}
    </svg>
  )
}

export function ArrowIcon({ d = 'M5 12h14M13 6l6 6-6 6' }: { d?: string }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export const ShieldIcon = ({ size }: { size?: number }) => (
  <Line size={size}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="M9 12l2 2 4-4" stroke={GOLD} />
  </Line>
)

export const WalletIcon = ({ size }: { size?: number }) => (
  <Line size={size}>
    <path d="M3 7h18v12H3z" />
    <path d="M3 7l3-4h12l3 4" />
    <circle cx="16" cy="13" r="1.6" fill={YELLOW} stroke={GOLD} />
  </Line>
)

export const StarIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={YELLOW} stroke={NAVY} strokeWidth="1.6" strokeLinejoin="round">
    <path d={STAR} />
  </svg>
)

const SearchIcon = () => (
  <Line join={false}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5l5 5" stroke={GOLD} />
  </Line>
)
const DocIcon = () => (
  <Line>
    <path d="M14 3H6v18h12V7z" />
    <path d="M9 9h5M9 13h6" />
  </Line>
)
const TickIcon = () => (
  <Line>
    <path d="M4 12l5 5L20 6" stroke={GOLD} />
  </Line>
)
const CalendarIcon = () => (
  <Line>
    <path d="M3 5h16v15H3z" />
    <path d="M3 9h16M7 3v4M15 3v4" />
  </Line>
)
const CardIcon = () => (
  <Line>
    <path d="M2 6h20v12H2z" />
    <path d="M2 10h20M6 14h4" stroke={GOLD} />
  </Line>
)
const GiftIcon = () => (
  <Line>
    <path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7" />
    <path d="M12 7H8a2.5 2.5 0 0 1 0-5c3 0 4 5 4 5zM12 7h4a2.5 2.5 0 0 0 0-5c-3 0-4 5-4 5z" stroke={GOLD} />
  </Line>
)

/** The yellow coin with a star, used for Mate Points. */
function Coin({ className, star }: { className: string; star: number }) {
  return (
    <span className={className}>
      <svg aria-hidden="true" width={star} height={star} viewBox="0 0 24 24" fill="#FFF3C4" stroke="#C79300" strokeWidth="1.5" strokeLinejoin="round">
        <path d={STAR} />
      </svg>
    </span>
  )
}

/* ---------- building blocks ---------- */

export function Head({ n, title, size }: { n: string; title: string; size: Size }) {
  const H = size === 'slide' ? 'h2' : 'h3'
  return (
    <div className="lp-step-head">
      <span className="lp-num">{n}</span>
      <H className="lp-step-title">{title}</H>
    </div>
  )
}

export function Point({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="lp-point">
      <span className="lp-point-ico">{icon}</span>
      <span className="lp-point-txt">
        <strong>{title}</strong>
        <br />
        <span className="lp-point-d">{children}</span>
      </span>
    </div>
  )
}

/* ---------- the four steps ---------- */
/* Each renders the inside of a step; the caller supplies the wrapper
   (`lp-step lp-step--slide` or `lp-step lp-step--card`). */

export function FindStep({ size }: { size: Size }) {
  return (
    <>
      <Head n="01" title="Find your local help" size={size} />
      <div className="lp-pic lp-pic-search" aria-hidden="true">
        <span className="lp-fake-input">Suburb · e.g. Mulgrave</span>
        <span className="lp-fake-input">Industry · e.g. Gardening</span>
        <span className="lp-fake-btn">Search</span>
      </div>
      <div className="lp-points">
        <Point icon={<SearchIcon />} title="Search your suburb">Sort by rating, jobs done or bonus points.</Point>
        <Point icon={<ShieldIcon />} title="Approved providers">Reviewed before appearing in search.</Point>
      </div>
    </>
  )
}

function QuoteCard({ picked }: { picked?: boolean }) {
  return (
    <span className={picked ? 'lp-q lp-q-pick' : 'lp-q'}>
      <strong>$</strong>
      <span className="lp-q-line" />
      <span className="lp-q-line" />
      {picked && <span className="lp-q-choose">Choose</span>}
    </span>
  )
}

export function CompareStep({ size }: { size: Size }) {
  return (
    <>
      <Head n="02" title="Choose with confidence" size={size} />
      <div className="lp-pic lp-pic-compare" aria-hidden="true">
        <QuoteCard />
        <QuoteCard picked />
        <QuoteCard />
      </div>
      <div className="lp-points">
        <Point icon={<DocIcon />} title="Private quotes">Request quotes from up to 3 providers you choose.</Point>
        <Point icon={<TickIcon />} title="Compare & accept">Choose one quote. The others are closed automatically.</Point>
      </div>
    </>
  )
}

export function TrackStep({ size }: { size: Size }) {
  return (
    <>
      <Head n="03" title="Stay in control" size={size} />
      <div className="lp-pic lp-pic-track" aria-hidden="true">
        <span className="lp-track-job">
          <strong>Gardening job</strong>
          <span className="lp-mono">000000012-CAS001-PAS002-001</span>
        </span>
        <span className="lp-track-steps">
          <span><span className="lp-dot lp-dot-done" />Accepted</span>
          <span className="is-now"><span className="lp-dot lp-dot-now" />In progress</span>
          <span><span className="lp-dot lp-dot-todo" />Completed</span>
        </span>
        <span className="lp-track-bar"><span /></span>
      </div>
      <div className="lp-points">
        <Point icon={<CalendarIcon />} title="Track every stage">One Quote ID keeps your job together.</Point>
        <Point icon={<CardIcon />} title="Pay for completed work">Pay in-app, including agreed stages.</Point>
      </div>
    </>
  )
}

export function RewardsStep({ size }: { size: Size }) {
  return (
    <>
      <Head n="04" title="Keep the good going" size={size} />
      <div className="lp-pic lp-pic-rewards" aria-hidden="true">
        <Coin className="lp-coin-big" star={size === 'slide' ? 48 : 44} />
        <span className="lp-heart">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#E0434B"><path d={HEART} /></svg>
        </span>
      </div>
      <div className="lp-points">
        <Point icon={<StarIcon />} title="Rate & earn points">Rate your paid job to receive your Mate Points.</Point>
        <Point icon={<GiftIcon />} title="Use your rewards">Redeem points on future services.</Point>
      </div>
    </>
  )
}

/* ---------- slideshow-only slides ---------- */

export function SumBox({ n, icon, title, desc }: { n: string; icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="lp-sum-box">
      <span className="lp-sum-n">{n}</span>
      {icon}
      <span className="lp-sum-t">{title}</span>
      <span className="lp-sum-d">{desc}</span>
    </div>
  )
}

/** Slide 1: the four steps in a loop, plus the Mate Points strip. */
export function OverviewSlide() {
  return (
    <div className="lp-sum">
      <div className="lp-sum-grid">
        <SumBox
          n="1"
          title="Find"
          desc="Choose local providers"
          icon={
            <Line size={34} join={false}>
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5l5 5" stroke={YELLOW} strokeWidth="3" />
            </Line>
          }
        />
        <ArrowIcon />
        <SumBox
          n="2"
          title="Compare"
          desc="Up to 3 private quotes"
          icon={
            <Line size={34}>
              <path d="M14 3H6v18h12V7z" />
              <path d="M9 9h5M9 13h6" />
              <circle cx="17" cy="17" r="4" fill={YELLOW} stroke={YELLOW} />
              <path d="M15.3 17l1.2 1.2 2.2-2.4" stroke="#FFFFFF" />
            </Line>
          }
        />
        <span />
        <span />
        <ArrowIcon d="M12 5v14M6 13l6 6 6-6" />
        <SumBox
          n="4"
          title="Pay & rate"
          desc="Complete your job"
          icon={
            <Line size={34}>
              <path d="M3 6h18v11H3z" />
              <path d="M3 10h18" />
              <path d="M17 13l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill={YELLOW} stroke={GOLD} />
            </Line>
          }
        />
        <ArrowIcon d="M19 12H5M11 6l-6 6 6 6" />
        <SumBox
          n="3"
          title="Track"
          desc="Follow the work"
          icon={
            <Line size={34}>
              <path d="M3 5h16v15H3z" />
              <path d="M3 9h16M7 3v4M15 3v4" />
              <circle cx="18" cy="18" r="4" fill={YELLOW} stroke={YELLOW} />
              <path d="M18 16.3V18h1.4" stroke={NAVY} />
            </Line>
          }
        />
      </div>
      <div className="lp-sum-points">
        <Coin className="lp-coin" star={22} />
        <span className="lp-sum-points-txt">
          <span className="lp-sum-points-t">Earn Mate Points</span>
          <span className="lp-sum-points-d">Use them on a future service.</span>
        </span>
      </div>
    </div>
  )
}

export type Photo = { src: string; pos: string; tag: string; alt: string }

export function PhotoSlide({ src, pos, tag, alt }: Photo) {
  return (
    <figure className="lp-photo">
      <img src={src} alt={alt} style={{ objectPosition: pos }} />
      <figcaption>
        <span className="lp-photo-dot" aria-hidden="true" />
        {tag}
      </figcaption>
    </figure>
  )
}
