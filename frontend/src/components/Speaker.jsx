import useReveal from '../hooks/useReveal.js'
import { SHARED } from '../data/content.js'
import ReserveSeatButton from './ReserveSeatButton.jsx'
import FeedbackStrip from './FeedbackStrip.jsx'
import BorderBeam from './ui/BorderBeam.jsx'
import FounderVoice from './ui/FounderVoice.jsx'

/* The name, tags, bio and figures are the trainer profile (Site-wide content); the rest is this section's content. */
export default function Speaker({ content }) {
  const T = SHARED.trainer ?? { bio: [], expertise: [] }
  const photoRef = useReveal()
  const bioRef = useReveal()

  return (
    <section id="speaker" className="speaker-section">
      <div className="speaker-grid">
        <div ref={photoRef} className="speaker-photo">
          <img
            className="speaker-photo__img"
            src="/assets/fonunder-800.webp"
            alt={content.photoAlt}
            width="800"
            height="800"
            loading="lazy"
            decoding="async"
          />
          <BorderBeam className="speaker-photo__beam" duration={8} borderWidth={3} />
        </div>
        <div ref={bioRef}>
          <div className="eyebrow eyebrow--lime">{content.eyebrow}</div>
          <div className="speaker__name-row">
            <h2 className="speaker__name">{T.name}</h2>
            <FounderVoice />
          </div>
          <div className="speaker__role">{content.role}</div>
          <div className="speaker__tags">{T.tags}</div>
          {T.bio.map((p, i) => <p key={i} className="speaker__bio">{p.text}</p>)}
          <div className="speaker__pills">
            {T.expertise.map((e, i) => (
              <span key={i}>
                <b>{e.value}</b>
                {e.label}
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
      <FeedbackStrip label={content.feedbackLabel} items={content.testimonials} ratingLabel={content.ratingLabel} />
    </section>
  )
}
