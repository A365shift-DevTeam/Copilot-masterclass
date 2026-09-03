/* ── border beam ─────────────────────────────────────────────────
 * A light that travels around an element's border.
 *
 * Drop it inside any positioned box with a border-radius; it inherits
 * the radius and traces that exact shape. Written for this project's
 * stack — plain JSX and CSS, no Tailwind and no animation library.
 *
 * How it works: a conic gradient is painted over the whole box, then
 * masked down to a ring using the padding-box / border-box mask pair,
 * so only the outline survives. Spinning the gradient's start angle
 * walks the bright arc around that ring. The angle is a registered
 * custom property (@property in styles.css), because an unregistered
 * one is a plain token and cannot be interpolated.
 * ─────────────────────────────────────────────────────────────── */

import * as React from 'react'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/**
 * @param duration    Seconds for one full lap.
 * @param delay       Seconds before the first lap. Stagger several beams with it.
 * @param size        Arc length of the bright segment, in degrees.
 * @param borderWidth Thickness of the ring, in px.
 * @param colorFrom   Leading colour of the arc.
 * @param colorTo     Trailing colour of the arc.
 */
export function BorderBeam({
  duration = 7,
  delay = 0,
  size = 72,
  borderWidth = 1.5,
  colorFrom = '#4D9AA1',
  colorTo = '#65A859',
  className,
}) {
  return (
    <span
      aria-hidden
      className={cx('border-beam', className)}
      style={{
        '--bb-duration': `${duration}s`,
        '--bb-delay': `${-Math.abs(delay)}s`,
        '--bb-size': `${size}deg`,
        '--bb-width': `${borderWidth}px`,
        '--bb-from': colorFrom,
        '--bb-to': colorTo,
      }}
    />
  )
}

export default BorderBeam
