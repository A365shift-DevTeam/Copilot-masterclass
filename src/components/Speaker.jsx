import useReveal from '../hooks/useReveal.js'
import { EXPERTISE, TRAINER } from '../data/content.js'
import ReserveSeatButton from './ReserveSeatButton.jsx'
import FeedbackStrip from './FeedbackStrip.jsx'
import BorderBeam from './ui/BorderBeam.jsx'
import FounderVoice from './ui/FounderVoice.jsx'

export default function Speaker() {
  const photoRef = useReveal()
  const bioRef = useReveal()

  return (
    <section id="speaker" className="speaker-section">
      <div className="speaker-grid">
        <div ref={photoRef} className="speaker-photo">
          <img
            className="speaker-photo__img"
            src="/assets/fonunder.jpeg"
            alt="Ambrose Denny, Founder and CEO of AmBot365 — automate, simplify, transform: RPA, Microsoft 365, AI and analytics, digital solutions"
            width="1254"
            height="1254"
            loading="lazy"
            decoding="async"
          />
          <BorderBeam className="speaker-photo__beam" duration={8} borderWidth={3} />
        </div>
        <div ref={bioRef}>
          <div className="eyebrow eyebrow--lime">MEET THE FOUNDER</div>
          <div className="speaker__name-row">
            <h2 className="speaker__name">Ambrose Denny</h2>
            <FounderVoice />
          </div>
          <div className="speaker__role">Founder &amp; CEO — AmBot365</div>
          <div className="speaker__tags">AI • Automation • Microsoft 365 Solutions</div>
          {TRAINER.bio.map((p) => <p key={p.slice(0, 24)} className="speaker__bio">{p}</p>)}
          <div className="speaker__pills">
            {EXPERTISE.map((e) => (
              <span key={e.v}>
                <b>{e.v}</b>
                {e.l}
              </span>
            ))}
          </div>
          {/* Ends the bio rather than the section: the ask follows the person
              making it, on the same left edge as his name. */}
          <ReserveSeatButton className="section-cta--start" />
        </div>
      </div>

      {/* Social proof sits with the person it is about, closing his section
          rather than opening one of its own. */}
      <FeedbackStrip />
    </section>
  )
}
