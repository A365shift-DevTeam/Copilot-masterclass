/* ── sticky reveal footer ────────────────────────────────────────
 * The footer sits pinned to the bottom of the viewport *behind* the
 * page, which scrolls over it on an opaque background. Only at the end
 * of the scroll does the page clear it, so the footer is uncovered
 * rather than scrolled into view.
 *
 * Two things make it work, and both are load-bearing:
 *  - the page content needs an opaque background and a stacking context
 *    above the footer, or the footer shows through the whole time;
 *  - the footer is out of flow, so its height has to be reserved by a
 *    spacer or the last section runs under it and can never be read.
 *
 * The spacer is measured rather than hard-coded, because the footer
 * rewraps at narrow widths and a fixed number would be wrong there.
 * ─────────────────────────────────────────────────────────────── */

import * as React from 'react'

const cx = (...parts) => parts.filter(Boolean).join(' ')

const useIsoLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

/**
 * @param maxViewportShare How much of the viewport the footer may occupy and
 *   still be worth pinning. Past this it goes back into normal flow, because a
 *   footer taller than the screen can never be fully revealed and would just
 *   sit behind the page eating height.
 */
export function StickyRevealFooter({ children, className, maxViewportShare = 0.7 }) {
  const ref = React.useRef(null)
  const [height, setHeight] = React.useState(0)
  const [pinned, setPinned] = React.useState(true)

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const h = el.offsetHeight
      setHeight(h)
      setPinned(h <= window.innerHeight * maxViewportShare)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    // The share depends on viewport height, which a resize can change without
    // the footer's own box changing at all.
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [maxViewportShare])

  return (
    <>
      {/* Holds the footer's place in the flow so the page can scroll clear of it.
          Only needed while the footer is out of flow. */}
      {pinned && <div aria-hidden className="sticky-reveal__spacer" style={{ height }} />}
      <div ref={ref} className={cx('sticky-reveal', pinned && 'is-pinned', className)}>
        {children}
      </div>
    </>
  )
}

export default StickyRevealFooter
