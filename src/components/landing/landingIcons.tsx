/**
 * Icons for the two landing pages (Customers `/`, Providers `/for-providers`).
 *
 * Drawn from the owner's Version 3 design files, path for path, so the pages
 * match the mockups. Every icon is decorative — the text next to it carries the
 * meaning — so each one is aria-hidden.
 */
import type { ReactNode } from 'react'

const NAVY = '#0F2A4A'
const ACCENT = '#D9A400'
const YELLOW = '#F7C21B'

interface SvgProps {
  size?: number
  stroke?: string
  fill?: string
  sw?: number
  vb?: string
  children: ReactNode
}

function Svg({ size = 18, stroke = NAVY, fill = 'none', sw = 2, vb = '0 0 24 24', children }: SvgProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox={vb} fill={fill} stroke={stroke}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

interface IconProps { size?: number }

/* ---------- arrows and slideshow controls ---------- */

export const ArrowRight = ({ size = 18 }: IconProps) => (
  <Svg size={size} stroke="currentColor" sw={2.2}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
)
export const FlowArrowRight = () => <Svg size={18} sw={2.2}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
export const FlowArrowLeft = () => <Svg size={18} sw={2.2}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>
export const FlowArrowDown = () => <Svg size={18} sw={2.2}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>
export const ChevronLeft = () => <Svg size={16} sw={2.4}><path d="M15 6l-6 6 6 6" /></Svg>
export const ChevronRight = () => <Svg size={16} sw={2.4}><path d="M9 6l6 6-6 6" /></Svg>
export const Play = () => <Svg size={14} stroke="none" fill={NAVY}><path d="M7 4l13 8-13 8z" /></Svg>
export const Pause = () => <Svg size={14} stroke="none" fill={NAVY}><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></Svg>

/* ---------- star coin (Mate Points) ---------- */

/** The yellow coin with a star — small in the summary slide, large on card 04. */
export function StarCoin({ size, ring, star }: { size: number; ring: number; star: number }) {
  return (
    <span className="lp-coin" style={{ width: size, height: size, boxShadow: `inset 0 0 0 ${ring}px #FFD95A` }}>
      <Svg size={star} fill="#FFF3C4" stroke="#C79300" sw={star > 30 ? 1.4 : 1.5}>
        <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" />
      </Svg>
    </span>
  )
}

export const Heart = () => (
  <Svg size={18} stroke="none" fill="#E0434B">
    <path d="M12 21l-8.4-8.1a5.3 5.3 0 0 1 7.5-7.5L12 6.3l.9-.9a5.3 5.3 0 0 1 7.5 7.5z" />
  </Svg>
)

export const StarFilled = ({ size = 18, stroke = NAVY, fill = YELLOW, sw = 1.6 }: { size?: number; stroke?: string; fill?: string; sw?: number }) => (
  <Svg size={size} fill={fill} stroke={stroke} sw={sw}>
    <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" />
  </Svg>
)

/* ---------- customer hero trust row ---------- */

export const ShieldCheck = ({ size = 22 }: IconProps) => (
  <Svg size={size}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="M9 12l2 2 4-4" stroke={ACCENT} />
  </Svg>
)
export const Wallet = () => (
  <Svg size={22}>
    <path d="M3 7h18v12H3z" /><path d="M3 7l3-4h12l3 4" />
    <circle cx="16" cy="13" r="1.6" fill={YELLOW} stroke={ACCENT} />
  </Svg>
)

/* ---------- customer feature rows ---------- */

export const Search = () => (
  <Svg size={18}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" stroke={ACCENT} /></Svg>
)
export const Doc = () => <Svg size={18}><path d="M14 3H6v18h12V7z" /><path d="M9 9h5M9 13h6" /></Svg>
export const Tick = () => <Svg size={18}><path d="M4 12l5 5L20 6" stroke={ACCENT} /></Svg>
export const Calendar = () => <Svg size={18}><path d="M3 5h16v15H3z" /><path d="M3 9h16M7 3v4M15 3v4" /></Svg>
export const Card = () => <Svg size={18}><path d="M2 6h20v12H2z" /><path d="M2 10h20M6 14h4" stroke={ACCENT} /></Svg>
export const Gift = () => (
  <Svg size={18}>
    <path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7" />
    <path d="M12 7H8a2.5 2.5 0 0 1 0-5c3 0 4 5 4 5zM12 7h4a2.5 2.5 0 0 0 0-5c-3 0-4 5-4 5z" stroke={ACCENT} />
  </Svg>
)

/* ---------- customer summary-slide step icons (34px) ---------- */

export const StepFind = () => (
  <Svg size={34}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5l5 5" stroke={YELLOW} strokeWidth={3} /></Svg>
)
export const StepCompare = ({ tick = '#FFFFFF' }: { tick?: string }) => (
  <Svg size={34}>
    <path d="M14 3H6v18h12V7z" /><path d="M9 9h5M9 13h6" />
    <circle cx="17" cy="17" r="4" fill={YELLOW} stroke={YELLOW} />
    <path d="M15.3 17l1.2 1.2 2.2-2.4" stroke={tick} />
  </Svg>
)
export const StepPay = () => (
  <Svg size={34}>
    <path d="M3 6h18v11H3z" /><path d="M3 10h18" />
    <path d="M17 13l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill={YELLOW} stroke={ACCENT} />
  </Svg>
)
export const StepTrack = () => (
  <Svg size={34}>
    <path d="M3 5h16v15H3z" /><path d="M3 9h16M7 3v4M15 3v4" />
    <circle cx="18" cy="18" r="4" fill={YELLOW} stroke={YELLOW} />
    <path d="M18 16.3V18h1.4" />
  </Svg>
)

/* ---------- customer strip + teaser (52px / 26px) ---------- */

export const Mates = () => (
  <Svg size={52} vb="0 0 48 48" sw={2.4}>
    <circle cx="12" cy="24" r="5" /><circle cx="24" cy="24" r="5" /><circle cx="36" cy="24" r="5" />
    <path d="M4 42c0-5 4-8 8-8s8 3 8 8M16 42c0-5 4-8 8-8s8 3 8 8M28 42c0-5 4-8 8-8s8 3 8 8" />
    <path d="M24 14l-4-4a2.5 2.5 0 0 1 4-3 2.5 2.5 0 0 1 4 3z" fill={YELLOW} stroke={YELLOW} />
  </Svg>
)
export const InviteTradie = () => (
  <Svg size={52} vb="0 0 48 48" sw={2.4}>
    <circle cx="20" cy="15" r="7" /><path d="M6 42c0-8 6-13 14-13 3 0 5 .5 7 1.5" />
    <circle cx="35" cy="36" r="8" fill={YELLOW} stroke={YELLOW} /><path d="M35 32v8M31 36h8" />
  </Svg>
)
export const Wrench = () => (
  <Svg size={26}><path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.3-2.3a4 4 0 0 0-5-5L2 10l8-8z" /></Svg>
)

/* ---------- provider hero trust row (yellow on navy) ---------- */

export const NoFees = () => <Svg size={22} stroke={YELLOW}><path d="M4 4l16 16" /><circle cx="12" cy="12" r="9" /></Svg>
export const LockYellow = () => (
  <Svg size={22} stroke={YELLOW}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Svg>
)
export const CashYellow = () => <Svg size={22} stroke={YELLOW}><path d="M2 6h20v12H2z" /><circle cx="12" cy="12" r="2.5" /></Svg>

/* ---------- provider feature rows ---------- */

export const ProfileCard = ({ size = 18 }: IconProps) => (
  <Svg size={size}><path d="M3 4h18v16H3z" /><path d="M7 9h6M7 13h10" stroke={ACCENT} /></Svg>
)
export const Pin = () => (
  <Svg size={18}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" stroke={ACCENT} /></Svg>
)
export const Lock = () => (
  <Svg size={18}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={ACCENT} /></Svg>
)
export const DocLines = () => <Svg size={18}><path d="M14 3H6v18h12V7z" /><path d="M9 9h5M9 13h6M9 17h4" stroke={ACCENT} /></Svg>
export const ListDot = () => (
  <Svg size={18}><path d="M4 5h16M4 12h16M4 19h10" /><circle cx="19" cy="19" r="2" fill={YELLOW} stroke={ACCENT} /></Svg>
)
export const CheckCircle = ({ size = 18 }: IconProps) => (
  <Svg size={size}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" stroke={ACCENT} /></Svg>
)
export const Cash = () => <Svg size={18}><path d="M2 6h20v12H2z" /><circle cx="12" cy="12" r="2.5" stroke={ACCENT} /></Svg>

/* ---------- provider summary-slide step icons (34px) ---------- */

export const StepGetPaid = () => (
  <Svg size={34}><path d="M2 6h20v12H2z" /><circle cx="12" cy="12" r="2.5" fill={YELLOW} stroke={ACCENT} /></Svg>
)

/* ---------- provider strip (52px) ---------- */

export const InviteCustomers = () => (
  <Svg size={52} vb="0 0 48 48" sw={2.4}>
    <rect x="6" y="10" width="26" height="30" rx="4" /><path d="M12 18h14M12 24h14M12 30h8" />
    <circle cx="36" cy="34" r="8" fill={YELLOW} stroke={YELLOW} /><path d="M36 30v8M32 34h8" />
  </Svg>
)
export const BothRoles = () => (
  <Svg size={52} vb="0 0 48 48" sw={2.4}>
    <circle cx="17" cy="16" r="7" /><path d="M4 42c0-8 6-13 13-13s13 5 13 13" />
    <path d="M32 22l4 4 8-8" stroke={ACCENT} strokeWidth={3} />
  </Svg>
)
