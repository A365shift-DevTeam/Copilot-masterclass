import { useEffect, useRef } from 'react'
import CopilotOrbit from './CopilotOrbit.jsx'
import { HERO_CHECKS, HERO_TITLE_PHRASES } from '../data/content.js'
import useTypewriter from '../hooks/useTypewriter.js'

export default function Hero() {
  const scaleRef = useRef(null)
  const { displayedText: titleText } = useTypewriter({
    text: HERO_TITLE_PHRASES,
    typingSpeed: 65,
    deletingSpeed: 30,
    pauseDuration: 1600,
    deletePauseDuration: 350,
    loop: true,
  })

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
        <div className="hero__col">
          {/* <div className="hero__badge">
            <span className="hero__badge-dot" />
            <span className="hero__badge-text">LIVE INTERACTIVE WEBINAR</span>
          </div> */}

          <p className="hero__quote" aria-label="“AI won’t replace you. Someone using AI will.”">
            <span className="hero__quote-line">Master Microsoft Copilot</span>
            <span className="hero__quote-line">
              <span className="hero__quote-gradient">Join the Webinar</span>
            </span>
          </p>

          <h1 className="hero__title" aria-label={HERO_TITLE_PHRASES.join(' / ')}>
            <br />
            <span className="hero__title-typed" aria-hidden="true">
              <span className="hero__title-gradient">{titleText || '\u200B'}</span>
              <span className="hero__title-cursor" />
            </span>
          </h1>

          <p className="hero__subtitle">2-Day Live Online Program</p>

          {/* <p className="hero__desc">
            Discover how Microsoft Copilot, Microsoft 365 and intelligent automation help professionals
            automate repetitive work, analyse information faster, create content and improve everyday productivity.
          </p> */}

          <div className="hero__ctas">
            <a href="#register" className="btn-primary" onClick={handleBtnClick}>
              “Reserve your seat for just{' '}<span className="btn-price-highlight">₹499</span>”
              <span className="btn-shine" />
            </a>
            {/* <a href="#agenda" className="btn-outline">View Webinar Agenda</a> */}
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
