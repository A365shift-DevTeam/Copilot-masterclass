import useReveal from '../hooks/useReveal.js'
import { SHARED } from '../data/content.js'

function AgendaStep({ item }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="agenda-step">
      <div className="agenda-step__track">
        <span className="agenda-step__num">{item.n}</span>
        <span className="agenda-step__line" />
        <span className="agenda-step__dot" />
      </div>
      <div className="agenda-step__time">{item.day}</div>
      <h3 className="agenda-step__title">{item.title}</h3>
      <ul className="agenda-step__desc">
        {item.points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
    </div>
  )
}

/* The heading is this section's; the cards are the shared agenda (Site-wide content > Webinar agenda),
   which the deck in "What you'll learn" shows too. */
export default function Agenda({ content, anchor }) {
  const headRef = useReveal()
  const panelRef = useReveal()

  return (
    <section id={anchor?.slice(1)} className="agenda-section">
      <div ref={headRef} className="section-head" style={{ maxWidth: 'none', marginBottom: 40 }}>
        <div className="eyebrow eyebrow--green">{content.eyebrow}</div>
        <h2 className="h2" style={{ fontSize: 'clamp(27px,3.2vw,42px)' }}>{content.heading}</h2>
        <span className="agenda-rule" />
      </div>
      <div ref={panelRef} className="agenda-panel">
        <div className="agenda-flow">
          {(SHARED['agenda-items']?.items ?? []).map((item, i) => (
            <AgendaStep key={i} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
