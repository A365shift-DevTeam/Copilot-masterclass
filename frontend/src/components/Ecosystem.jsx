import useReveal from '../hooks/useReveal.js'

function EcoCard({ e }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="eco-card">
      <div className="eco-card__icon">{e.icon}</div>
      <h3>{e.title}</h3>
      <p>{e.text}</p>
    </div>
  )
}

export default function Ecosystem({ content }) {
  const headRef = useReveal()
  const hubRef = useReveal()

  return (
    <section className="section--subtle" style={{ padding: 'var(--section-pad)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div ref={headRef} className="section-head" style={{ maxWidth: 720 }}>
          <div className="eyebrow eyebrow--green">{content.eyebrow}</div>
          <h2 className="h2">{content.heading}</h2>
        </div>
        <div className="eco-grid">
          <div ref={hubRef} className="eco-hub">
            <div>
              <div className="eco-hub__icon">{content.hubIcon}</div>
              <div className="eco-hub__title">{content.hubTitle}</div>
              <div className="eco-hub__sub">{content.hubText}</div>
            </div>
          </div>
          {content.cards.map((e, i) => (
            <EcoCard key={i} e={e} />
          ))}
        </div>
      </div>
    </section>
  )
}
