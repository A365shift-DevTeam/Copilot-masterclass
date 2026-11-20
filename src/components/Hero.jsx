import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, CalendarDays, Check, X } from 'lucide-react'
import CopilotOrbit from './CopilotOrbit.jsx'
import TrainerProfile from './TrainerProfile.jsx'
import { COPILOT_ICON, WEBINAR_DATE, HERO_PRICES } from '../data/content.js'
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

  const handleBtnClick = (e) => {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    const ripple = document.createElement('span')
    ripple.className = 'btn-ripple'
    ripple.style.left = `${e.clientX - rect.left}px`
    ripple.style.top = `${e.clientY - rect.top}px`
    btn.appendChild(ripple)
    setTimeout(() => ripple.remove(), 700)
  }

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
                <span className="hero__quote-gradient">Register for the Webinar Now</span>
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
          </div>

          {/* The page's real heading for crawlers and screen readers; the visible
              lines above say the same thing in the hero's own voice. */}
          <h1 className="sr-only">Microsoft 365 Copilot Masterclass — 1-Day Live Online Program</h1>

          <p className="hero__subtitle">Copilot 365 Programs</p>

          {/* <p className="hero__desc">
            Discover how Microsoft Copilot, Microsoft 365 and intelligent automation help professionals
            automate repetitive work, analyse information faster, create content and improve everyday productivity.
          </p> */}

          <table className="hero__price-table">
            <thead>
              <tr><th>Program</th><th>Details</th><th>Price</th></tr>
            </thead>
            <tbody>
              {HERO_PRICES.map(({ name, price, url }, i) => {
                const label = <>Register ₹{price.toLocaleString('en-IN')} <ArrowRight aria-hidden="true" /></>
                // The first row is the offer the Meta ads promote, so it gets the highlight.
                const featured = i === 0
                return (
                  <tr key={name} className={featured ? 'hero__price-row--featured' : undefined}>
                    <td>{name}</td>
                    <td>
                      <button type="button" className="hero__details-btn" onClick={() => setOpenRow(i)}>
                        View details
                      </button>
                    </td>
                    <td>
                      <a href={url} className="btn-primary" onClick={handleBtnClick}>{label}<span className="btn-shine" aria-hidden="true" /></a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!sideBySide && <TrainerProfile />}

          {/* Built on LegalDialog's base styles (.legal-dialog) for theming, focus and animation;
              .course-dialog restyles the inside. */}
          <Dialog.Root open={openRow !== null} onOpenChange={(o) => { if (!o) setOpenRow(null) }}>
            {openRow !== null && (() => {
              const { title, meta, facts, descLead, desc, pointsHeading, points, price, url } = HERO_PRICES[openRow]
              return (
                <Dialog.Portal>
                  <Dialog.Overlay className="legal-dialog__overlay" />
                  <Dialog.Content className="legal-dialog course-dialog" aria-describedby={undefined}>
                    <Dialog.Close className="course-dialog__close" aria-label="Close">
                      <X size={18} aria-hidden />
                    </Dialog.Close>
                    <div className="course-dialog__body" data-lenis-prevent>
                      <div className="eyebrow eyebrow--green">AMBOT365 · COURSE DETAILS</div>
                      <header className="plan__head">
                        <span className="plan__icon"><img src={COPILOT_ICON} alt="" /></span>
                        <Dialog.Title className="plan__name">{title}</Dialog.Title>
                      </header>
                      {meta && <p className="course-dialog__meta"><CalendarDays aria-hidden="true" />{meta}</p>}
                      {facts?.map(([label, value]) => (
                        <p key={label} className="course-dialog__fact"><strong>{label}:</strong> {value}</p>
                      ))}
                      {desc && (
                        <p className="course-dialog__desc">
                          {descLead && <><strong>{descLead}</strong>{' '}</>}
                          {desc}
                        </p>
                      )}
                      {pointsHeading && <h3 className="course-dialog__heading">{pointsHeading}</h3>}
                      {points && (
                        <ul className="plan__features">
                          {points.map((p) => <li key={p}><Check aria-hidden="true" />{p}</li>)}
                        </ul>
                      )}
                    </div>
                    <footer className="course-dialog__footer">
                      <div>
                        <p className="course-dialog__fee-label">Program fee</p>
                        <p className="plan__price course-dialog__fee">₹{price.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="course-dialog__actions">
                        <Dialog.Close className="course-dialog__ghost">Close</Dialog.Close>
                        <a href={url} className="btn-primary" onClick={handleBtnClick}>
                          Register <ArrowRight aria-hidden="true" />
                          <span className="btn-shine" />
                        </a>
                      </div>
                    </footer>
                  </Dialog.Content>
                </Dialog.Portal>
              )
            })()}
          </Dialog.Root>
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
