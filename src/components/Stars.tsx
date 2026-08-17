// Read-only star display.
export function Stars({ value, className = '' }: { value: number; className?: string }) {
  const full = Math.round(value)
  return (
    <span className={`stars ${className}`} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= full ? 'star on' : 'star'}>
          ★
        </span>
      ))}
    </span>
  )
}

// Interactive star picker for the review form.
export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span className="stars stars-input">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= value ? 'star on' : 'star'}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </span>
  )
}
