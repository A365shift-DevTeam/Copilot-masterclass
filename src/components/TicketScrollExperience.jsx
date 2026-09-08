import { useEffect, useRef, useState, useCallback } from 'react'
import { scrollToTarget } from '../hooks/useLenis.js'
import './ticket-scroll.css'

export const TOTAL_FRAMES = 107
export const FRAME_BASE = '/frames/ticket-scroll/frame_'
const PRELOAD_CONCURRENCY = 8
// How far ahead of the section reaching the top edge the navbar starts fading
// to its transparent state, so the change is settled by the time the pass
// takes over the screen.
const NAV_STAGE_LEAD = 160

/*
 * Portrait fit. A 16:9 frame scaled to a phone's width is only ~0.56 of that
 * width tall, which leaves most of the screen empty above and below it. Two
 * things close that gap:
 *
 *  - zoom past the width fit, cropping the frame's own empty side margins. The
 *    artwork spans x 0.113-0.859 of the frame across all 107 frames, so 1/0.774
 *    = 1.29x is the most that can be taken before the pass itself is clipped;
 *    1.25 keeps a margin.
 *  - sit the band high rather than centred, so the space that is left lands in
 *    one block underneath, where the reveal copy goes -- instead of being split
 *    into two dead halves.
 */
const PORTRAIT_BELOW_RATIO = 1.2
const PORTRAIT_ZOOM = 1.27
const PORTRAIT_ANCHOR = 0.16
// Floor on the gap above the band, as a fraction of height rather than px:
// fitFrame runs in CSS px for measure() and device px for renderFrame(), so a
// pixel constant would mean two different things there. Keeps the band clear
// of the fixed navbar.
const PORTRAIT_TOP_MIN = 0.09

/*
 * Reveal beats, as fractions of the section scroll. Portrait runs far earlier:
 * there the copy is what fills the block under the band, and holding it until
 * the tear would play most of the scroll out against an empty half. Landscape
 * keeps the original timing, where the copy lands as the stub finishes curling.
 */
const BEATS = {
  landscape: { perf: [0.58, 0.72], flip: [0.58, 0.82], price: [0.78, 0.89], cta: [0.85, 0.96] },
  portrait: { perf: [0.12, 0.26], flip: [0.12, 0.44], price: [0.48, 0.64], cta: [0.66, 0.82] },
}

/**
 * Where the frame lands inside a box, in that box's units. Landscape fills the
 * width exactly; portrait fills it zoomed and rides high. Shared by measure()
 * (CSS px, to publish the band) and renderFrame() (device px), so the two can
 * never disagree about where the frame is.
 */
function fitFrame(boxW, boxH, iw, ih) {
  const portrait = boxW / boxH < PORTRAIT_BELOW_RATIO
  const scale = (boxW / iw) * (portrait ? PORTRAIT_ZOOM : 1)
  const dw = iw * scale
  const dh = ih * scale
  const free = boxH - dh
  return {
    dw,
    dh,
    dx: (boxW - dw) / 2,
    // Only ride high when there is slack to ride in; a negative `free` means
    // the frame overflows and must stay centred or it would crop lopsidedly.
    dy:
      portrait && free > 0
        ? Math.min(Math.max(free * PORTRAIT_ANCHOR, boxH * PORTRAIT_TOP_MIN), free / 2)
        : free / 2,
  }
}
// Ticket price shown on the reveal, matching the Register section.
const PASS_PRICE = 499

/*
 * The headline is split per character so each one can turn on its own beat,
 * like the flaps on a departure board. Indices run across both lines rather
 * than restarting, so the flip reads as one continuous sweep. Built once at
 * module scope: the text never changes, and rebuilding it per render would
 * hand React a fresh array on every scroll tick.
 */
const HEADLINE_LINES = ['Your Seat', 'Is Waiting']
const HEADLINE_TEXT = HEADLINE_LINES.join(' ')
let charIndex = 0
const HEADLINE_CHARS = HEADLINE_LINES.map((line) =>
  [...line].map((ch) => ({ ch: ch === ' ' ? '\u00A0' : ch, i: charIndex++ }))
)

/** Normalised 0-1 position of `p` inside [a, b]. */
const span = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)))
/** Ease-out cubic, so each beat arrives quickly then settles. */
const ease = (t) => (1 - Math.pow(1 - t, 3)).toFixed(4)

function getFrameUrl(index) {
  const pad = String(index + 1).padStart(4, '0')
  return `${FRAME_BASE}${pad}.webp`
}

// While this section owns the viewport the navbar stays visible but drops its
// solid plate, so it floats on the pass instead of sitting on an opaque bar.
// Styled in .nav-over-pass, the light-stage counterpart to the seat section's
// .nav-over-stage.
function setNavOverPass(over) {
  document.body.classList.toggle('nav-over-pass', over)
}

export default function TicketScrollExperience() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const stickyRef = useRef(null)
  const progressFillRef = useRef(null)
  const framesRef = useRef([])
  const currentFrameRef = useRef(-1)
  const drawnFrameRef = useRef(-1)
  const sizeRef = useRef({ bufW: 0, bufH: 0 })
  const [loadedPercent, setLoadedPercent] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  // Which beat table the scroll ticker reads. A ref, not state: it is written
  // from measure() and read every frame, and neither wants a re-render.
  const portraitRef = useRef(false)

  // Nearest already-decoded frame fallback for smooth scrubbing
  const resolveFrame = useCallback((index) => {
    const frames = framesRef.current
    if (frames[index]) return frames[index]
    for (let step = 1; step < TOTAL_FRAMES; step++) {
      if (frames[index - step]) return frames[index - step]
      if (frames[index + step]) return frames[index + step]
    }
    return null
  }, [])

  // Responsive measure backing-store size
  const measure = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cssW = rect.width
    const cssH = rect.height
    if (cssW === 0 || cssH === 0) return

    // Publish the frame's drawn band in CSS px so the copy and the scroll
    // prompt can sit directly under it on portrait rather than floating in the
    // empty half. Resize-time only: the band does not change per frame.
    portraitRef.current = cssW / cssH < PORTRAIT_BELOW_RATIO

    const img = resolveFrame(0)
    const sticky = stickyRef.current
    if (sticky) {
      const band = fitFrame(cssW, cssH, img ? img.naturalWidth : 1920, img ? img.naturalHeight : 1080)
      sticky.style.setProperty('--pass-frame-top', `${Math.round(band.dy)}px`)
      sticky.style.setProperty('--pass-frame-bottom', `${Math.round(band.dy + band.dh)}px`)
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const bufW = Math.round(cssW * dpr)
    const bufH = Math.round(cssH * dpr)

    const size = sizeRef.current
    if (size.bufW !== bufW || size.bufH !== bufH) {
      sizeRef.current = { bufW, bufH }
      canvas.width = bufW
      canvas.height = bufH
      drawnFrameRef.current = -1
    }
  }, [resolveFrame])

  // Draw the target frame into the band fitFrame picks: full-bleed across the
  // width on landscape, zoomed and riding high on portrait.
  const renderFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = resolveFrame(frameIndex)
    if (!img) return

    const { bufW, bufH } = sizeRef.current
    if (!bufW || !bufH) return

    if (!ctxRef.current) ctxRef.current = canvas.getContext('2d', { alpha: false })
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const iw = img.naturalWidth || 1920
    const ih = img.naturalHeight || 1080
    const { dw, dh, dx, dy } = fitFrame(bufW, bufH, iw, ih)

    // Studio tone behind the frame. Only visible on portrait viewports, where
    // filling the width leaves a band above and below the frame.
    ctx.fillStyle = '#eff1ee'
    ctx.fillRect(0, 0, bufW, bufH)
    ctx.drawImage(img, dx, dy, dw, dh)
    drawnFrameRef.current = frameIndex
  }, [resolveFrame])

  // Preload frames with bounded concurrency
  useEffect(() => {
    let active = true
    framesRef.current = new Array(TOTAL_FRAMES)
    let loadedCount = 0

    const load = (index) =>
      new Promise((resolve) => {
        const img = new Image()
        img.decoding = 'async'
        img.src = getFrameUrl(index)

        const finish = () => {
          if (active) {
            loadedCount++
            setLoadedPercent(Math.round((loadedCount / TOTAL_FRAMES) * 100))
          }
          resolve()
        }

        const ready = () => {
          if (!active) return resolve()
          framesRef.current[index] = img
          if (index === 0) {
            setIsReady(true)
            measure()
            renderFrame(0)
          } else if (index === currentFrameRef.current) {
            renderFrame(index)
          }
          finish()
        }

        const decoded = typeof img.decode === 'function' ? img.decode() : Promise.reject()
        decoded.then(ready, () => {
          if (img.complete && img.naturalWidth > 0) {
            ready()
          } else {
            img.onload = ready
            img.onerror = finish
          }
        })
      })

    let next = 1
    const worker = async () => {
      while (active && next < TOTAL_FRAMES) {
        await load(next++)
      }
    }

    const startBulkPreload = () => {
      if (!active) return
      const go = () => {
        if (!active) return
        for (let i = 0; i < PRELOAD_CONCURRENCY; i++) worker()
      }
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(go, { timeout: 1500 })
      } else {
        setTimeout(go, 200)
      }
    }

    // Immediately load first frame to paint without delay
    load(0).then(() => {
      if (document.readyState === 'complete') startBulkPreload()
      else window.addEventListener('load', startBulkPreload, { once: true })
    })

    return () => {
      active = false
      window.removeEventListener('load', startBulkPreload)
    }
  }, [measure, renderFrame])

  // Scroll ticker
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let rafId = 0
    let running = false
    let navOverPass = false

    const applyNav = (over) => {
      if (over === navOverPass) return
      navOverPass = over
      setNavOverPass(over)
    }

    const tick = () => {
      if (!running) return
      rafId = requestAnimationFrame(tick)

      const rect = section.getBoundingClientRect()
      const viewportH = window.innerHeight

      // Go transparent a little before the section reaches the top edge, and
      // back to solid once the section's bottom clears the viewport.
      applyNav(rect.top <= NAV_STAGE_LEAD && rect.bottom >= viewportH)

      const totalScrollable = rect.height - viewportH
      if (totalScrollable <= 0) return

      const clamped = Math.min(1, Math.max(0, -rect.top / totalScrollable))
      const targetIndex = Math.round(clamped * (TOTAL_FRAMES - 1))

      if (!sizeRef.current.bufW) measure()

      if (targetIndex !== drawnFrameRef.current) {
        currentFrameRef.current = targetIndex
        renderFrame(targetIndex)
      }

      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${clamped})`
      }

      if (stickyRef.current) {
        // The copy lands beat by beat as the stub finishes curling, so the
        // headline, price and CTA arrive in reading order rather than together.
        const sticky = stickyRef.current
        const b = portraitRef.current ? BEATS.portrait : BEATS.landscape
        sticky.style.setProperty('--pass-wait', ease(span(clamped, b.perf[0], b.perf[1])))
        // Linear, not eased: the per-character stagger supplies its own shape,
        // and an eased driver on top would rush the last few flaps.
        sticky.style.setProperty('--pass-flip', span(clamped, b.flip[0], b.flip[1]).toFixed(4))
        sticky.style.setProperty('--pass-price', ease(span(clamped, b.price[0], b.price[1])))
        sticky.style.setProperty('--pass-cta', ease(span(clamped, b.cta[0], b.cta[1])))
      }

      const scrolled = clamped > 0.06
      setHasScrolled(scrolled)
      // Live as soon as the button starts arriving, which portrait reaches much
      // sooner than landscape.
      setIsEnding(clamped > (portraitRef.current ? BEATS.portrait : BEATS.landscape).cta[0])
    }

    const start = () => {
      if (running) return
      running = true
      rafId = requestAnimationFrame(tick)
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(rafId)
      // The loop is the only thing that can restore the navbar's solid plate,
      // so never leave it transparent when we stop ticking.
      applyNav(false)
    }

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: '200px 0px' }
    )
    observer.observe(section)

    const handleResize = () => {
      measure()
      renderFrame(Math.max(0, currentFrameRef.current))
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    measure()

    return () => {
      observer.disconnect()
      stop()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [measure, renderFrame])

  const handlePromptClick = () => {
    if (sectionRef.current) {
      const rect = sectionRef.current.getBoundingClientRect()
      scrollToTarget(window.scrollY + rect.height * 0.4)
    }
  }

  return (
    <section
      ref={sectionRef}
      className="ticket-scroll-section"
      id="ticket-experience"
      aria-label="Interactive Masterclass Ticket Pass"
    >
      <div ref={stickyRef} className="ticket-scroll-sticky">
        {/* Canvas viewport */}
        <canvas ref={canvasRef} className="ticket-scroll-canvas" />

        {/* Top badge */}
        {/* <div className="ticket-scroll-badge">
          <span className="ticket-scroll-badge__dot" />
          <span>Exclusive Pass Preview</span>
        </div> */}

        {/* Scroll down prompt */}
        <div
          className={`ticket-scroll-prompt ${hasScrolled ? 'ticket-scroll-prompt--hidden' : ''}`}
          onClick={handlePromptClick}
          role="button"
          tabIndex={0}
        >
          <div className="ticket-scroll-prompt__mouse">
            <div className="ticket-scroll-prompt__wheel" />
          </div>
          <span>Scroll to tear off pass</span>
        </div>

        {/* Copy landing in the empty stage to the right of the torn pass, as
            the seat section does once its scrub reaches the end. */}
        <div className={`ticket-scroll-reveal ${isEnding ? 'ticket-scroll-reveal--active' : ''}`}>
          {/* Perforated leader running back to the torn stub */}
          <span className="ticket-scroll-reveal__perf" aria-hidden="true" />

          {/* Split per character for the flip, so the visible spans are hidden
              from assistive tech and the whole line is read off aria-label. */}
          <h3 className="ticket-scroll-reveal__headline" aria-label={HEADLINE_TEXT}>
            {HEADLINE_CHARS.map((line, li) => (
              <span className="ticket-scroll-reveal__line" key={li} aria-hidden="true">
                {line.map(({ ch, i }) => (
                  <span className="ticket-scroll-reveal__ch" key={i} style={{ '--i': String(i) }}>
                    {ch}
                  </span>
                ))}
              </span>
            ))}
          </h3>

          <p className="ticket-scroll-reveal__price">
            <span className="ticket-scroll-reveal__amount">&#8377;{PASS_PRICE}</span>
            <span className="ticket-scroll-reveal__only">Only</span>
          </p>

          <a
            href="#register"
            className="ticket-scroll-cta"
            tabIndex={isEnding ? 0 : -1}
            aria-label={`Book now — reserve your seat for ₹${PASS_PRICE}`}
            onClick={(e) => {
              e.preventDefault()
              scrollToTarget('#register', -20)
            }}
          >
            <span>Book Now</span>
            <span className="btn-shine" aria-hidden="true" />
          </a>
        </div>

        {/* Progress tracker bar */}
        <div className="ticket-scroll-progress" aria-hidden="true">
          <div ref={progressFillRef} className="ticket-scroll-progress-fill" />
        </div>

        {/* Preloader state */}
        {!isReady && (
          <div className="ticket-scroll-loader">
            <div className="ticket-scroll-spinner" />
            <span>Loading pass preview ({loadedPercent}%)...</span>
          </div>
        )}
      </div>
    </section>
  )
}
