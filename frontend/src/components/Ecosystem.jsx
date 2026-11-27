import useReveal from '../hooks/useReveal.js'
import { ECOSYSTEM } from '../data/content.js'

function EcoCard({ e }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="eco-card">
      <div className="eco-card__icon">{e.i}</div>
      <h3>{e.t}</h3>
      <p>{e.d}</p>
    </div>
  )
}

export default function Ecosystem() {
  const headRef = useReveal()
  const hubRef = useReveal()

  return (
    <section className="section--subtle" style={{ padding: 'var(--section-pad)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div ref={headRef} className="section-head" style={{ maxWidth: 720 }}>
          <div className="eyebrow eyebrow--green">WHY AMBOT365</div>
          <h2 className="h2">AI That Solves Real Business Problems</h2>
        </div>
        <div className="eco-grid">
          <div ref={hubRef} className="eco-hub">
            <div>
              <div className="eco-hub__icon">A</div>
              <div className="eco-hub__title">AmBot365 AI Ecosystem</div>
              <div className="eco-hub__sub">Five connected capabilities, one automation partner.</div>
            </div>
          </div>
          {ECOSYSTEM.map((e) => (
            <EcoCard key={e.i} e={e} />
          ))}
        </div>
      </div>
    </section>
  )
}
