// Shared list-view state for every dashboard box (filter, sort, search and
// which rows are expanded).
//
// UAT Round 1 §5.3 requires that leaving a screen and coming Back preserves
// whatever filter, sort and view/hide state the user had set — on EVERY box,
// across both the Customer tab and the Provider tab. That rules out holding
// this in a page's useState, because React throws it away the moment the route
// unmounts. So it lives here instead, keyed by box, and is mirrored into
// sessionStorage so a browser reload or a real Back navigation keeps it too.
//
// Used by: customer Jobby Mates, customer Requests & Jobs, provider Requests
// to Me, provider Your Quotes, and the Expired/Replied/Wins/Lost tabs.

import { useEffect, useState } from 'react'

const PREFIX = 'jobby_view:'
const VALUE_PREFIX = 'jobby_pref:'

export type SortDir = 'asc' | 'desc'

export interface ListView {
  search: string
  /** Filter key -> selected value. An empty string means "all". */
  filters: Record<string, string>
  sortKey: string
  sortDir: SortDir
  /** Row ids currently expanded via a View/Hide toggle. */
  expanded: string[]
}

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDef<T> {
  key: string
  label: string
  /** Options are derived from the rows, so a filter never offers a value that isn't present. */
  options: (rows: T[]) => FilterOption[]
  match: (row: T, value: string) => boolean
}

export interface SortDef<T> {
  key: string
  label: string
  /** Ascending comparison. The hook applies the direction. */
  compare: (a: T, b: T) => number
  /** Direction to use when this sort is first picked. Defaults to 'asc'. */
  defaultDir?: SortDir
}

export interface ListViewOptions<T> {
  filters?: FilterDef<T>[]
  sorts?: SortDef<T>[]
  /** Free-text haystack for the search box. Omit to hide the box entirely. */
  search?: (row: T) => string
  defaultSortKey?: string
  defaultSortDir?: SortDir
}

export interface ListViewApi<T> {
  view: ListView
  /** Filters with their options already resolved against the current rows. */
  filters: { key: string; label: string; options: FilterOption[] }[]
  sorts: { key: string; label: string }[]
  hasSearch: boolean
  /** Rows after search + filters + sort. */
  visible: T[]
  total: number
  shown: number
  /** True when anything is set, so a Clear control can be shown. */
  dirty: boolean
  setSearch: (value: string) => void
  setFilter: (key: string, value: string) => void
  setSort: (key: string) => void
  toggleDir: () => void
  clear: () => void
  isExpanded: (id: string) => boolean
  toggleExpanded: (id: string) => void
  setExpanded: (id: string, open: boolean) => void
  collapseAll: () => void
}

/* ---------------- store ---------------- */

// In-memory cache keeps state across route changes without a sessionStorage
// round trip; sessionStorage is the backstop for reloads and browser Back.
const cache = new Map<string, ListView>()
const valueCache = new Map<string, string>()

export function readView(boxKey: string, fallback: ListView): ListView {
  const cached = cache.get(boxKey)
  if (cached) return cached
  try {
    const raw = sessionStorage.getItem(PREFIX + boxKey)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ListView>
      const merged: ListView = {
        search: typeof parsed.search === 'string' ? parsed.search : fallback.search,
        filters: { ...fallback.filters, ...(parsed.filters ?? {}) },
        sortKey: typeof parsed.sortKey === 'string' ? parsed.sortKey : fallback.sortKey,
        sortDir: parsed.sortDir === 'asc' || parsed.sortDir === 'desc' ? parsed.sortDir : fallback.sortDir,
        expanded: Array.isArray(parsed.expanded) ? parsed.expanded : fallback.expanded,
      }
      cache.set(boxKey, merged)
      return merged
    }
  } catch {
    // storage unavailable or corrupt — fall through to the default view
  }
  cache.set(boxKey, fallback)
  return fallback
}

export function writeView(boxKey: string, view: ListView): void {
  cache.set(boxKey, view)
  try {
    sessionStorage.setItem(PREFIX + boxKey, JSON.stringify(view))
  } catch {
    // storage full or blocked — the in-memory cache still holds the state
  }
}

/** Wipe every saved box view. Call on sign-out so one user's filters don't greet the next. */
export function clearViews(): void {
  cache.clear()
  valueCache.clear()
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.startsWith(PREFIX) || key.startsWith(VALUE_PREFIX))) keys.push(key)
    }
    keys.forEach((key) => sessionStorage.removeItem(key))
  } catch {
    // nothing to clean up
  }
}

/* ---------------- comparators & option builders ---------------- */

export function byText<T>(pick: (row: T) => string | null | undefined) {
  return (a: T, b: T) => (pick(a) ?? '').localeCompare(pick(b) ?? '')
}

export function byNumber<T>(pick: (row: T) => number | null | undefined) {
  return (a: T, b: T) => (pick(a) ?? 0) - (pick(b) ?? 0)
}

export function byDate<T>(pick: (row: T) => string | null | undefined) {
  return (a: T, b: T) => {
    const left = Date.parse(pick(a) ?? '')
    const right = Date.parse(pick(b) ?? '')
    return (Number.isNaN(left) ? 0 : left) - (Number.isNaN(right) ? 0 : right)
  }
}

/**
 * Builds a filter's options from the rows themselves: every distinct non-empty
 * value, labelled and sorted. Keeps a filter honest — it can only offer values
 * the user can actually see.
 */
export function optionsFrom<T>(
  pick: (row: T) => string | null | undefined,
  label?: (value: string) => string,
) {
  return (rows: T[]): FilterOption[] => {
    const seen = new Set<string>()
    rows.forEach((row) => {
      const value = pick(row)
      if (value) seen.add(value)
    })
    return Array.from(seen)
      .map((value) => ({ value, label: label ? label(value) : value }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }
}

/* ---------------- hooks ---------------- */

/**
 * A single remembered choice — which tab is open, for instance. Same persistence
 * rules as the box views above, so Back lands the user where they left off, and
 * cleared by the same clearViews() on sign-out.
 */
export function usePersistedValue<T extends string>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const cached = valueCache.get(key)
    if (cached !== undefined) return cached as T
    try {
      const raw = sessionStorage.getItem(VALUE_PREFIX + key)
      if (raw) {
        valueCache.set(key, raw)
        return raw as T
      }
    } catch {
      // storage unavailable - fall back to the initial value
    }
    return initial
  })

  function update(next: T) {
    valueCache.set(key, next)
    try {
      sessionStorage.setItem(VALUE_PREFIX + key, next)
    } catch {
      // in-memory cache still holds it
    }
    setValue(next)
  }

  return [value, update]
}

export function useListView<T>(
  boxKey: string,
  rows: T[] | null,
  options: ListViewOptions<T>,
): ListViewApi<T> {
  const filterDefs = options.filters ?? []
  const sortDefs = options.sorts ?? []

  function defaultView(): ListView {
    const firstSort = sortDefs[0]
    return {
      search: '',
      filters: Object.fromEntries(filterDefs.map((f) => [f.key, ''])),
      sortKey: options.defaultSortKey ?? firstSort?.key ?? '',
      sortDir: options.defaultSortDir ?? firstSort?.defaultDir ?? 'desc',
      expanded: [],
    }
  }

  const [view, setView] = useState<ListView>(() => readView(boxKey, defaultView()))

  // Switching box (e.g. between the provider outcome tabs) swaps in that box's
  // own saved state rather than carrying the previous one across.
  useEffect(() => {
    setView(readView(boxKey, defaultView()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxKey])

  function update(next: ListView) {
    writeView(boxKey, next)
    setView(next)
  }

  const source = rows ?? []

  let visible = source
  const query = view.search.trim().toLowerCase()
  if (query && options.search) {
    visible = visible.filter((row) => options.search!(row).toLowerCase().includes(query))
  }
  filterDefs.forEach((def) => {
    const value = view.filters[def.key]
    if (value) visible = visible.filter((row) => def.match(row, value))
  })
  const activeSort = sortDefs.find((s) => s.key === view.sortKey)
  if (activeSort) {
    const direction = view.sortDir === 'asc' ? 1 : -1
    visible = [...visible].sort((a, b) => activeSort.compare(a, b) * direction)
  }

  const dirty =
    view.search.trim() !== '' || filterDefs.some((def) => Boolean(view.filters[def.key]))

  return {
    view,
    filters: filterDefs.map((def) => ({
      key: def.key,
      label: def.label,
      options: def.options(source),
    })),
    sorts: sortDefs.map((def) => ({ key: def.key, label: def.label })),
    hasSearch: Boolean(options.search),
    visible,
    total: source.length,
    shown: visible.length,
    dirty,
    setSearch: (value) => update({ ...view, search: value }),
    setFilter: (key, value) => update({ ...view, filters: { ...view.filters, [key]: value } }),
    setSort: (key) => {
      const def = sortDefs.find((s) => s.key === key)
      update({ ...view, sortKey: key, sortDir: def?.defaultDir ?? 'asc' })
    },
    toggleDir: () => update({ ...view, sortDir: view.sortDir === 'asc' ? 'desc' : 'asc' }),
    clear: () => update({ ...defaultView(), expanded: view.expanded }),
    isExpanded: (id) => view.expanded.includes(id),
    toggleExpanded: (id) =>
      update({
        ...view,
        expanded: view.expanded.includes(id)
          ? view.expanded.filter((x) => x !== id)
          : [...view.expanded, id],
      }),
    setExpanded: (id, open) =>
      update({
        ...view,
        expanded: open
          ? Array.from(new Set([...view.expanded, id]))
          : view.expanded.filter((x) => x !== id),
      }),
    collapseAll: () => update({ ...view, expanded: [] }),
  }
}
