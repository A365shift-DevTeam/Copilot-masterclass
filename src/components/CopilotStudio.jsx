import useReveal from '../hooks/useReveal.js'
import AgendaDeck from './ui/AgendaDeck.jsx'
import AgentAnimation from './ui/AgentAnimation.jsx'
import ReserveSeatButton from './ReserveSeatButton.jsx'

export default function CopilotStudio() {
  const leftRef = useReveal()
  const rightRef = useReveal()

  return (
    <section id="learn" className="section--subtle" style={{ padding: 'var(--section-pad)' }}>
      <div className="studio-grid">
        <div ref={leftRef}>
          <AgendaDeck />
          {/* In the deck's column, on its text edge — the diagram beside it
              keeps the wider half and stays uninterrupted. */}
          <ReserveSeatButton className="section-cta--start" />
        </div>

        <div ref={rightRef}>
          <AgentAnimation />
        </div>
      </div>
    </section>
  )
}
