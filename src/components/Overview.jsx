import { useRef } from 'react'
import useReveal from '../hooks/useReveal.js'
import { APP_CARDS } from '../data/content.js'

function AppCard({ card }) {
  const ref = useReveal()
  const glowRef = useRef(null)

  const onMove = (e) => {
    const glow = glowRef.current
    if (!glow) return
    const r = e.currentTarget.getBoundingClientRect()
    glow.style.opacity = '1'
    glow.style.transform = `translate(${e.clientX - r.left - 140}px, ${e.clientY - r.top - 140}px)`
  }
  const onLeave = () => {
    if (glowRef.current) glowRef.current.style.opacity = '0'
  }

  return (
    <div ref={ref} className="app-card" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div ref={glowRef} className="app-card__glow" />
      <div className="app-card__mark" style={{ background: card.tint, color: card.color }}>{card.mark}</div>
      <h3>{card.title}</h3>
      <div className="app-card__points">
        {card.points.map((p) => (
          <span key={p}><span className="dot">·</span>{p}</span>
        ))}
      </div>
    </div>
  )
}

export default function Overview() {
  const headRef = useReveal()

  return (
    <section id="overview" className="section">
      <div ref={headRef} className="section-head">
        <div className="eyebrow eyebrow--green">MICROSOFT 365 + COPILOT</div>
        <h2 className="h2" style={{ fontSize: 'clamp(27px,3.2vw,42px)', lineHeight: 1.14 }}>Master Copilot Across Microsoft 365</h2>
        <p>Learn how AI transforms the applications you already use every day.</p>
      </div>

      <div className="cards-grid">
        {APP_CARDS.map((card) => (
          <AppCard key={card.title} card={card} />
        ))}
      </div>
    </section>
  )
}
