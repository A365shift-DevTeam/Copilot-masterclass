import useReveal from '../hooks/useReveal.js'

function UseCaseCard({ uc, beforeLabel, afterLabel }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="usecase-card">
      <div className="usecase-card__before">
        <div className="usecase-card__before-label">{beforeLabel}</div>
        <div className="usecase-card__before-list">
          {uc.before.map((b, i) => (
            <span key={i}>{b}</span>
          ))}
        </div>
      </div>
      <div className="usecase-card__after">
        <div className="usecase-card__after-label">{afterLabel}</div>
        <div className="usecase-card__prompt">{uc.prompt}</div>
        <div className="usecase-card__tags">
          {uc.after.map((a, i) => (
            <span key={i}>{a}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UseCases({ content }) {
  const headRef = useReveal()
  return (
    <section className="section">
      <div ref={headRef} className="section-head" style={{ maxWidth: 760, marginBottom: 44 }}>
        <div className="eyebrow eyebrow--teal">{content.eyebrow}</div>
        <h2 className="h2">{content.heading}</h2>
      </div>
      <div className="usecases-grid">
        {content.cases.map((uc, i) => (
          <UseCaseCard key={i} uc={uc} beforeLabel={content.beforeLabel} afterLabel={content.afterLabel} />
        ))}
      </div>
    </section>
  )
}
