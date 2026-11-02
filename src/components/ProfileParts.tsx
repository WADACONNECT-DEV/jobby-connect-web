import { type ReactNode, useEffect, useRef, useState } from 'react'
import { type MasterSuburb, type SiteTheme } from '../types'
import { CheckIcon } from './PageParts'

/*
 * Display-only pieces for the Provider Profile editor (HANDOFF-profile Part M).
 * Nothing here calls the API: each piece takes props and renders.
 */

/* ---------- section menu ---------- */

export interface SectionItem {
  key: number
  label: string
  /** "check" = complete, "premium" = premium badge, any other text = a count badge. */
  status?: 'check' | 'premium' | string
}

export function SectionMenu({ items, active, onPick }: { items: SectionItem[]; active: number; onPick: (key: number) => void }) {
  return (
    <nav className="pf-menu" aria-label="Profile sections">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className={`pf-menu-item${it.key === active ? ' on' : ''}`}
          aria-current={it.key === active ? 'step' : undefined}
          onClick={() => onPick(it.key)}
        >
          <span className="pf-menu-label">{it.label}</span>
          {it.status === 'check' && (
            <span className="pf-badge pf-badge-ok" aria-label="complete"><CheckIcon /></span>
          )}
          {it.status === 'premium' && <span className="pf-badge pf-badge-premium">PREMIUM</span>}
          {it.status && it.status !== 'check' && it.status !== 'premium' && (
            <span className="pf-badge pf-badge-count">{it.status}</span>
          )}
        </button>
      ))}
    </nav>
  )
}

/* ---------- section card ---------- */

export function SectionCard({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section className="pf-card">
      <h3 className="pf-card-title">{title}</h3>
      {intro && <p className="pf-card-intro">{intro}</p>}
      {children}
    </section>
  )
}

/* ---------- removable chip ---------- */

export function ChipX({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="pf-chip">
      {label}
      <button type="button" className="pf-chip-x" onClick={onRemove} aria-label={`Remove ${label}`}>×</button>
    </span>
  )
}

/* ---------- character counter ---------- */

export function CharCount({ value, max }: { value: string; max: number }) {
  return <span className={`pf-count${value.length > max ? ' over' : ''}`}>{value.length} / {max}</span>
}

/* ---------- suburb type-ahead over an already-loaded list ---------- */

const MAX_SUGGESTIONS = 8

/**
 * Type a few letters, pick a suburb. Searches only the `options` the page has
 * already loaded (one state at a time); it never fetches anything itself.
 */
export function SuburbAdd({ options, chosen, onPick, placeholder, id }: {
  options: MasterSuburb[]
  chosen: { has: (id: string) => boolean }
  onPick: (s: MasterSuburb) => void
  placeholder?: string
  id?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const q = query.trim().toLowerCase()
  const matches: MasterSuburb[] = []
  if (q) {
    const starts: MasterSuburb[] = []
    const contains: MasterSuburb[] = []
    for (const s of options) {
      if (chosen.has(s.id)) continue
      const name = s.name.toLowerCase()
      if (name.startsWith(q)) starts.push(s)
      else if (name.includes(q) || (s.postcode ?? '').startsWith(q)) contains.push(s)
      if (starts.length >= MAX_SUGGESTIONS) break
    }
    matches.push(...[...starts, ...contains].slice(0, MAX_SUGGESTIONS))
  }
  const show = open && matches.length > 0

  function choose(s: MasterSuburb) {
    onPick(s)
    setQuery('')
    setHighlight(0)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!show) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => (h + 1) % matches.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => (h - 1 + matches.length) % matches.length) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(matches[Math.min(highlight, matches.length - 1)]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="typeahead pf-typeahead" ref={boxRef}>
      <input
        id={id}
        value={query}
        autoComplete="off"
        placeholder={placeholder ?? 'Type a suburb or postcode'}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-autocomplete="list"
        aria-expanded={show}
      />
      {show && (
        <ul className="typeahead-list" role="listbox">
          {matches.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === highlight}
              className={`typeahead-item${i === highlight ? ' on' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); choose(s) }}
              onMouseEnter={() => setHighlight(i)}
            >
              <span className="typeahead-name">{s.name}</span>
              <span className="typeahead-sub">{s.state}{s.postcode ? ` ${s.postcode}` : ''}</span>
            </li>
          ))}
        </ul>
      )}
      {open && q && matches.length === 0 && (
        <p className="pf-hint">No match in this state. Check the spelling or change the state.</p>
      )}
    </div>
  )
}

/* ---------- theme swatch ---------- */

const SWATCH_NAMES: Record<SiteTheme, string> = {
  CLASSIC: 'Classic navy',
  COASTAL: 'Coastal teal',
  SLATE: 'Slate grey',
}

export function ThemeSwatch({ theme, on, onPick, note }: { theme: SiteTheme; on: boolean; onPick: () => void; note: string }) {
  return (
    <button type="button" className={`pf-swatch${on ? ' on' : ''}`} aria-pressed={on} onClick={onPick}>
      <span className={`pf-swatch-mini site-${theme.toLowerCase()}`} aria-hidden="true">
        <span className="pf-swatch-band" />
        <span className="pf-swatch-line" />
        <span className="pf-swatch-row" />
        <span className="pf-swatch-row short" />
      </span>
      <span className="pf-swatch-name">{SWATCH_NAMES[theme]}</span>
      <span className="pf-swatch-note">{note}</span>
    </button>
  )
}

/* ---------- right column: live preview + checklist ---------- */

export function ProfilePreview({ theme, name, industry, suburbs }: {
  theme: SiteTheme
  name: string
  industry: string | null
  suburbs: string[]
}) {
  const shown = suburbs.slice(0, 2)
  const more = suburbs.length - shown.length
  const meta = [
    industry,
    suburbs.length > 0 ? `${suburbs[0]}${suburbs.length > 1 ? ` +${suburbs.length - 1} suburbs` : ''}` : null,
  ].filter(Boolean).join(' · ')
  return (
    <div className={`pf-preview site-${theme.toLowerCase()}`}>
      <div className="pf-preview-band">
        <div className="pf-preview-name">{name.trim() || 'Your business name'}</div>
        <div className="pf-preview-meta">{meta || 'Your industry · your suburbs'}</div>
      </div>
      <div className="pf-preview-body">
        <p>Live preview of your public page header and chips.</p>
        {suburbs.length > 0 && (
          <div className="pf-preview-chips">
            {shown.map((s) => <span key={s} className="pf-mini-chip">{s}</span>)}
            {more > 0 && <span className="pf-mini-chip">+{more}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export function ProfileChecklist({ items }: { items: { label: string; done: boolean }[] }) {
  return (
    <div className="pf-checklist">
      <div className="pf-checklist-head">Profile checklist</div>
      <ul>
        {items.map((it) => (
          <li key={it.label} className={it.done ? 'done' : 'todo'}>
            <span className="pf-check-ico" aria-hidden="true">{it.done ? <CheckIcon /> : '!'}</span>
            {it.label}
            <span className="pg-sr">{it.done ? ' (done)' : ' (to do)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- premium (locked preview, nothing saves) ---------- */

const PREMIUM_TILES = [
  { title: 'Logo', sub: 'A square logo instead of your initials' },
  { title: 'Hero photo', sub: 'A large photo with your headline' },
  { title: 'Service photos & descriptions', sub: 'A card for each service you offer' },
  { title: 'Gallery', sub: 'Photos of your work on About Us' },
  { title: 'Highlights', sub: 'Up to 4, e.g. "11+ years in business"' },
]

export function PremiumLocked() {
  return (
    <div className="pf-premium">
      <div className="pf-premium-top">
        <span className="pf-badge pf-badge-premium">PREMIUM</span>
        <span className="pf-soon">Coming soon</span>
      </div>
      <p className="pf-card-intro">
        A Premium profile adds photos and highlights to your public page. You can't add them yet. This is a preview
        of what's coming.
      </p>
      <ul className="pf-premium-tiles">
        {PREMIUM_TILES.map((t) => (
          <li key={t.title} className="pf-premium-tile">
            <span className="pf-lock" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </span>
            <span>
              <strong>{t.title}</strong>
              <span className="pf-premium-sub">{t.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
