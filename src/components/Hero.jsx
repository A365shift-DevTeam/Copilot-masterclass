import { useEffect, useRef } from 'react'
import CopilotOrbit from './CopilotOrbit.jsx'
import { HERO_CHECKS } from '../data/content.js'

export default function Hero() {
  const scaleRef = useRef(null)

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

  return (
    <section id="top" className="hero">
      <div className="hero__dots" />
      <div className="hero__glow" />

      <div className="hero__grid">
        <div className="hero__col">
          {/* <div className="hero__badge">
            <span className="hero__badge-dot" />
            <span className="hero__badge-text">LIVE INTERACTIVE WEBINAR</span>
          </div> */}

          <h1 className="hero__title">
            Master<br />Microsoft 365<br />
            <span className="hero__title-gradient">Copilot &amp; AI</span>
          </h1>

          <p className="hero__subtitle">Transform the way you work with Microsoft 365 + AI</p>

          <p className="hero__desc">
            Discover how Microsoft Copilot, Microsoft 365 and intelligent automation help professionals
            automate repetitive work, analyse information faster, create content and improve everyday productivity.
          </p>

          <div className="hero__ctas">
            <a href="#register" className="btn-primary">
              Reserve My Seat
              <span className="btn-shine" />
            </a>
            <a href="#agenda" className="btn-outline">View Webinar Agenda</a>
          </div>

          <div className="hero__checks">
            {HERO_CHECKS.map((c) => (
              <span key={c} className="check-item"><span className="tick">✓</span> {c}</span>
            ))}
          </div>
        </div>

        <div className="hero__orbit-wrap">
          <div className="hero__orbit-scale" ref={scaleRef}>
            <CopilotOrbit />
          </div>
        </div>
      </div>
    </section>
  )
}
