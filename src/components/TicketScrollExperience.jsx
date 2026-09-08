import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowRight } from 'lucide-react'
import { scrollToTarget } from '../hooks/useLenis.js'
import './ticket-scroll.css'

const TOTAL_FRAMES = 107
const FRAME_BASE = '/frames/ticket-scroll/frame_'
const PRELOAD_CONCURRENCY = 8
// How far ahead of the section reaching the top edge the navbar starts fading
// to its transparent state, so the change is settled by the time the pass
// takes over the screen.
const NAV_STAGE_LEAD = 160

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
  }, [])

  // Draw target frame scaled to fill the viewport width. On viewports wider
  // than the 16:9 source that is a cover fit -- no letterbox band, the frame
  // runs edge to edge and overflows top and bottom. On narrower (portrait)
  // ones the same width-driven scale is the contain fit, so the pass is never
  // cropped horizontally down to a vertical slice.
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
    const scale = bufW / iw
    const dw = bufW
    const dh = ih * scale
    const dx = (bufW - dw) / 2
    const dy = (bufH - dh) / 2

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
        // Fade in reveal CTA as stub finishes curling (between 75% and 95%)
        const revealProgress = Math.min(1, Math.max(0, (clamped - 0.72) / 0.22))
        stickyRef.current.style.setProperty('--reveal-opacity', revealProgress.toFixed(3))
      }

      const scrolled = clamped > 0.06
      setHasScrolled(scrolled)
      setIsEnding(clamped > 0.85)
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

        {/* Interactive CTA reveal on stub tear */}
        <div className={`ticket-scroll-reveal ${isEnding ? 'ticket-scroll-reveal--active' : ''}`}>
          <a
            href="#register"
            className="ticket-scroll-cta"
            onClick={(e) => {
              e.preventDefault()
              scrollToTarget('#register', -20)
            }}
          >
            <span>Reserve Your Seat</span>
            <ArrowRight size={16} />
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
