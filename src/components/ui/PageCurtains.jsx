/* ── page curtains ───────────────────────────────────────────────
 * Panels cover the viewport on first paint and sweep up in sequence,
 * uncovering the page.
 *
 * Two rules it has to obey to stay out of the way:
 *  - it never blocks input, even mid-sweep (pointer-events: none), and
 *    it unmounts once the last panel has left;
 *  - under prefers-reduced-motion it renders nothing at all. Skipping
 *    only the animation would leave the panels sitting over the page
 *    forever, which is worse than not having the effect.
 * ─────────────────────────────────────────────────────────────── */

import * as React from 'react'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/**
 * @param panels   Number of vertical panels.
 * @param duration Milliseconds for one panel to clear the viewport.
 * @param stagger  Milliseconds between one panel starting and the next.
 */
export function PageCurtains({ panels = 4, duration = 850, stagger = 90, className }) {
  // Start "done" when motion is reduced, so nothing is ever painted over
  // the page. Read during the initial state so there is no covered frame.
  const [done, setDone] = React.useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  React.useEffect(() => {
    if (done) return
    const total = duration + stagger * (panels - 1) + 60
    const timer = setTimeout(() => setDone(true), total)
    return () => clearTimeout(timer)
  }, [done, duration, stagger, panels])

  if (done) return null

  return (
    <div className={cx('curtains', className)} aria-hidden>
      {Array.from({ length: panels }, (_, i) => (
        <span
          key={i}
          style={{
            animationDuration: `${duration}ms`,
            animationDelay: `${i * stagger}ms`,
          }}
        />
      ))}
    </div>
  )
}

export default PageCurtains
