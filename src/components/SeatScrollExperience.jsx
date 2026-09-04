import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowDown } from 'lucide-react'
import { scrollToTarget } from '../hooks/useLenis.js'
import GravityStarsBackground from './ui/GravityStarsBackground.jsx'
import SeatReveal from './SeatReveal.jsx'

const TOTAL_FRAMES = 118
const FRAME_BASE = '/frames/seat-scroll/frame_'
const PRELOAD_CONCURRENCY = 8
// How far ahead of the section reaching the top edge the navbar starts fading
// to its transparent state, so the change is settled by the time the stage
// takes over the screen.
const NAV_STAGE_LEAD = 160

function getFrameUrl(index) {
  const pad = String(index + 1).padStart(4, '0')
  return `${FRAME_BASE}${pad}.webp`
}

/** Normalised 0-1 position of `p` inside [a, b]. */
const span = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)))
/** Ease-out cubic, so each beat arrives quickly then settles. */
const ease = (t) => (1 - Math.pow(1 - t, 3)).toFixed(4)

// While this section owns the viewport the navbar stays visible but drops its
// solid white plate, so it floats on the stage. Styled in .nav-over-stage.
function setNavOverStage(over) {
  document.body.classList.toggle('nav-over-stage', over)
}

export default function SeatScrollExperience({ onBook }) {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const stickyRef = useRef(null)
  const progressFillRef = useRef(null)
  const framesRef = useRef([])
  const currentFrameRef = useRef(-1)
  const drawnFrameRef = useRef(-1)
  // Cached canvas geometry so the render loop never forces a layout read
  const sizeRef = useRef({ bufW: 0, bufH: 0 })
  const [loadedPercent, setLoadedPercent] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [phase, setPhase] = useState({ isStart: true, isEnding: false })

  // Nearest already-decoded frame, so a not-yet-loaded index never stalls the draw
  const resolveFrame = useCallback((index) => {
    const frames = framesRef.current
    if (frames[index]) return frames[index]
    for (let step = 1; step < TOTAL_FRAMES; step++) {
      if (frames[index - step]) return frames[index - step]
      if (frames[index + step]) return frames[index + step]
    }
    return null
  }, [])

  // Recompute the backing-store size. Integer sizes only: `canvas.width` truncates
  // to an int, so a fractional target would never compare equal and would
  // reallocate + clear the whole buffer on every single draw.
  const measure = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cssW = rect.width
    const cssH = rect.height
    if (cssW === 0 || cssH === 0) return

    const img = resolveFrame(0)
    const iw = img ? img.naturalWidth : 1280
    const ih = img ? img.naturalHeight : 720
    const imgRatio = iw / ih
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    // Match the backing store to the detail the source actually holds. Under a
    // contain fit the drawn height is what matters, so compare source height to
    // the height the frame will occupy: a wide desktop needs no more than 1x
    // (720p has nothing to put in extra pixels), while a narrow phone, where the
    // frame lands small, wants full device resolution.
    const drawnHcss = cssW / cssH > imgRatio ? cssH : cssW / imgRatio
    const scale = Math.min(dpr, Math.max(1, ih / drawnHcss))

    // The contain fit leaves a margin either side, so publish the frame's own
    // inset. The copy block anchors to the frame's edge rather than the
    // viewport's, which is what keeps it over the seats as in the reference.
    // Written on resize only, never per frame.
    const sticky = stickyRef.current
    if (sticky) {
      const drawnWcss = drawnHcss * imgRatio
      sticky.style.setProperty('--frame-inset-x', `${Math.max(0, (cssW - drawnWcss) / 2)}px`)
      sticky.style.setProperty('--frame-inset-y', `${Math.max(0, (cssH - drawnHcss) / 2)}px`)
    }

    const bufW = Math.round(cssW * scale)
    const bufH = Math.round(cssH * scale)
    const size = sizeRef.current
    if (size.bufW !== bufW || size.bufH !== bufH) {
      sizeRef.current = { bufW, bufH }
      canvas.width = bufW
      canvas.height = bufH
      drawnFrameRef.current = -1
    }
  }, [resolveFrame])

  const renderFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = resolveFrame(frameIndex)
    if (!img) return

    const { bufW, bufH } = sizeRef.current
    if (!bufW || !bufH) return

    // Context attributes are fixed at first acquisition and getContext returns
    // the same object forever after, so cache both rather than re-requesting
    // (and risking a mismatched alpha) on every frame.
    if (!ctxRef.current) ctxRef.current = canvas.getContext('2d')
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const imgRatio = iw / ih
    const canvasRatio = bufW / bufH

    // Contain fit, computed in device pixels so nothing gets scaled twice. The
    // frames carry content right up to every edge (the M365 badge, the app-icon
    // row, the scroll prompt), so a cover crop would eat it - the whole frame
    // has to be on screen. .seat-scroll-backdrop fills the leftover margin.
    let dw, dh, dx, dy
    if (canvasRatio > imgRatio) {
      dh = bufH
      dw = bufH * imgRatio
      dx = (bufW - dw) / 2
      dy = 0
    } else {
      dw = bufW
      dh = bufW / imgRatio
      dx = 0
      dy = (bufH - dh) / 2
    }

    ctx.clearRect(0, 0, bufW, bufH)
    ctx.drawImage(img, dx, dy, dw, dh)
    drawnFrameRef.current = frameIndex
  }, [resolveFrame])

  // Preload with bounded concurrency and an explicit decode, so the first
  // drawImage of a frame never triggers a synchronous decode mid-scroll.
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

    // Pull the whole set down in the background while the visitor is still up
    // the page, so the scrub is fully cached before they ever reach it. Held
    // until after load (and then an idle slot) so 192 requests never compete
    // with the hero, fonts and first-screen images for bandwidth.
    const startBulkPreload = () => {
      if (!active) return
      const go = () => {
        if (!active) return
        for (let i = 0; i < PRELOAD_CONCURRENCY; i++) worker()
      }
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(go, { timeout: 2500 })
      } else {
        setTimeout(go, 400)
      }
    }

    // The first frame is the exception: fetch it straight away so the section
    // has something to paint the moment it scrolls into view.
    load(0).then(() => {
      if (document.readyState === 'complete') startBulkPreload()
      else window.addEventListener('load', startBulkPreload, { once: true })
    })

    return () => {
      active = false
      window.removeEventListener('load', startBulkPreload)
    }
  }, [measure, renderFrame])

  // One rAF loop, gated to when the section is on screen. Reading scroll
  // position here (rather than in a scroll handler) keeps us off Lenis's write
  // path and avoids a React re-render on every scroll tick.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let rafId = 0
    let running = false
    let lastPhase = { isStart: true, isEnding: false }
    let navOverStage = false

    const applyNav = (over) => {
      if (over === navOverStage) return
      navOverStage = over
      setNavOverStage(over)
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

      // Insurance: if the mount-time measure() saw a zero-size rect, the canvas
      // would otherwise stay blank forever.
      if (!sizeRef.current.bufW) measure()

      if (targetIndex !== drawnFrameRef.current) {
        currentFrameRef.current = targetIndex
        renderFrame(targetIndex)
      }

      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${clamped})`
      }

      // Reveal beats for the copy block, staggered so the headline lands, then
      // the price, then the CTA. Written straight to CSS vars on the sticky
      // element: no React render per frame, and every var feeds only an
      // opacity or a transform.
      const sticky = stickyRef.current
      if (sticky) {
        sticky.style.setProperty('--connector', ease(span(clamped, 0.62, 0.76)))
        sticky.style.setProperty('--wait', ease(span(clamped, 0.66, 0.8)))
        sticky.style.setProperty('--price', ease(span(clamped, 0.79, 0.9)))
        sticky.style.setProperty('--cta', ease(span(clamped, 0.88, 0.97)))
      }

      const isStart = clamped < 0.22
      const isEnding = clamped > 0.9
      if (isStart !== lastPhase.isStart || isEnding !== lastPhase.isEnding) {
        lastPhase = { isStart, isEnding }
        setPhase(lastPhase)
      }
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

  const { isStart, isEnding } = phase

  return (
    <section
      ref={sectionRef}
      className="seat-scroll-section"
      id="seat-experience"
      aria-label="Interactive Seat Reservation Experience"
    >
      <div ref={stickyRef} className="seat-scroll-sticky">
        {/* Backdrop filling the letterbox margin: radial gradient with the
            gravity star field drifting over it, both behind the frame canvas */}
        <div className="seat-scroll-backdrop" aria-hidden="true">
          {/* Only the side margins are uncovered, so the defaults (75 stars,
              100px influence) would leave a dozen dots the cursor never reaches.
              Denser field and a longer reach to suit a margin-only viewport. */}
          <GravityStarsBackground
            className="seat-scroll-stars"
            starsCount={220}
            mouseInfluence={280}
          />
        </div>

        {/* Canvas viewport */}
        <canvas ref={canvasRef} className="seat-scroll-canvas" />

        {/* Ambient gradient vignettes */}
        <div className="seat-scroll-vignette seat-scroll-vignette--top" />
        <div className="seat-scroll-vignette seat-scroll-vignette--bottom" />

        {/* Scroll down prompt (Active during initial phase) */}
        {/* <div
          className={`seat-scroll-prompt ${isStart ? 'seat-scroll-prompt--visible' : 'seat-scroll-prompt--hidden'}`}
          onClick={() => {
            if (sectionRef.current) {
              const rect = sectionRef.current.getBoundingClientRect()
              scrollToTarget(window.scrollY + rect.height * 0.45)
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="seat-scroll-prompt__mouse">
            <div className="seat-scroll-prompt__wheel" />
          </div>
          <span>Scroll down to zoom into your seat</span>
          <ArrowDown size={15} className="seat-scroll-prompt__arrow" />
        </div> */}

        {/* The copy that used to be baked into the frames, now real DOM.
            `isEnding` only gates focusability, so the button is never a tab
            stop while it is still invisible. */}
        <SeatReveal onBook={onBook} tabbable={isEnding} />

        {/* Progress tracker bar */}
        <div className="seat-scroll-progress-bar" aria-hidden="true">
          <div ref={progressFillRef} className="seat-scroll-progress-fill" />
        </div>

        {/* Subtle preloader indicator if frames are still caching */}
        {!isReady && (
          <div className="seat-scroll-loader">
            <div className="seat-scroll-spinner" />
            <span>Loading interactive stage ({loadedPercent}%)...</span>
          </div>
        )}
      </div>
    </section>
  )
}
