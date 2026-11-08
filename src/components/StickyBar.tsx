import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

/**
 * The compact bar that pins under the header once a list page's top block
 * (figures, sub-tabs, filters) has scrolled away (design v2, owner's request
 * 8 Nov 2026). The page keeps its full controls at the top; the bar repeats
 * the ones worth having while scrolling - sub-tabs, search, the count - and
 * a "Back to top" link.
 *
 * `anchor` is the element whose bottom edge decides when the bar shows. The
 * bar is fixed under whatever sticky header the page has (.app-bar) and takes
 * the anchor's left edge and width, so it lines up with the content on the
 * dashboard and beside the admin side menu alike.
 */
export function StickyBar({ anchor, children }: { anchor: RefObject<HTMLElement | null>; children: ReactNode }) {
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    function measure() {
      raf.current = null
      const el = anchor.current
      if (!el) { setBox(null); return }
      const bar = document.querySelector('.app-bar')
      const top = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0
      const r = el.getBoundingClientRect()
      if (r.bottom < top + 8) setBox({ top, left: r.left, width: r.width })
      else setBox(null)
    }
    function onScroll() {
      if (raf.current === null) raf.current = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [anchor])

  if (!box) return null
  return (
    <div className="sb" style={{ top: box.top, left: box.left, width: box.width }} role="region" aria-label="List controls">
      <div className="sb-in">
        {children}
        <button type="button" className="sb-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top</button>
      </div>
    </div>
  )
}
