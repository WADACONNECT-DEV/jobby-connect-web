import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { InitialsAvatar } from './PageParts'

/* Display-only pieces for the Request quotes page (HANDOFF-request Part G).
   Styles: `rq-` in index.css. Nothing here calls the API: the photo picker
   only holds the chosen files until the page sends them. */

export const DocIcon = () => (
  <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h9l3 3v15H6z" />
    <path d="M9 9h6M9 13h6M9 17h3" />
    <path d="M18.5 14.5l2 2-2 2" stroke="#D9A400" strokeWidth="2" />
  </svg>
)

/** One numbered step of the form. */
export function SectionCard({ n, title, optional, children }: { n: number; title: string; optional?: boolean; children: ReactNode }) {
  const id = `rq-section-${n}`
  return (
    <section className="rq-card" aria-labelledby={id}>
      <h3 id={id} className="rq-card-title">
        <span className="rq-n" aria-hidden="true">{n}</span>
        {title}
        {optional && <span className="rq-optional">(optional)</span>}
      </h3>
      {children}
    </section>
  )
}

/* ---------- photos chosen before sending ---------- */

const ImageIcon = () => (
  <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="M21 16l-5-5-8 8" />
  </svg>
)

/**
 * Drop zone + thumbnails. Holds File objects only; the page uploads them after
 * the request is created. Type and size are decided by the server's image
 * rules at upload time (the limits can't be read before a job exists).
 */
export function PhotoPicker({ files, onAdd, onRemove, disabled }: {
  files: File[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement | null>(null)
  const [over, setOver] = useState(false)

  // Local previews; released when the list changes or the page closes.
  const [previews, setPreviews] = useState<(string | null)[]>([])
  useEffect(() => {
    const urls = files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null))
    setPreviews(urls)
    return () => urls.forEach((url) => url && URL.revokeObjectURL(url))
  }, [files])

  return (
    <div className="rq-photos">
      <div
        className={`rq-drop${over ? ' is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          if (!disabled && e.dataTransfer.files.length > 0) onAdd(Array.from(e.dataTransfer.files))
        }}
      >
        <ImageIcon />
        <strong>Add photos of the job</strong>
        <span>
          Drag photos here or{' '}
          <button type="button" className="pg-link" disabled={disabled} onClick={() => input.current?.click()}>
            choose files
          </button>{' '}
          · JPG, PNG or WebP
        </span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) onAdd(Array.from(e.target.files))
            e.target.value = ''
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="rq-thumbs" aria-label="Photos to send">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}-${i}`} className="rq-thumb">
              {previews[i] ? <img src={previews[i] as string} alt={f.name} /> : <span className="rq-thumb-name">{f.name}</span>}
              <button type="button" className="rq-thumb-x" aria-label={`Remove ${f.name}`} disabled={disabled} onClick={() => onRemove(i)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------- time frame ---------- */

export const TIME_FRAMES = ['As soon as possible', 'Within a week', 'Within 2 weeks', 'Within a month', 'Flexible']

/** Quick-pick chips that fill the same time-frame text; "Other…" shows the text box. */
export function TimeFrameChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const preset = TIME_FRAMES.includes(value)
  const [other, setOther] = useState(value !== '' && !preset)
  return (
    <div className="rq-timeframe">
      <div className="rq-chips" role="group" aria-label="Time frame">
        {TIME_FRAMES.map((t) => {
          const on = !other && value === t
          return (
            <button
              key={t}
              type="button"
              className={`rq-chip${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => { setOther(false); onChange(on ? '' : t) }}
            >
              {t}
            </button>
          )
        })}
        <button
          type="button"
          className={`rq-chip${other ? ' on' : ''}`}
          aria-pressed={other}
          onClick={() => {
            if (other) { setOther(false); onChange('') } else { setOther(true); if (preset) onChange('') }
          }}
        >
          Other…
        </button>
      </div>
      {other && (
        <input
          id="job-timeframe"
          aria-label="Time frame, in your own words"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. after 15 March"
        />
      )}
    </div>
  )
}

/* ---------- sidebar ---------- */

export function SendingTo({ names, onChange }: { names: string[]; onChange: () => void }) {
  return (
    <section className="rq-side-card" aria-labelledby="rq-sending">
      <h3 id="rq-sending">Sending to</h3>
      <ul className="rq-providers">
        {names.map((n, i) => (
          <li key={`${n}-${i}`}>
            <InitialsAvatar name={n} size="sm" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="pg-link rq-change" onClick={onChange}>← Change providers</button>
    </section>
  )
}

export function NextSteps({ note = true }: { note?: boolean }) {
  return (
    <div className="rq-next">
      <ol>
        <li><span className="rq-step-n" aria-hidden="true">1</span><span><strong>Providers are notified</strong> and send you their quote.</span></li>
        <li><span className="rq-step-n" aria-hidden="true">2</span><span><strong>Compare and accept</strong> one in Your Requests &amp; Jobs.</span></li>
        <li><span className="rq-step-n" aria-hidden="true">3</span><span><strong>Pay when it's done</strong>, then rate the job.</span></li>
      </ol>
      {note && (
        <p className="rq-earn">
          <span className="rq-earn-dot" aria-hidden="true" />
          <span>You'll earn <strong>Mate Points</strong> on this job when you rate it.</span>
        </p>
      )}
    </div>
  )
}
