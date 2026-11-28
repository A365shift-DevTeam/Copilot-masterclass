import { Check } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'
import { COPILOT_ICON, PROGRAMMES, label } from '../data/content.js'
import BorderBeam from './ui/BorderBeam.jsx'

function PlanCard({ name, tagline, points, pkg, save, price, url, featured, offer, saveLabel, buttonLabel }) {
  const ref = useReveal()
  return (
    <article ref={ref} className={`plan${featured ? ' plan--featured' : ''}`}>
      {featured && <BorderBeam duration={8} />}
      {(offer || featured) && <span className="plan__badge">{offer ? offer.badge : label('popularLabel')}</span>}

      <header className="plan__head">
        <span className="plan__icon"><img src={COPILOT_ICON} alt="" /></span>
        <div>
          <h3 className="plan__name">{name}</h3>
          <p className="plan__tagline">{tagline}</p>
        </div>
      </header>

      <div className="plan__price-block">
        {pkg && (
          <div className="plan__was">
            <s>{pkg}</s>
            <span className="plan__save">{saveLabel} {save}</span>
          </div>
        )}
        <div className="plan__price">{price}</div>
      </div>

      <ul className="plan__features">
        {points.map((p, i) => (
          <li key={i}><Check aria-hidden="true" />{p}</li>
        ))}
      </ul>

      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary plan__cta">
          {buttonLabel}
          <span className="btn-shine" />
        </a>
      )}
    </article>
  )
}

/* Each plan's tagline and points are this section's content; name, prices and link come from Pricing & dates. */
export default function Pricing({ content }) {
  const headRef = useReveal()
  return (
    <section id="pricing" className="section pricing">
      <div ref={headRef} className="section-head">
        <div className="eyebrow eyebrow--green">{content.eyebrow}</div>
        <h2 className="h2">{content.heading}</h2>
        <p>{content.intro}</p>
      </div>
      <div className="plans">
        {content.plans
          .map((plan) => ({ ...PROGRAMMES.find((p) => p.key === plan.key), ...plan, featured: plan.badge === 'popular' }))
          .filter((p) => p.name && !p.hidden)
          .map((p, i) => <PlanCard key={i} {...p} saveLabel={content.saveLabel} buttonLabel={content.buttonLabel} />)}
      </div>
    </section>
  )
}
