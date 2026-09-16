import useReveal from '../hooks/useReveal.js'
import { PAYMENT_URL } from '../data/content.js'

export default function FinalCta() {
  const ref = useReveal()
  return (
    <section className="cta-section">
      <div className="cta-section__halo" />
      <div className="cta-section__dots" />
      <img className="cta-section__circuit" src="/assets/illustration-circuit-large.png" alt="" aria-hidden="true" />
      <div ref={ref} className="cta-section__inner">
        <h2>The Future of Work Is Already Here.</h2>
        <p>Learn how to work smarter with Microsoft 365 + Copilot + AI.</p>
        <a href={PAYMENT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
          Reserve Your Seat
          <span className="btn-shine" />
        </a>
      </div>
    </section>
  )
}
