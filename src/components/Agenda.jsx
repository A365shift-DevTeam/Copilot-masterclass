import useReveal from '../hooks/useReveal.js'
import { AGENDA } from '../data/content.js'

function AgendaStep({ item }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="agenda-step">
      <div className="agenda-step__track">
        <span className="agenda-step__num">{item.n}</span>
        <span className="agenda-step__line" />
        <span className="agenda-step__dot" />
      </div>
      <div className="agenda-step__time">{item.time}</div>
      <h3 className="agenda-step__title">{item.t}</h3>
      <p className="agenda-step__desc">{item.d}</p>
    </div>
  )
}

export default function Agenda() {
  const headRef = useReveal()
  const panelRef = useReveal()

  return (
    <section id="agenda" className="agenda-section">
      <div ref={headRef} className="section-head" style={{ maxWidth: 'none', marginBottom: 40 }}>
        <div className="eyebrow eyebrow--green">WEBINAR AGENDA</div>
        <h2 className="h2" style={{ fontSize: 'clamp(27px,3.2vw,42px)' }}>What You Will Master</h2>
        <span className="agenda-rule" />
      </div>
      <div id="learn" ref={panelRef} className="agenda-panel">
        <div className="agenda-flow">
          {AGENDA.map((item) => (
            <AgendaStep key={item.n} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
