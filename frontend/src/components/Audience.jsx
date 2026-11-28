import useReveal from '../hooks/useReveal.js'
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
        <h3 className="aud-card__title">{person.title}</h3>
        <p className="aud-card__desc">{person.text}</p>
        <span className="aud-card__bar" />
      </article>
    </div>
  )
}

export default function Audience({ content }) {
  const headRef = useReveal()
  return (
    <section className="section--subtle" style={{ padding: 'var(--section-pad)' }}>
      <div className="section__inner" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div ref={headRef} className="section-head" style={{ maxWidth: 700, marginBottom: 44 }}>
          <div className="eyebrow eyebrow--teal">{content.eyebrow}</div>
          <h2 className="h2" style={{ marginBottom: 12 }}>{content.heading}</h2>
          <p style={{ fontSize: 16 }}>{content.intro}</p>
        </div>
        <div className="audience-grid">
          {content.people.map((p, i) => (
            <AudienceCard key={i} person={p} accent={i % 2 === 0 ? 'green' : 'blue'} />
          ))}
        </div>
      </div>
    </section>
  )
}
