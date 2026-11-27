import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CalendarDays } from 'lucide-react'
import CopilotOrbit from './CopilotOrbit.jsx'
import TrainerProfile from './TrainerProfile.jsx'
import CourseDialog, { rippleClick } from './CourseDialog.jsx'
import { WEBINAR_DATE, HERO_PRICES } from '../data/content.js'
import SaleBanner, { SalePrice } from './ui/SaleBanner.jsx'
import useTypewriter from '../hooks/useTypewriter.js'

const DAYS_NOTE = 'Now together in one session'

export default function Hero() {
  const scaleRef = useRef(null)
  const colRef = useRef(null)
  const orbitRef = useRef(null)
  // True when the hero shows two columns side by side. The grid stacks on
  // available width (auto-fit), not a fixed breakpoint, so measure it: the
  // trainer chip sits above the orbit when side by side, under the table when stacked.
  const [sideBySide, setSideBySide] = useState(false)

  useEffect(() => {
    const col = colRef.current
    const orbit = orbitRef.current
    if (!col || !orbit) return
    const check = () => setSideBySide(orbit.offsetLeft > col.offsetLeft + 40)
    const ro = new ResizeObserver(check)
    ro.observe(col.parentElement)
    check()
    return () => ro.disconnect()
  }, [])
  const [openRow, setOpenRow] = useState(null)
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const { displayedText, isDeleting } = useTypewriter({
    text: DAYS_NOTE,
    typingSpeed: 60,
    deletingSpeed: 25,
    pauseDuration: 3800,
    deletePauseDuration: 900,
    loop: !reducedMotion,
  })
  // Reduced motion skips the typing and shows the merged end state.
  const noteText = reducedMotion ? DAYS_NOTE : displayedText || '​'
  const merged = reducedMotion || (displayedText === DAYS_NOTE && !isDeleting)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const onScroll = () => {
      const el = scaleRef.current
      if (!el) return
      // The shrink-on-scroll parallax only makes sense on desktop where the
      // orbit sits beside the text; on stacked mobile layouts it leaves the
      // animation small and offset while it is still in view.
      if (window.innerWidth < 820) {
        el.style.transform = 'none'
        el.style.opacity = '1'
        return
      }
      const y = window.scrollY
      const h = window.innerHeight
      const p = Math.min(1, Math.max(0, y / (h * 0.9)))
      el.style.transform = `scale(${1 - p * 0.16}) translateY(${-p * 40}px)`
      el.style.opacity = String(1 - p * 0.55)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const handleBtnClick = rippleClick

  return (
    <section id="top" className="hero">
      <div className="hero__dots" />
      <div className="hero__glow" />

      <div className="hero__grid">
        <div className="hero__col" ref={colRef}>
          {/* <div className="hero__badge">
            <span className="hero__badge-dot" />
            <span className="hero__badge-text">LIVE INTERACTIVE WEBINAR</span>
          </div> */}

          {/* Wrapped so the column's gap doesn't land between the heading and the date. */}
          <div>
            <p className="hero__quote" aria-label="“AI won’t replace you. Someone using AI will.”">
              <span className="hero__quote-line">Master Microsoft Copilot</span>
              <span className="hero__quote-line">
                <span className="hero__quote-gradient">Register Webinar Now</span>
              </span>
            </p>
            <div className="hero__when">
              <p className="hero__date">
                <CalendarDays aria-hidden="true" />
                {WEBINAR_DATE}
              </p>
              {/* The note types itself out; when it finishes, Day 2 tucks in
                  behind Day 1 and that chip flips to "1 Day". Deleting the
                  note undoes it, so the merge replays with every cycle. */}
              <p className={`hero__days${merged ? ' is-merged' : ''}`}>
                <span className="hero__days-pill" aria-hidden="true">
                  <span className="hero__flip">
                    <span className="hero__chip">Day 1</span>
                    <span className="hero__chip hero__chip--one hero__flip-back">1 Day</span>
                  </span>
                  <span className="hero__days-plus">+</span>
                  <span className="hero__chip hero__chip--2">Day 2</span>
                </span>
                <span className="sr-only">Day 1 and Day 2 {DAYS_NOTE.toLowerCase()}</span>
                <span className="hero__days-note" aria-hidden="true">
                  {noteText}
                  {!reducedMotion && <span className="hero__days-cursor" />}
                </span>
              </p>
            </div>
            {/* The main offer (the one the Meta ads promote) sits up here, not in the table. */}
            <SaleBanner />
            <div className="hero__cta">
              <a href={HERO_PRICES[0].url} target="_blank" rel="noopener noreferrer" className="btn-primary" onClick={handleBtnClick}>
                Register <span className="btn-price-highlight"><SalePrice price={HERO_PRICES[0].price} originalPrice={HERO_PRICES[0].originalPrice} /></span>
                <span className="btn-shine" aria-hidden="true" />
              </a>
              <button type="button" className="hero__details-btn" onClick={() => setOpenRow(0)}>
                View details
              </button>
            </div>
          </div>

          {/* The page's real heading for crawlers and screen readers; the visible
              lines above say the same thing in the hero's own voice. */}
          <h1 className="sr-only">Microsoft 365 Copilot Masterclass — 1-Day Live Online Program</h1>

          <p className="hero__subtitle">Other Copilot 365 Programs</p>

          {/* <p className="hero__desc">
            Discover how Microsoft Copilot, Microsoft 365 and intelligent automation help professionals
            automate repetitive work, analyse information faster, create content and improve everyday productivity.
          </p> */}

          <table className="hero__price-table">
            <thead>
              <tr><th>Program</th><th>Details</th><th>Register</th></tr>
            </thead>
            <tbody>
              {HERO_PRICES.map(({ name, hidden, url }, i) => {
                if (i === 0 || hidden) return null // [0] is the main offer, shown above the table
                return (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>
                      <button type="button" className="hero__details-btn" onClick={() => setOpenRow(i)}>
                        View details
                      </button>
                    </td>
                    <td>
                      {/* Opens this program's payment page. */}
                      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary" onClick={rippleClick}>
                        Register <ArrowRight aria-hidden="true" />
                        <span className="btn-shine" aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!sideBySide && <TrainerProfile />}

          <CourseDialog course={openRow !== null ? HERO_PRICES[openRow] : null} onClose={() => setOpenRow(null)} />
        </div>

        <div className="hero__orbit-wrap" ref={orbitRef}>
          {sideBySide && <TrainerProfile />}
          <div className="hero__orbit-scale" ref={scaleRef}>
            <CopilotOrbit />
          </div>
        </div>
      </div>
    </section>
  )
}
