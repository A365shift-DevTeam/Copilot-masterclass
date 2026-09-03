/* ── coverflow ───────────────────────────────────────────────────
 * Ported from the shadcn/TypeScript `coverflow-carousel` to this
 * project's stack: plain JSX, relative imports, hand-written CSS
 * instead of Tailwind. The mechanism is unchanged — only `cn()` and
 * the type annotations were removed, `items` was added so the deck can
 * carry arbitrary card markup instead of only <img>, and an autoplay
 * effect was added.
 * ─────────────────────────────────────────────────────────────── */

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const cx = (...parts) => parts.filter(Boolean).join(' ')

const useIsoLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

/**
 * @param slides  [{ src, alt, title, subtitle, meta }] rendered as cover images.
 * @param items   React nodes rendered as the card faces instead of images.
 *                Takes precedence over `slides` for the visuals; `slides` is
 *                still read for captions and the slide count.
 * @param autoplay        Advance on a timer. Pauses while dragging, while the
 *                        carousel holds keyboard focus, and while the tab is
 *                        hidden; skipped entirely under reduced motion.
 *                        Hover deliberately does NOT pause — the root spans
 *                        the full section width, so a resting cursor would
 *                        stop it indefinitely.
 * @param autoplayDelay   Milliseconds between advances.
 * @param rotate      Degrees the first neighbour tilts.
 * @param depth       How far the first neighbour recedes, as a fraction of card width.
 * @param perspective Viewer distance as a multiple of card width — smaller is a wider lens.
 * @param falloff     Exponent on distance. Below 1 the rake eases off as cards travel out.
 * @param fade        Opacity lost per step from the centre.
 * @param cardWidth   Any CSS length. Everything else derives from it, so the rake scales.
 * @param gap         Space between cards, as a fraction of card width.
 */
export function CoverflowCarousel({
  slides,
  items,
  autoplay = false,
  autoplayDelay = 3200,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = 'clamp(148px, 22vw, 260px)',
  gap = 0.05,
  loop = true,
  showCaption = false,
  showPagination = false,
  showNavigation = false,
  label = 'Cover carousel',
  className,
  cardClassName,
}) {
  const faces = items && items.length ? items : null
  const count = faces ? faces.length : slides.length

  const frameRef = React.useRef(null)
  const cardRefs = React.useRef([])
  /** Fractional card index at the centre. The single source of truth. */
  const posRef = React.useRef(0)
  /** Where the current settle is headed. Stepping off `pos` instead would
      swallow a keypress that lands mid-flight, before the round-off moves. */
  const targetRef = React.useRef(0)
  const widthRef = React.useRef(0)
  const rafRef = React.useRef(null)
  const dragRef = React.useRef(null)

  const [selected, setSelected] = React.useState(0)
  const [paused, setPaused] = React.useState(false)

  /** Nearest whole card, folded back into 0..count-1. */
  const indexAt = React.useCallback(
    (pos) => ((Math.round(pos) % count) + count) % count,
    [count],
  )

  // Paint straight to the DOM. Sixty state updates a second would re-render
  // every card for numbers React never needs to see.
  const paint = React.useCallback(() => {
    const width = widthRef.current
    if (!width) return
    const pitch = width * (1 + gap)
    const pos = posRef.current

    cardRefs.current.forEach((card, index) => {
      if (!card) return

      // Fold the distance into the shorter way round the ring. This is the
      // whole looping mechanism — no cloned nodes, no shuffling the DOM.
      let offset = index - pos
      if (loop) {
        offset = ((offset % count) + count) % count
        if (offset > count / 2) offset -= count
      }

      const distance = Math.abs(offset)
      // Both the tilt and the recession ease off as cards travel out —
      // doubling the distance adds only about half again as much of each.
      // A linear ramp folds the second card shut; this keeps it readable.
      const ramp = Math.pow(distance, falloff)
      // Capped short of edge-on so a far card never turns its back.
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset)

      // Grid centres the card, so this is a plain offset from centre.
      card.style.transform =
        `translateX(${offset * pitch}px) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`

      // A card is teleported across the ring at exactly half a turn out, so it
      // has to be gone by then or the jump is visible.
      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge)
      card.style.zIndex = String(100 - Math.round(distance))
    })
  }, [count, depth, fade, falloff, gap, loop, rotate])

  const settle = React.useCallback(
    (target) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      targetRef.current = target
      setSelected(indexAt(target))

      const step = () => {
        const remaining = target - posRef.current
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target
          paint()
          rafRef.current = null
          return
        }
        // exponential ease-out, not a spring. Swap in a spring only if the
        // settle needs overshoot.
        posRef.current += remaining * 0.16
        paint()
        rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [indexAt, paint],
  )

  const clamp = React.useCallback(
    (pos) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop],
  )

  const goTo = React.useCallback(
    (index) => {
      // Take the shorter way round rather than unwinding the whole ring.
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index
      settle(clamp(target))
    },
    [clamp, count, loop, settle],
  )

  const nudge = React.useCallback(
    (by) => settle(clamp(Math.round(targetRef.current) + by)),
    [clamp, settle],
  )

  const onPointerDown = (event) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    targetRef.current = posRef.current
    setPaused(true)
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
    }
  }

  const onPointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return

    const pitch = widthRef.current * (1 + gap)
    if (!pitch) return

    const now = performance.now()
    const previous = posRef.current
    posRef.current = clamp(drag.pos - (event.clientX - drag.x) / pitch)
    // Cards per second, for the throw.
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000
    drag.t = now

    const index = indexAt(posRef.current)
    if (index !== selected) setSelected(index)
    paint()
  }

  const endDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    dragRef.current = null
    setPaused(false)
    // Let a flick carry, but never more than two cards.
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18))
    settle(clamp(Math.round(posRef.current + carried)))
  }

  // Card width drives pitch, depth and perspective, so it is the only thing
  // worth measuring — and only when the box actually changes.
  useIsoLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const measure = () => {
      const card = cardRefs.current[0]
      if (!card) return
      widthRef.current = card.offsetWidth
      paint()
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [paint])

  // Autoplay. Held off while the viewer is interacting, while the tab is in the
  // background, and entirely under prefers-reduced-motion — an animation the
  // viewer never asked to start is exactly what that setting is about.
  const [hidden, setHidden] = React.useState(false)
  React.useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === 'hidden')
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  React.useEffect(() => {
    if (!autoplay || paused || hidden || count < 2) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches) return
    const id = setInterval(() => nudge(1), autoplayDelay)
    return () => clearInterval(id)
  }, [autoplay, autoplayDelay, paused, hidden, count, nudge])

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  const active = slides ? slides[selected] : null

  return (
    <div
      className={cx('cf', className)}
      style={{ '--cf-card': cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="cf__rel">
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              nudge(-1)
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              nudge(1)
            }
          }}
          // Vertical padding keeps the drop shadows clear of the overflow clip.
          className="cf__frame"
          style={{
            perspective: `calc(var(--cf-card) * ${perspective})`,
            // Horizontal drag is ours; the page keeps vertical scrolling.
            touchAction: 'pan-y',
          }}
        >
          <div className="cf__stage" style={{ transformStyle: 'preserve-3d' }}>
            {Array.from({ length: count }, (_, index) => {
              const slide = slides ? slides[index] : null
              return (
                <div
                  key={index}
                  ref={(node) => {
                    cardRefs.current[index] = node
                  }}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${count}`}
                  className={cx('cf__card', cardClassName)}
                >
                  {faces ? (
                    faces[index]
                  ) : (
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      draggable={false}
                      className="cf__img"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {showNavigation && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => nudge(-1)}
              className="cf__nav cf__nav--prev"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => nudge(1)}
              className="cf__nav cf__nav--next"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {showCaption && active?.title && (
        <div key={selected} className="cf__caption">
          <p className="cf__caption-title">{active.title}</p>
          {active.subtitle && <p className="cf__caption-sub">{active.subtitle}</p>}
          {active.meta && active.meta.length > 0 && (
            <dl className="cf__meta">
              {active.meta.map((row) => (
                <div key={row.label} className="cf__meta-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {showPagination && (
        <div className="cf__dots">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className={cx('cf__dot', index === selected && 'is-active')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default CoverflowCarousel
