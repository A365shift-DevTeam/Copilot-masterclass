import { useEffect, useRef, useState, useCallback } from 'react'
import { scrollToTarget, getLenis } from '../hooks/useLenis.js'
import useTypewriter from '../hooks/useTypewriter.js'
import ReserveSeatLabel from './ReserveSeatLabel.jsx'
import './ticket-scroll.css'
import {
  TOTAL_TICKET_FRAMES,
  ticketFrames,
  loadFrame,
  resolveCachedFrame,
  preloadAround,
  setActiveFrame,
  startBulkPreload,
  subscribeFrames,
} from '../utils/frameCache.js'

export const TOTAL_FRAMES = TOTAL_TICKET_FRAMES

// How far ahead of the section reaching the top edge the navbar starts fading
// to its transparent state, so the change is settled by the time the pass
// takes over the screen.
const NAV_STAGE_LEAD = 160

/*
 * Portrait fit. A 16:9 frame scaled to a phone's width is only ~0.56 of that
 * width tall, which leaves most of the screen empty above and below it.
 */
const PORTRAIT_BELOW_RATIO = 1.2
const PORTRAIT_ZOOM = 1.27
const PORTRAIT_ANCHOR = 0.16
const PORTRAIT_TOP_MIN = 0.09

const BEATS = {
  landscape: { perf: [0.58, 0.72], flip: [0.58, 0.82], price: [0.78, 0.89], cta: [0.85, 0.96] },
  portrait: { perf: [0.12, 0.26], flip: [0.12, 0.44], price: [0.48, 0.64], cta: [0.66, 0.82] },
}

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
    dy:
      portrait && free > 0
        ? Math.min(Math.max(free * PORTRAIT_ANCHOR, boxH * PORTRAIT_TOP_MIN), free / 2)
        : free / 2,
  }
}

const PASS_PRICE = 499

const HEADLINE_LINES = ['Your Seat', 'Is Waiting']
const HEADLINE_TEXT = HEADLINE_LINES.join(' ')
let charIndex = 0
const HEADLINE_CHARS = HEADLINE_LINES.map((line) =>
  [...line].map((ch) => ({ ch: ch === ' ' ? '\u00A0' : ch, i: charIndex++ }))
)

const INTRO_KICKER = 'DON’T JUST WATCH THE AI REVOLUTION. BE PART OF IT.'
const INTRO_TYPED = 'Master Microsoft Copilot'

/*
 * Kept in its own component so the typewriter's per-character state updates
 * re-render this small block instead of the whole scrubber tree.
 */
function TicketIntro() {
  const { displayedText } = useTypewriter({
    text: INTRO_TYPED,
    typingSpeed: 70,
    deletingSpeed: 32,
    pauseDuration: 2200,
    deletePauseDuration: 500,
    loop: true,
  })

  return (
    <div className="ticket-scroll-intro">
      <p className="ticket-scroll-intro__kicker">{INTRO_KICKER}</p>
      <p className="ticket-scroll-intro__typed" aria-label={INTRO_TYPED}>
        <span className="ticket-scroll-intro__text" aria-hidden="true">{displayedText || '\u200B'}</span>
        <span className="ticket-scroll-intro__cursor" aria-hidden="true" />
      </p>
    </div>
  )
}

const span = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)))
const ease = (t) => (1 - Math.pow(1 - t, 3)).toFixed(4)

function setNavOverPass(over) {
  document.body.classList.toggle('nav-over-pass', over)
}

export default function TicketScrollExperience() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const stickyRef = useRef(null)
  const progressFillRef = useRef(null)
  const currentFrameRef = useRef(0)
  const drawnFrameRef = useRef(-1)
  const drawnIsExactRef = useRef(false)
  const sizeRef = useRef({ bufW: 0, bufH: 0 })
  const [loadedPercent, setLoadedPercent] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const portraitRef = useRef(false)

  // Responsive measure backing-store size
  const measure = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cssW = rect.width
    const cssH = rect.height
    if (cssW === 0 || cssH === 0) return

    portraitRef.current = cssW / cssH < PORTRAIT_BELOW_RATIO

    const resolved = resolveCachedFrame('ticket', 0)
    const img = resolved.img
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
  }, [])

  // Draw the target frame into the canvas
  const renderFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resolved = resolveCachedFrame('ticket', frameIndex)
    const img = resolved.img
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

    ctx.fillStyle = '#eff1ee'
    ctx.fillRect(0, 0, bufW, bufH)
    ctx.drawImage(img, dx, dy, dw, dh)

    drawnFrameRef.current = frameIndex
    drawnIsExactRef.current = resolved.isExact
  }, [])

  // Preload frames with shared cache
  useEffect(() => {
    // 1. First frame painted immediately
    loadFrame('ticket', 0).then((img) => {
      if (img) {
        setIsReady(true)
        measure()
        renderFrame(0)
      }
    })

    // 2. Bulk loading is deferred until the section nears the viewport; see the
    //    scroll ticker below. Pulling the whole sequence on mount cost every
    //    visitor the download whether or not they ever scrolled this far.

    // 3. Listen for loaded frames
    const unsubscribe = subscribeFrames('ticket', (loadedIndex) => {
      let count = 0
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (ticketFrames[i]) count++
      }
      setLoadedPercent(Math.round((count / TOTAL_FRAMES) * 100))

      if (!drawnIsExactRef.current || loadedIndex === currentFrameRef.current) {
        renderFrame(Math.max(0, currentFrameRef.current))
      }
    })

    return unsubscribe
  }, [measure, renderFrame])

  // Scroll ticker
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let rafId = 0
    let running = false
    let navOverPass = false
    let stopBulk = null

    const applyNav = (over) => {
      if (over === navOverPass) return
      navOverPass = over
      setNavOverPass(over)
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

      // Fill the rest of the sequence once the stage is genuinely on screen.
      // The observer starts this ticker 300px early, but the pass sits directly
      // below the fold, so bulk-loading on that margin would pull all 107
      // frames before the viewer has scrolled at all. Filling outward from the
      // current frame keeps the next ones ahead of the ones already passed.
      if (!stopBulk && rect.top < viewportH && rect.bottom > 0) {
        stopBulk = startBulkPreload('ticket', 8, targetIndex)
      }

      if (!sizeRef.current.bufW) measure()

      preloadAround('ticket', targetIndex, 8)

      if (targetIndex !== currentFrameRef.current || !drawnIsExactRef.current) {
        currentFrameRef.current = targetIndex
        renderFrame(targetIndex)
      }

      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${clamped})`
      }

      if (stickyRef.current) {
        const sticky = stickyRef.current
        const b = portraitRef.current ? BEATS.portrait : BEATS.landscape
        sticky.style.setProperty('--pass-wait', ease(span(clamped, b.perf[0], b.perf[1])))
        sticky.style.setProperty('--pass-flip', span(clamped, b.flip[0], b.flip[1]).toFixed(4))
        sticky.style.setProperty('--pass-price', ease(span(clamped, b.price[0], b.price[1])))
        sticky.style.setProperty('--pass-cta', ease(span(clamped, b.cta[0], b.cta[1])))
      }

      const scrolled = clamped > 0.06
      setHasScrolled(scrolled)
      setIsEnding(clamped > (portraitRef.current ? BEATS.portrait : BEATS.landscape).cta[0])

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
      setActiveFrame('ticket', null)
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

        {/* Intro copy sitting in the empty band above the pass. */}
        <TicketIntro />

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
            aria-label={`Reserve your seat for just ₹${PASS_PRICE}`}
            onClick={(e) => {
              e.preventDefault()
              scrollToTarget('#register', -20)
            }}
          >
            <span><ReserveSeatLabel amount={PASS_PRICE} /></span>
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
