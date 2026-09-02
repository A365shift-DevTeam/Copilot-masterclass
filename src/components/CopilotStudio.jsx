import useReveal from '../hooks/useReveal.js'
import { FLOW_STEPS, AGENT_CAPS } from '../data/content.js'

export default function CopilotStudio() {
  const leftRef = useReveal()
  const rightRef = useReveal()

  return (
    <section className="section--subtle" style={{ padding: 'var(--section-pad)' }}>
      <div className="studio-grid">
        <div ref={leftRef}>
          <div className="eyebrow eyebrow--teal">COPILOT STUDIO</div>
          <h2 className="h2 studio__title">Build Your Own AI Agents with Copilot Studio</h2>
          <p className="studio__desc">
            See how organisations create intelligent agents connected to their business information
            and the Microsoft ecosystem — no developer support required.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {FLOW_STEPS.map((s) => (
              <div key={s.n}>
                <div className="flow-step">
                  <span className="flow-step__num">{s.n}</span>
                  <span className="flow-step__label">{s.label}</span>
                </div>
                <div className="flow-connector" />
              </div>
            ))}
            <div className="flow-step flow-step--result">
              <span className="flow-step__num">✓</span>
              <span className="flow-step__label">Result delivered</span>
            </div>
          </div>
        </div>

        <div ref={rightRef} className="agent-panel">
          <div className="agent-panel__head">
            <div className="agent-panel__id">
              <span className="agent-panel__avatar">CS</span>
              <div>
                <div className="agent-panel__name">Customer Support Agent</div>
                <div className="agent-panel__status"><i />Online</div>
              </div>
            </div>
            <span className="agent-panel__tag">copilot studio</span>
          </div>
          <div className="agent-panel__caps">
            {AGENT_CAPS.map((cap) => (
              <div key={cap} className="agent-cap"><i />{cap}</div>
            ))}
          </div>
          <svg className="agent-panel__svg" viewBox="0 0 400 60" preserveAspectRatio="none">
            <path d="M10 30 H130 M150 30 H270 M290 30 H390" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" fill="none" />
            <path d="M10 30 H130 M150 30 H270 M290 30 H390" stroke="#8BBF2F" strokeWidth="1.8" fill="none" strokeDasharray="18 120" style={{ animation: 'om-flow 3.4s linear infinite' }} />
            <circle cx="140" cy="30" r="5" fill="#0C576A" stroke="#75B734" strokeWidth="1.5" />
            <circle cx="280" cy="30" r="5" fill="#0C576A" stroke="#128CA8" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </section>
  )
}
