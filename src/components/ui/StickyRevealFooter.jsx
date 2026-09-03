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

export function StickyRevealFooter({ children, className }) {
  const ref = React.useRef(null)
  const [height, setHeight] = React.useState(0)

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Holds the footer's place in the flow so the page can scroll clear of it. */}
      <div aria-hidden className="sticky-reveal__spacer" style={{ height }} />
      <div ref={ref} className={cx('sticky-reveal', className)}>
        {children}
      </div>
    </>
  )
}

export default StickyRevealFooter
