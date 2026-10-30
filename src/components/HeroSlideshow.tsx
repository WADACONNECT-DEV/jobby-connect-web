import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type Slide = {
  /** Shown in the caption ("3 of 9 · label") and on the progress segment. */
  label: string
  content: ReactNode
  /** Relative width of this slide's progress segment. */
  weight?: number
}

type Props = {
  id?: string
  title: string
  ariaLabel: string
  slides: Slide[]
  slideMs?: number
  /** Extra time the first slide stays up. */
  firstExtraMs?: number
}

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion() {
  try {
    return window.matchMedia(REDUCE_QUERY).matches
  } catch {
    return false
  }
}

/* The rotating box in the landing-page hero. Display only: the only state is
   which slide is showing and whether it's paused. Visitors who ask for reduced
   motion start paused and get no slide-in animation. */
export function HeroSlideshow({ id, title, ariaLabel, slides, slideMs = 5000, firstExtraMs = 2000 }: Props) {
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(prefersReducedMotion)

  // Follow the reduced-motion setting if it changes while the page is open.
  useEffect(() => {
    let mq: MediaQueryList
    try {
      mq = window.matchMedia(REDUCE_QUERY)
    } catch {
      return
    }
    const onChange = () => {
      if (mq.matches) setPaused(true)
    }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  // Auto-advance.
  useEffect(() => {
    if (paused) return
    const ms = index === 0 ? slideMs + firstExtraMs : slideMs
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), ms)
    return () => window.clearTimeout(t)
  }, [index, paused, count, slideMs, firstExtraMs])

  const go = (n: number) => setIndex(((n % count) + count) % count)

  return (
    <div id={id} role="region" aria-roledescription="carousel" aria-label={ariaLabel} className="lp-show">
      <div className="lp-show-head">
        <div className="lp-eyebrow lp-eyebrow--strong">
          <span>{title}</span>
          <span className="lp-rule" aria-hidden="true" />
        </div>
        <div className="lp-ctrls">
          <button type="button" className="lp-ctrl" aria-label="Previous slide" onClick={() => go(index - 1)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button
            type="button"
            className="lp-ctrl"
            aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? (
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z" /></svg>
            ) : (
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            )}
          </button>
          <button type="button" className="lp-ctrl" aria-label="Next slide" onClick={() => go(index + 1)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      <div className="lp-segs">
        {slides.map((s, k) => (
          <button
            key={k}
            type="button"
            className={'lp-seg' + (k === index ? ' is-current' : k < index ? ' is-done' : '')}
            style={{ flexGrow: s.weight ?? 1 }}
            aria-label={`Go to slide ${k + 1}: ${s.label}`}
            aria-current={k === index ? 'true' : undefined}
            onClick={() => go(k)}
          >
            <span />
          </button>
        ))}
      </div>
      {/* Only announced while paused, so screen readers aren't interrupted
          every few seconds by the auto-advance. */}
      <span className="lp-caption" aria-live={paused ? 'polite' : 'off'}>
        {index + 1} of {count} · {slides[index].label}
      </span>

      <div className="lp-stage">
        <div
          key={index}
          className="lp-slide"
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${count}`}
        >
          {slides[index].content}
        </div>
      </div>
    </div>
  )
}
