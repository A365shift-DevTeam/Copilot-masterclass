import useReveal from '../hooks/useReveal.js'
import { BENEFITS } from '../data/content.js'

function BenefitCard({ b }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="benefit-card">
      <div className="benefit-card__icon">{b.i}</div>
      <h3>{b.t}</h3>
      <p>{b.d}</p>
    </div>
  )
}

export default function Benefits() {
  const headRef = useReveal()
  return (
    <section className="section">
      <div ref={headRef} className="section-head" style={{ maxWidth: 'none', marginBottom: 44 }}>
        <h2 className="h2">What You Get</h2>
      </div>
      <div className="benefits-grid">
        {BENEFITS.map((b) => (
          <BenefitCard key={b.i} b={b} />
        ))}
      </div>
    </section>
  )
}
