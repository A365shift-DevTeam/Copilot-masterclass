import { Check } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'
import { COPILOT_ICON, PROGRAMMES } from '../data/content.js'
import BorderBeam from './ui/BorderBeam.jsx'

function PlanCard({ name, tagline, points, pkg, save, price, url, featured, offer }) {
  const ref = useReveal()
  return (
    <article ref={ref} className={`plan${featured ? ' plan--featured' : ''}`}>
      {featured && <BorderBeam duration={8} />}
      {(offer || featured) && <span className="plan__badge">{offer ? offer.badge : 'Most popular'}</span>}

      <header className="plan__head">
        <span className="plan__icon"><img src={COPILOT_ICON} alt="" /></span>
        <div>
          <h3 className="plan__name">{name}</h3>
          <p className="plan__tagline">{tagline}</p>
        </div>
      </header>

      <div className="plan__price-block">
        <div className="plan__was">
          <s>{pkg}</s>
          <span className="plan__save">Save {save}</span>
        </div>
        <div className="plan__price">{price}</div>
      </div>

      <ul className="plan__features">
        {points.map((p) => (
          <li key={p}><Check aria-hidden="true" />{p}</li>
        ))}
      </ul>

      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary plan__cta">
          Pay now
          <span className="btn-shine" />
        </a>
      )}
    </article>
  )
}

export default function Pricing() {
  const headRef = useReveal()
  return (
    <section id="pricing" className="section pricing">
      <div ref={headRef} className="section-head">
        <div className="eyebrow eyebrow--green">1:1 COACHING PROGRAMMES</div>
        <h2 className="h2">Only Limited Seats for a Month</h2>
        <p>Personal coaching after the webinar. Pick the track that fits your goal.</p>
      </div>
      <div className="plans">
        {PROGRAMMES.filter((p) => !p.hidden).map((p) => <PlanCard key={p.key} {...p} />)}
      </div>
    </section>
  )
}
