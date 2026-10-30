import type { ReactNode } from 'react'

/* Shared, display-only pieces for the redesigned dashboard tabs
   (HANDOFF-mates Part B; reused by Requests & Jobs and Find next).
   Styles: `pg-` in index.css. Nothing here calls the API. */

/* ---------- icons ---------- */

type IconProps = { size?: number; children: ReactNode; fill?: string; stroke?: string; width?: number }

export function Icon({ size = 18, children, fill = 'none', stroke = 'currentColor', width = 2 }: IconProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

const STAR = 'M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z'
const HEART = 'M12 21l-8.4-8.1a5.3 5.3 0 0 1 7.5-7.5L12 6.3l.9-.9a5.3 5.3 0 0 1 7.5 7.5z'

export const HeartPeopleIcon = () => (
  <Icon size={44} width={1.6}>
    <path d="M12 20l-7.5-7.2a4.7 4.7 0 0 1 6.6-6.7L12 7l.9-.9a4.7 4.7 0 0 1 6.6 6.7" />
    <circle cx="16.5" cy="14.5" r="2" />
    <path d="M13.2 21c0-1.9 1.5-3.3 3.3-3.3s3.3 1.4 3.3 3.3" />
  </Icon>
)
export const ClipboardIcon = () => (
  <Icon size={44} width={1.6}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 3h6v3H9zM9 11h6M9 15h4" />
  </Icon>
)
export const SearchIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Icon>
)
export const PinIcon = () => (
  <Icon size={16}>
    <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </Icon>
)
export const ClockIcon = () => (
  <Icon size={16}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)
export const HeartIcon = ({ size = 16, color = '#F7C21B' }: { size?: number; color?: string }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d={HEART} />
  </svg>
)
export const StarIcon = ({ size = 18 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="#F7C21B">
    <path d={STAR} />
  </svg>
)
export const CheckIcon = () => (
  <Icon size={16} width={2.6}>
    <path d="M5 12l5 5L20 7" />
  </Icon>
)
export const ArrowIcon = () => (
  <Icon size={18} width={2.2}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)
export const ListIcon = () => (
  <Icon size={16}>
    <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
  </Icon>
)
export const GridIcon = () => (
  <Icon size={16}>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </Icon>
)
export const FilterIcon = () => (
  <Icon size={16}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Icon>
)
export const UserPlusIcon = () => (
  <Icon size={18}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 21c0-4 3-7 7-7s7 3 7 7M19 8v6M16 11h6" />
  </Icon>
)

/* ---------- building blocks ---------- */

/** Page title row: icon, title, one-line intro, and an action on the right. */
export function PageHead({ icon, title, intro, action }: { icon: ReactNode; title: string; intro: string; action?: ReactNode }) {
  return (
    <div className="pg-head">
      <span className="pg-head-ico">{icon}</span>
      <div className="pg-head-txt">
        <h2>{title}</h2>
        <p>{intro}</p>
      </div>
      {action && <div className="pg-head-action">{action}</div>}
    </div>
  )
}

/** Yellow-tint bar shown while providers are ticked for one request. */
export function SelectionBar({ count, cap, onContinue, onClear }: { count: number; cap: number; onContinue: () => void; onClear: () => void }) {
  return (
    <div className="pg-selbar" role="status">
      <span className="pg-selbar-count">{count} of {cap} providers selected</span>
      <span className="pg-selbar-note">Only selected providers will receive your request.</span>
      <span className="pg-selbar-actions">
        <button type="button" className="pg-link" onClick={onClear}>Clear</button>
        <button type="button" className="pg-btn pg-btn-yellow" onClick={onContinue}>
          Continue with {count} <ArrowIcon />
        </button>
      </span>
    </div>
  )
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="pg-empty">
      <SearchIcon size={28} />
      <p>{children}</p>
      {action}
    </div>
  )
}

/** Up to two initials from a name, e.g. "Yarra Catering Co" → "YC". */
export function initialsOf(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]
  return letters.toUpperCase()
}

export function InitialsAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return <span className={`pg-avatar pg-avatar-${size}`} aria-hidden="true">{initialsOf(name)}</span>
}
