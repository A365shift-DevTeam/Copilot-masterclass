import { CircleCheck } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'
import { STUDIO_POINTS } from '../data/content.js'
import AgentAnimation from './ui/AgentAnimation.jsx'

export default function CopilotStudio() {
  const leftRef = useReveal()
  const rightRef = useReveal()

  return (
    <section className="section--subtle" style={{ padding: 'var(--section-pad)' }}>
      <div className="studio-grid">
        <div ref={leftRef}>
          <div className="eyebrow eyebrow--teal">GO BEYOND AUTOMATION</div>
          <h2 className="h2 studio__title">
            Build Your Own AI Agents with <span className="text-gradient">Copilot Studio</span>
          </h2>
          <p className="studio__desc">
            Create intelligent AI agents that understand your business, talk to your data
            and automate work for you — 24/7.
          </p>

          <ul className="studio-points">
            {STUDIO_POINTS.map((point) => (
              <li key={point} className="studio-point">
                <CircleCheck className="studio-point__tick" strokeWidth={2} aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div ref={rightRef}>
          <AgentAnimation />
        </div>
      </div>
    </section>
  )
}
