import useReveal from '../hooks/useReveal.js'
import { EXPERTISE } from '../data/content.js'

export default function Speaker() {
  const photoRef = useReveal()
  const bioRef = useReveal()

  return (
    <section id="speaker" className="speaker-section">
      <img className="speaker-section__circuit" src="/assets/illustration-circuit-large.png" alt="" aria-hidden="true" />
      <svg className="speaker-section__svg" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
        <g stroke="#308BAF" strokeWidth="1" fill="none" strokeOpacity="0.55">
          <path d="M40 340 H180 V220 H320 V120 H520 V240 H700" />
          <path d="M80 60 V160 H260 V300 H460 V360 H760" />
          <path d="M600 40 V140 H420 V200" />
        </g>
        <g fill="#3FC073">
          <circle cx="180" cy="220" r="4" /><circle cx="320" cy="120" r="4" /><circle cx="520" cy="240" r="4" />
          <circle cx="260" cy="300" r="4" /><circle cx="460" cy="360" r="4" /><circle cx="420" cy="200" r="4" />
        </g>
        <path d="M40 340 H180 V220 H320 V120 H520 V240 H700" stroke="#6BD194" strokeWidth="2" fill="none" strokeDasharray="24 300" style={{ animation: 'om-flow 6s linear infinite' }} />
      </svg>
      <div className="speaker-grid">
        <div ref={photoRef} className="speaker-photo">
          <div>
            <div className="speaker-photo__initials">AD</div>
            <div className="speaker-photo__note">Founder photograph<br />placeholder</div>
          </div>
        </div>
        <div ref={bioRef}>
          <div className="eyebrow eyebrow--lime">YOUR TRAINER</div>
          <h2 className="speaker__name">Ambrose Denny</h2>
          <div className="speaker__role">Founder &amp; CEO — AmBot365</div>
          <div className="speaker__tags">AI • Automation • Microsoft 365 Solutions</div>
          <p className="speaker__bio">
            18+ years of professional experience across India, UAE and Saudi Arabia, focused on business
            automation, artificial intelligence, Microsoft 365, Copilot integration and digital transformation.
          </p>
          <div className="speaker__pills">
            {EXPERTISE.map((e) => (
              <span key={e}>{e}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
