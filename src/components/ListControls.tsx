// The one filter/sort bar used by every dashboard box, so the controls look
// and behave identically on the customer and provider sides (UAT Round 1
// §3.1, §3.2, §5.1, §5.2). Driven entirely by the useListView hook — a page
// declares its filters and sorts, then renders this.

import { type ListViewApi } from '../listView'

interface Props<T> {
  list: ListViewApi<T>
  /** Placeholder for the search box. Ignored when the list has no search. */
  searchPlaceholder?: string
  /** Noun for the "x of y" counter, e.g. "requests". */
  countLabel?: string
}

export function ListControls<T>({ list, searchPlaceholder, countLabel }: Props<T>) {
  if (list.total === 0) return null

  return (
    <div className="lv-bar">
      {list.hasSearch && (
        <input
          className="lv-search"
          type="search"
          value={list.view.search}
          placeholder={searchPlaceholder ?? 'Search'}
          aria-label={searchPlaceholder ?? 'Search'}
          onChange={(e) => list.setSearch(e.target.value)}
        />
      )}

      {list.filters.map((filter) => (
        <select
          key={filter.key}
          className="lv-select"
          value={list.view.filters[filter.key] ?? ''}
          aria-label={filter.label}
          onChange={(e) => list.setFilter(filter.key, e.target.value)}
        >
          <option value="">All {filter.label.toLowerCase()}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ))}

      {list.sorts.length > 0 && (
        <span className="lv-sort">
          <select
            className="lv-select"
            value={list.view.sortKey}
            aria-label="Sort by"
            onChange={(e) => list.setSort(e.target.value)}
          >
            {list.sorts.map((sort) => (
              <option key={sort.key} value={sort.key}>{sort.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="lv-dir"
            aria-label={list.view.sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
            title={list.view.sortDir === 'asc' ? 'Lowest first' : 'Highest first'}
            onClick={list.toggleDir}
          >
            {list.view.sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </span>
      )}

      <span className="lv-count">
        {list.shown === list.total
          ? `${list.total} ${countLabel ?? ''}`.trim()
          : `${list.shown} of ${list.total} ${countLabel ?? ''}`.trim()}
      </span>

      {list.dirty && (
        <button type="button" className="lv-clear" onClick={list.clear}>Clear filters</button>
      )}
    </div>
  )
}
