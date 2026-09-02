import { useEffect, useRef } from 'react'
import useReveal from '../hooks/useReveal.js'
import { AGENDA } from '../data/content.js'

function AgendaItem({ item }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="agenda-item">
      <span className="agenda-item__node" />
      <span className="agenda-item__num">{item.n}</span>
      <span className="agenda-item__title">{item.t}</span>
    </div>
  )
}

export default function Agenda() {
  const headRef = useReveal()
  const fillRef = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      const fill = fillRef.current
      if (!fill) return
      const box = fill.parentElement.getBoundingClientRect()
      const prog = Math.min(1, Math.max(0, (window.innerHeight * 0.75 - box.top) / box.height))
      fill.style.height = prog * (box.height - 16) + 'px'
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section id="agenda" className="agenda-section">
      <div ref={headRef} className="section-head" style={{ maxWidth: 'none', marginBottom: 48 }}>
        <div className="eyebrow eyebrow--green">WEBINAR AGENDA</div>
        <h2 className="h2" style={{ fontSize: 'clamp(27px,3.2vw,42px)' }}>What You Will Master</h2>
      </div>
      <div id="learn" className="agenda-timeline">
        <div className="agenda-timeline__rail" />
        <div ref={fillRef} className="agenda-timeline__fill" />
        <div className="agenda-list">
          {AGENDA.map((item) => (
            <AgendaItem key={item.n} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
