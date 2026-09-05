import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { type MasterSuburb } from '../types'

/**
 * Suburb input with predictive filtering (UAT Round 2 §5.2): typing "Pa" surfaces
 * Pakenham and anything else that matches, so the customer picks instead of
 * spelling it out.
 *
 * Suggestions come from the admin-maintained master suburb list, but the field
 * stays free text — a customer whose suburb hasn't been added to master data yet
 * must still be able to send a request. Only the suburb NAME is stored, which is
 * what the job record has always held, so nothing downstream changes.
 *
 * The list is fetched once per session and shared by every instance.
 */

let suburbCache: Promise<MasterSuburb[]> | null = null

function loadSuburbs(): Promise<MasterSuburb[]> {
  if (!suburbCache) {
    suburbCache = api<MasterSuburb[]>('/master/suburbs', 'GET').catch(() => [])
  }
  return suburbCache
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
}

const MAX_SUGGESTIONS = 8

export function SuburbPicker({ value, onChange, placeholder, id }: Props) {
  const [all, setAll] = useState<MasterSuburb[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    loadSuburbs().then((rows) => { if (alive) setAll(rows.filter((s) => s.active)) })
    return () => { alive = false }
  }, [])

  // Clicking anywhere else closes the suggestions.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const query = value.trim().toLowerCase()
  const matches = query.length === 0 ? [] : (() => {
    const starts: MasterSuburb[] = []
    const contains: MasterSuburb[] = []
    for (const s of all) {
      const name = s.name.toLowerCase()
      if (name.startsWith(query)) starts.push(s)
      else if (name.includes(query) || (s.postcode ?? '').startsWith(query)) contains.push(s)
      if (starts.length >= MAX_SUGGESTIONS) break
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS)
  })()

  // An exact match means they've already chosen it — no need to keep nagging.
  const exact = matches.length === 1 && matches[0].name.toLowerCase() === query
  const show = open && matches.length > 0 && !exact

  function choose(s: MasterSuburb) {
    onChange(s.name)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!show) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(matches[Math.min(highlight, matches.length - 1)])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="typeahead" ref={boxRef}>
      <input
        id={id}
        value={value}
        autoComplete="off"
        placeholder={placeholder ?? 'e.g. Pakenham'}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(0) }}
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
    </div>
  )
}
