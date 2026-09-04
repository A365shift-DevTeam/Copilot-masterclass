import { useEffect, useRef, useState, useCallback } from 'react'
import { Sparkles, ArrowDown, ChevronRight, CheckCircle2 } from 'lucide-react'
import { scrollToTarget } from '../hooks/useLenis.js'
import GravityStarsBackground from './ui/GravityStarsBackground.jsx'

const TOTAL_FRAMES = 192
const FRAME_BASE = '/frames/seat-scroll/frame_'
const PRELOAD_CONCURRENCY = 6
// How far ahead of the section reaching the top edge the navbar starts to
// retract, so it is already gone by the time the stage takes over the screen.
const NAV_HIDE_LEAD = 160

function getFrameUrl(index) {
  const pad = String(index + 1).padStart(4, '0')
  return `${FRAME_BASE}${pad}.webp`
}

// The navbar retracts while this section owns the whole viewport, so nothing
// floats over the auditorium. Styled in .nav-hidden (styles.css).
function setNavHidden(hidden) {
  document.body.classList.toggle('nav-hidden', hidden)
}

export default function SeatScrollExperience() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
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

    // First frame on its own so the section paints immediately, then the rest
    let next = 1
    const worker = async () => {
      while (active && next < TOTAL_FRAMES) {
        await load(next++)
      }
    }
    load(0).then(() => {
      for (let i = 0; i < PRELOAD_CONCURRENCY; i++) worker()
    })

    return () => {
      active = false
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
    let navHidden = false

    const applyNav = (hidden) => {
      if (hidden === navHidden) return
      navHidden = hidden
      setNavHidden(hidden)
    }

    const tick = () => {
      if (!running) return
      rafId = requestAnimationFrame(tick)

      const rect = section.getBoundingClientRect()
      const viewportH = window.innerHeight

      // Retract the navbar a little before the section reaches the top edge, and
      // bring it back once the section's bottom clears the viewport.
      applyNav(rect.top <= NAV_HIDE_LEAD && rect.bottom >= viewportH)

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

      const isStart = clamped < 0.22
      const isEnding = clamped > 0.82
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
      // The loop is the only thing that can restore the navbar, so never leave
      // it hidden when we stop ticking.
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

  const handleBookNow = () => {
    scrollToTarget('#register', -20)
  }

  const { isStart, isEnding } = phase

  return (
    <section
      ref={sectionRef}
      className="seat-scroll-section"
      id="seat-experience"
      aria-label="Interactive Seat Reservation Experience"
    >
      <div className="seat-scroll-sticky">
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

        {/* Top Header Tag */}
        <div className="seat-scroll-top-header">
          <div className="seat-scroll-badge">
            <Sparkles className="seat-scroll-badge__icon" size={15} />
            <span>Interactive Auditorium Preview</span>
          </div>
          <h3 className="seat-scroll-headline">
            Step Into Your Copilot Masterclass
          </h3>
        </div>

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

        {/* Climax Call-To-Action Overlay (Active when zoom finishes) */}
        <div
          className={`seat-scroll-cta-card ${isEnding ? 'seat-scroll-cta-card--visible' : 'seat-scroll-cta-card--hidden'}`}
        >
          <div className="seat-scroll-cta-card__glass">
            <div className="seat-scroll-cta-badge">
              <CheckCircle2 size={16} className="seat-scroll-cta-badge__icon" />
              <span>Seat Reserved For You</span>
            </div>
            <h4 className="seat-scroll-cta-title">YOUR SEAT IS WAITING</h4>
            <p className="seat-scroll-cta-desc">
              Join live to master Copilot Studio, prompt engineering &amp; AI agents.
            </p>
            <div className="seat-scroll-cta-price-row">
              <span className="seat-scroll-cta-price">₹499</span>
              <span className="seat-scroll-cta-original">₹2,499</span>
              <span className="seat-scroll-cta-pill">80% OFF</span>
            </div>
            <button
              onClick={handleBookNow}
              className="btn btn--primary seat-scroll-cta-btn"
              aria-label="Book your seat now for ₹499"
            >
              <span>CLAIM YOUR SEAT NOW</span>
              <ChevronRight size={18} />
            </button>
            <div className="seat-scroll-cta-guarantee">
              Limited seats in the room • Instant access link sent upon booking
            </div>
          </div>
        </div>

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
