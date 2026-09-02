import useReveal from '../hooks/useReveal.js'
import { USE_CASES } from '../data/content.js'

function UseCaseCard({ uc }) {
  const ref = useReveal()
  return (
    <div ref={ref} className="usecase-card">
      <div className="usecase-card__before">
        <div className="usecase-card__before-label">BEFORE</div>
        <div className="usecase-card__before-list">
          {uc.before.map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
      </div>
      <div className="usecase-card__after">
        <div className="usecase-card__after-label">AFTER</div>
        <div className="usecase-card__prompt">{uc.prompt}</div>
        <div className="usecase-card__tags">
          {uc.after.map((a) => (
            <span key={a}>{a}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UseCases() {
  const headRef = useReveal()
  return (
    <section className="section">
      <div ref={headRef} className="section-head" style={{ maxWidth: 760, marginBottom: 44 }}>
        <div className="eyebrow eyebrow--teal">REAL BUSINESS USE CASES</div>
        <h2 className="h2">From Daily Tasks to AI-Powered Workflows</h2>
      </div>
      <div className="usecases-grid">
        {USE_CASES.map((uc) => (
          <UseCaseCard key={uc.prompt} uc={uc} />
        ))}
      </div>
    </section>
  )
}
