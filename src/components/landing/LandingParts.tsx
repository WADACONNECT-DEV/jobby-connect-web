/**
 * Building blocks shared by the two landing pages — Customers (`/`) and
 * Providers (`/for-providers`), owner's Version 3 design, 30 Oct 2026.
 *
 * Both pages use the same layout with different colours, so the colours come
 * from the page's root class (`lp-customer` / `lp-provider`, see index.css) and
 * these components only lay things out.
 */
import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FlowArrowDown, FlowArrowLeft, FlowArrowRight, Pause, Play } from './landingIcons'

export type LandingTheme = 'customer' | 'provider'

/** 5 s per slide, the first held 2 s longer (owner decision). */
const SLIDE_MS = 5000
const FIRST_SLIDE_EXTRA_MS = 2000

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/* In-page links                                                       */
/* ------------------------------------------------------------------ */

/**
 * A link to a section further down the same page.
 *
 * Keeps a real `href="#id"` so it still works without JavaScript and in a new
 * tab, but scrolls in place rather than letting the router see a hash change.
 * Focus moves to the section so keyboard and screen-reader users land there
 * too. No smooth scrolling for visitors who have asked for reduced motion.
 */
export function ScrollLink({ to, className, children, ariaCurrent }: {
  to: string
  className?: string
  children: ReactNode
  ariaCurrent?: boolean
}) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById(to)
    if (!target) return
    e.preventDefault()
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    target.focus({ preventScroll: true })
  }
  return (
    <a href={`#${to}`} className={className} onClick={onClick} aria-current={ariaCurrent ? 'page' : undefined}>
      {children}
    </a>
  )
}

/* ------------------------------------------------------------------ */
/* Top navigation                                                      */
/* ------------------------------------------------------------------ */

/**
 * The landing pages' own top bar — they don't use the app's site header.
 *
 * "How it works" and the active half of the pill scroll to the page's own
 * section (For customers / For providers, id "get"); the
 * other half of the pill opens the other landing page.
 */
export function LandingNav({ theme }: { theme: LandingTheme }) {
  const pro = theme === 'provider'
  return (
    <header className="lp-nav">
      <nav aria-label="Main" className="lp-nav-in">
        <Link to="/" className="lp-brand">
          <span className="lp-brand-j" aria-hidden="true">J</span>
          <span className="lp-brand-name">Jobby-Connect</span>
          {pro && <span className="lp-brand-badge">Providers</span>}
        </Link>

        <div className="lp-nav-mid">
          {/* Goes to this page's own section: "For customers" here, "For providers" on the providers page. */}
          <ScrollLink to="get" className="lp-nav-link">How it works</ScrollLink>
          <span className="lp-pill">
            {pro ? (
              <>
                <Link to="/" className="lp-pill-item">For customers</Link>
                <ScrollLink to="get" className="lp-pill-item is-on" ariaCurrent>For providers</ScrollLink>
              </>
            ) : (
              <>
                <ScrollLink to="get" className="lp-pill-item is-on" ariaCurrent>For customers</ScrollLink>
                <Link to="/for-providers" className="lp-pill-item">For providers</Link>
              </>
            )}
          </span>
        </div>

        <div className="lp-nav-end">
          <Link to="/login" className="lp-nav-login">{pro ? 'Provider log in' : 'Log in'}</Link>
          <Link to="/register" className="lp-btn lp-btn-sm lp-nav-cta">
            {pro ? 'Start as a provider' : 'Create a free account'}
          </Link>
        </div>
      </nav>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

/** Small capitals label with the short yellow rule under it. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`lp-eyebrow ${className}`}>
      <span>{children}</span>
      <span className="lp-rule" aria-hidden="true" />
    </div>
  )
}

/** Icon in a circle, a bold line and a supporting line. */
export function Feature({ icon, title, children, size = 'slide' }: {
  icon: ReactNode
  title: string
  children: ReactNode
  size?: 'slide' | 'card'
}) {
  return (
    <div className={`lp-feat lp-feat-${size}`}>
      <span className="lp-feat-ico">{icon}</span>
      <span className="lp-feat-text">
        <strong>{title}</strong>
        <br />
        <span className="lp-muted">{children}</span>
      </span>
    </div>
  )
}

/** Numbered badge (01–04) and heading at the top of a slide or a card. */
export function NumberedHead({ n, title, as = 'h3' }: { n: string; title: string; as?: 'h2' | 'h3' }) {
  const Heading = as
  return (
    <div className="lp-numhead">
      <span className="lp-num" aria-hidden="true">{n}</span>
      <Heading className={as === 'h2' ? 'lp-slide-title' : 'lp-card-title'}>{title}</Heading>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Summary slide: four steps in a loop                                 */
/* ------------------------------------------------------------------ */

export interface FlowStep {
  icon: ReactNode
  title: string
  sub: string
}

/**
 * Four steps laid out clockwise: 1 → 2 on top, ↓, then 4 ← 3 underneath —
 * so the eye travels round the loop in order.
 */
export function StepFlow({ steps }: { steps: [FlowStep, FlowStep, FlowStep, FlowStep] }) {
  const tile = (s: FlowStep, n: number) => (
    <div className="lp-flow-tile">
      <span className="lp-flow-n" aria-hidden="true">{n}</span>
      {s.icon}
      <span className="lp-flow-title">{s.title}</span>
      <span className="lp-flow-sub">{s.sub}</span>
    </div>
  )
  return (
    <div className="lp-flow">
      {tile(steps[0], 1)}
      <FlowArrowRight />
      {tile(steps[1], 2)}
      <span /><span />
      <FlowArrowDown />
      {tile(steps[3], 4)}
      <FlowArrowLeft />
      {tile(steps[2], 3)}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Slide bodies                                                        */
/* ------------------------------------------------------------------ */

/** Slides 2–5: numbered heading, a picture of the feature, two features. */
export function StepSlide({ n, title, picture, children }: {
  n: string
  title: string
  picture: ReactNode
  children: ReactNode
}) {
  return (
    <div className="lp-step-slide">
      <NumberedHead n={n} title={title} as="h2" />
      {picture}
      <div className="lp-feats">{children}</div>
    </div>
  )
}

/** Slides 6–9: a full-bleed photo with a small caption pill. */
export function PhotoSlide({ src, alt, position, tag }: { src: string; alt: string; position: string; tag: string }) {
  return (
    <figure className="lp-photo">
      <img src={src} alt={alt} style={{ objectPosition: position }} />
      <figcaption className="lp-photo-tag"><span className="lp-dot" aria-hidden="true" />{tag}</figcaption>
    </figure>
  )
}

/* ------------------------------------------------------------------ */
/* The hero slideshow                                                  */
/* ------------------------------------------------------------------ */

export interface Slide {
  label: string
  content: ReactNode
}

/**
 * The 9-slide box in the hero: an overview, four steps, four photos.
 *
 * Plays on its own (5 s a slide, the first held 2 s longer), with previous /
 * pause / next and one progress segment per slide that jumps straight to it.
 * Never moves for visitors who have asked for reduced motion.
 *
 * The caption is announced to screen readers only while paused — announcing
 * every automatic change would talk over whatever else they are reading.
 */
export function Slideshow({ id, title, slides }: { id: string; title: string; slides: Slide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = slides.length

  const go = useCallback((k: number) => setIndex(((k % count) + count) % count), [count])

  useEffect(() => {
    if (paused || prefersReducedMotion()) return
    const ms = index === 0 ? SLIDE_MS + FIRST_SLIDE_EXTRA_MS : SLIDE_MS
    const timer = window.setTimeout(() => go(index + 1), ms)
    return () => window.clearTimeout(timer)
  }, [index, paused, go])

  const current = slides[index]
  const titleCase = title.charAt(0) + title.slice(1).toLowerCase()

  return (
    <div id={id} tabIndex={-1} className="lp-show" role="region" aria-roledescription="carousel" aria-label={titleCase}>
      <div className="lp-show-head">
        <Eyebrow className="lp-eyebrow-strong">{title}</Eyebrow>
        <div className="lp-show-ctrls">
          <button type="button" className="lp-ctrl" aria-label="Previous slide" onClick={() => go(index - 1)}>
            <ChevronLeft />
          </button>
          <button type="button" className="lp-ctrl" aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
            onClick={() => setPaused((p) => !p)}>
            {paused ? <Play /> : <Pause />}
          </button>
          <button type="button" className="lp-ctrl" aria-label="Next slide" onClick={() => go(index + 1)}>
            <ChevronRight />
          </button>
        </div>
      </div>

      <div className="lp-segs">
        {slides.map((s, k) => (
          <button
            key={s.label}
            type="button"
            className="lp-seg"
            style={{ flex: k === 0 ? '1.6' : k < 5 ? '1.2' : '0.7' }}
            aria-label={`Go to slide ${k + 1}: ${s.label}`}
            aria-current={k === index ? 'step' : undefined}
            onClick={() => go(k)}
          >
            <span className={`lp-seg-bar${k === index ? ' is-on' : k < index ? ' is-done' : ''}`} />
          </button>
        ))}
      </div>
      <span className="lp-caption" aria-live={paused ? 'polite' : 'off'}>
        {index + 1} of {count} · {current.label}
      </span>

      <div className="lp-stage">
        {/* Keyed by slide so the entrance animation replays on every change. */}
        <div key={index} className="lp-slide">{current.content}</div>
      </div>
    </div>
  )
}
