// Percentage-complete indicator (spec §2.6). Used on both sides: the provider
// sets the figure, the customer sees the same one.

interface Props {
  percent: number
  /** Shown under the bar, e.g. when the figure was last updated. */
  caption?: string
}

export function ProgressBar({ percent, caption }: Props) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className="prog-wrap">
      <div className="prog-head">
        <span className="prog-label">Progress</span>
        <span className="prog-pct">{value}%</span>
      </div>
      <div
        className="prog-bar"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Job progress"
      >
        <span className={`prog-fill${value >= 100 ? ' full' : ''}`} style={{ width: `${value}%` }} />
      </div>
      {caption && <div className="prog-caption">{caption}</div>}
    </div>
  )
}
