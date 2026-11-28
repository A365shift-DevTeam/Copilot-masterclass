import useReveal from '../hooks/useReveal.js'
import { PAYMENT_URL } from '../data/content.js'

export default function FinalCta({ content }) {
  const ref = useReveal()
  return (
    <section className="cta-section">
      <div className="cta-section__halo" />
      <div className="cta-section__dots" />
      <img className="cta-section__circuit" src="/assets/illustration-circuit-large.png" alt="" aria-hidden="true" />
      <div ref={ref} className="cta-section__inner">
        <h2>{content.heading}</h2>
        <p>{content.text}</p>
        <a href={PAYMENT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
          {content.button}
          <span className="btn-shine" />
        </a>
      </div>
    </section>
  )
}
