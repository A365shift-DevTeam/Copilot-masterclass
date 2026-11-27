import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowDown } from 'lucide-react'
import { scrollToTarget, getLenis } from '../hooks/useLenis.js'
import GravityStarsBackground from './ui/GravityStarsBackground.jsx'
import SeatReveal from './SeatReveal.jsx'
import {
  TOTAL_SEAT_FRAMES,
  seatFrames,
  loadFrame,
  resolveCachedFrame,
  preloadAround,
  setActiveFrame,
  startBulkPreload,
  subscribeFrames,
} from '../utils/frameCache.js'

export const TOTAL_FRAMES = TOTAL_SEAT_FRAMES

// How far ahead of the section reaching the top edge the navbar starts fading
// to its transparent state, so the change is settled by the time the stage
// takes over the screen.
const NAV_STAGE_LEAD = 160

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
  const currentFrameRef = useRef(0)
  const drawnFrameRef = useRef(-1)
  const drawnIsExactRef = useRef(false)
  // Cached canvas geometry so the render loop never forces a layout read
  const sizeRef = useRef({ bufW: 0, bufH: 0 })
  const [loadedPercent, setLoadedPercent] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [phase, setPhase] = useState({ isStart: true, isEnding: false })

  // Recompute the backing-store size.
  const measure = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cssW = rect.width
    const cssH = rect.height
    if (cssW === 0 || cssH === 0) return

    const resolved = resolveCachedFrame('seat', 0)
    const img = resolved.img
    const iw = img ? img.naturalWidth : 1280
    const ih = img ? img.naturalHeight : 720
    const imgRatio = iw / ih
    const dpr = Math.min(window.devicePixelRatio || 1, 3)

    const drawnHcss = cssW / imgRatio
    const scale = Math.min(dpr, Math.max(1, ih / drawnHcss))

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
  }, [])

  const renderFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resolved = resolveCachedFrame('seat', frameIndex)
    const img = resolved.img
    if (!img) return

    const { bufW, bufH } = sizeRef.current
    if (!bufW || !bufH) return

    if (!ctxRef.current) ctxRef.current = canvas.getContext('2d')
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const iw = img.naturalWidth || 1280
    const ih = img.naturalHeight || 720

    const scale = bufW / iw
    const dw = bufW
    const dh = ih * scale
    const dx = 0
    const dy = (bufH - dh) / 2

    ctx.clearRect(0, 0, bufW, bufH)
    ctx.drawImage(img, dx, dy, dw, dh)

    drawnFrameRef.current = frameIndex
    drawnIsExactRef.current = resolved.isExact
  }, [])

  // Preload and frame synchronization
  useEffect(() => {
    // 1. Immediately ensure first frame is loaded & painted
    loadFrame('seat', 0).then((img) => {
      if (img) {
        setIsReady(true)
        measure()
        renderFrame(0)
      }
    })

    // 2. Bulk loading is deferred until the section nears the viewport; see the
    //    scroll ticker below. Pulling the whole sequence on mount cost every
    //    visitor the download whether or not they ever scrolled this far.

    // 3. Subscribe to newly arrived frames: update progress and re-render if current frame was using a fallback
    const unsubscribe = subscribeFrames('seat', (loadedIndex) => {
      let count = 0
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (seatFrames[i]) count++
      }
      setLoadedPercent(Math.round((count / TOTAL_FRAMES) * 100))

      if (!drawnIsExactRef.current || loadedIndex === currentFrameRef.current) {
        renderFrame(Math.max(0, currentFrameRef.current))
      }
    })

    return unsubscribe
  }, [measure, renderFrame])

  // Scroll ticker with multi-channel wake-up
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let rafId = 0
    let running = false
    let lastPhase = { isStart: true, isEnding: false }
    let navOverStage = false
    let stopBulk = null

    const applyNav = (over) => {
      if (over === navOverStage) return
      navOverStage = over
      setNavOverStage(over)
    }

    const tick = () => {
      const rect = section.getBoundingClientRect()
      const viewportH = window.innerHeight

      applyNav(rect.top <= NAV_STAGE_LEAD && rect.bottom >= viewportH)

      const totalScrollable = rect.height - viewportH
      if (totalScrollable <= 0) {
        // Not laid out yet. Keep the loop alive or it never restarts.
        if (running) rafId = requestAnimationFrame(tick)
        return
      }

      const clamped = Math.min(1, Math.max(0, -rect.top / totalScrollable))
      const targetIndex = Math.round(clamped * (TOTAL_FRAMES - 1))

      // Fill the rest of the sequence once the stage is genuinely on screen,
      // not on the observer's 300px lead. Filling outward from the current
      // frame matters on a slow connection: from 0 it would spend the pipe on
      // frames already scrolled past while the next ones wait behind them.
      if (!stopBulk && rect.top < viewportH && rect.bottom > 0) {
        stopBulk = startBulkPreload('seat', 8, targetIndex)
      }

      if (!sizeRef.current.bufW) measure()

      // Dynamically prioritize loading frames around current scroll position
      preloadAround('seat', targetIndex, 8)

      if (targetIndex !== currentFrameRef.current || !drawnIsExactRef.current) {
        currentFrameRef.current = targetIndex
        renderFrame(targetIndex)
      }

      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${clamped})`
      }

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

      if (running) {
        rafId = requestAnimationFrame(tick)
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
      applyNav(false)
      // Drop this stage's claim on the loader queue, so frames it asked for
      // stop outranking the stage the viewer actually moved to.
      setActiveFrame('seat', null)
      // Hand the connection back to whichever stage the viewer moved on to.
      // Decoded frames stay cached, so re-entry resumes rather than restarts.
      if (stopBulk) {
        stopBulk()
        stopBulk = null
      }
    }

    const isNearViewport = () => {
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      return rect.top <= vh + 350 && rect.bottom >= -350
    }

    const handleScroll = () => {
      if (isNearViewport()) {
        if (!running) start()
        else tick()
      } else if (running) {
        stop()
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start()
        else stop()
      },
      { rootMargin: '300px 0px' }
    )
    observer.observe(section)

    window.addEventListener('scroll', handleScroll, { passive: true })
    const lenis = getLenis()
    if (lenis) lenis.on('scroll', handleScroll)

    const handleVisibility = () => {
      if (!document.hidden && isNearViewport()) {
        start()
        tick()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

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
      if (stopBulk) stopBulk()
      window.removeEventListener('scroll', handleScroll)
      if (lenis) lenis.off('scroll', handleScroll)
      document.removeEventListener('visibilitychange', handleVisibility)
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
