import useReveal from '../hooks/useReveal.js'
import { AUDIENCE } from '../data/content.js'
import AudienceGlyph from './ui/AudienceGlyph.jsx'

function AudienceCard({ person, accent }) {
  const ref = useReveal()

  // The reveal hook owns the cell's transform, so the card underneath is free
  // to run its own, faster hover transition.
  const track = (e) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px')
    el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px')
  }

  return (
    <div ref={ref} className="aud-cell">
      <article className={`aud-card aud-card--${accent}`} onMouseEnter={track} onMouseMove={track}>
        <span className="aud-card__spot" aria-hidden="true" />
        <span className="aud-card__num" aria-hidden="true">{person.n}</span>
        <span className="aud-card__icon" aria-hidden="true">
          <AudienceGlyph icon={person.icon} />
          <i className="aud-card__sheen" />
        </span>
        <h3 className="aud-card__title">{person.t}</h3>
        <p className="aud-card__desc">{person.d}</p>
        <span className="aud-card__bar" />
      </article>
    </div>
  )
}

export default function Audience() {
  const headRef = useReveal()
  return (
    <section className="section--subtle" style={{ padding: 'var(--section-pad)' }}>
      <div className="section__inner" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div ref={headRef} className="section-head" style={{ maxWidth: 700, marginBottom: 44 }}>
          <div className="eyebrow eyebrow--teal">WHO IT IS FOR</div>
          <h2 className="h2" style={{ marginBottom: 12 }}>Who Should Attend?</h2>
          <p style={{ fontSize: 16 }}>Built for teams who already work in Microsoft 365 and want to work smarter.</p>
        </div>
        <div className="audience-grid">
          {AUDIENCE.map((p, i) => (
            <AudienceCard key={p.n} person={p} accent={i % 2 === 0 ? 'green' : 'blue'} />
          ))}
        </div>
      </div>
    </section>
  )
}
