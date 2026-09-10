import useReveal from '../hooks/useReveal.js'
import AgendaDeck from './ui/AgendaDeck.jsx'
import AgentAnimation from './ui/AgentAnimation.jsx'

export default function CopilotStudio() {
  const leftRef = useReveal()
  const rightRef = useReveal()

  return (
    <section className="section--subtle" style={{ padding: 'var(--section-pad)' }}>
      <div className="studio-grid">
        <div ref={leftRef}>
          <AgendaDeck />
        </div>

        <div ref={rightRef}>
          <AgentAnimation />
        </div>
      </div>
    </section>
  )
}
