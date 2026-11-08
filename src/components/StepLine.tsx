/**
 * The job's five steps on one line (design v2, 8 Nov 2026):
 * Quote accepted → Started → Marked complete → Paid → Reviewed.
 *
 * `done` is how many steps are finished; the next one is "now". Used on the
 * customer's job cards and the provider's quote cards, so both sides read the
 * same line for the same job.
 */
export const JOB_STEPS = ['Quote accepted', 'Started', 'Marked complete', 'Paid', 'Reviewed'] as const

export function StepLine({ done, labels = JOB_STEPS as readonly string[] }: { done: number; labels?: readonly string[] }) {
  return (
    <span className="v2-steps" aria-label={`${labels[Math.min(done, labels.length) - 1] ?? 'Not started'}${done < labels.length ? `, next: ${labels[done]}` : ''}`}>
      {labels.map((label, i) => (
        <span key={label} className={`v2-step${i < done ? ' is-done' : i === done ? ' is-now' : ''}`}>
          <i aria-hidden="true" />
          <b>{label}</b>
        </span>
      ))}
    </span>
  )
}

/** A row of small figures at the top of a page: label over value. */
export function StatCards({ items }: { items: { label: string; value: string; tone?: 'hi' | 'pos' | 'neg' }[] }) {
  return (
    <div className="v2-stats" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((s) => (
        <div key={s.label} className={`v2-stat${s.tone === 'hi' ? ' is-hi' : ''}`}>
          <span>{s.label}</span>
          <strong className={s.tone === 'pos' ? 'is-pos' : s.tone === 'neg' ? 'is-neg' : ''}>{s.value}</strong>
        </div>
      ))}
    </div>
  )
}
