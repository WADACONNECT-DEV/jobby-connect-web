import type { ReactNode } from 'react'
import { Icon } from './PageParts'

/* Display-only pieces for Your Work (HANDOFF-provider Part L).
   Styles: `pw-` in index.css. Nothing here calls the API or decides what a
   job needs next; the page passes the words and buttons in. */

export const ToolboxIcon = () => (
  <Icon size={40} width={1.8}>
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
    <path d="M10 13v2h4v-2" stroke="#D9A400" />
  </Icon>
)

/** One-line "where this job is" note. Yellow when it needs the provider. */
export function StateLine({ attention, children }: { attention: boolean; children: ReactNode }) {
  return (
    <p className={`pw-state${attention ? ' is-attention' : ''}`}>
      <span className="pw-state-dot" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/** A labelled block inside a job card (progress, photos, completion). */
export function WorkSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pw-section">
      <h4>{title}</h4>
      {children}
    </section>
  )
}
