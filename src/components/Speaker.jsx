import { useRef, useState } from 'react'
import { Pause, Volume2 } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'
import { EXPERTISE } from '../data/content.js'
import ReserveSeatButton from './ReserveSeatButton.jsx'
import FeedbackStrip from './FeedbackStrip.jsx'
import BorderBeam from './ui/BorderBeam.jsx'

// Spaces in the filename have to be escaped: the browser requests this path
// verbatim and an unescaped space is not a valid URL.
const VOICE_SRC = '/assets/Ambot365%20Founder%20Voice.mp3'

/**
 * A short voice note from the founder, sitting beside his name.
 *
 * The <audio> element carries no controls of its own — the button is the
 * whole interface — and preload="none" keeps 340KB off the wire until
 * someone actually asks to hear it. State is driven by the element's own
 * events rather than set on click, so it cannot drift out of step when
 * playback is refused or the track is stopped from outside the page.
 */
function FounderVoice() {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => setPlaying(false))
    else el.pause()
  }

  return (
    <>
      <button
        type="button"
        className={`speaker__voice${playing ? ' is-playing' : ''}`}
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? 'Pause the founder’s voice note' : 'Play the founder’s voice note'}
      >
        {playing ? <Pause strokeWidth={2} aria-hidden="true" /> : <Volume2 strokeWidth={2} aria-hidden="true" />}
      </button>
      <audio
        ref={audioRef}
        src={VOICE_SRC}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </>
  )
}

export default function Speaker() {
  const photoRef = useReveal()
  const bioRef = useReveal()

  return (
    <section id="speaker" className="speaker-section">
      <div className="speaker-grid">
        <div ref={photoRef} className="speaker-photo">
          <img
            className="speaker-photo__img"
            src="/assets/fonunder.webp"
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
          <p className="speaker__bio">
            Ambrose brings extensive experience across Microsoft 365, Business Automation, Lean
            Transformation, AI and Digital Transformation. His journey spans corporate transformation,
            large-scale automation delivery, product development and building AmBot365 across India and
            the UAE, with experience presenting solutions to VPs, Directors, senior business leaders and
            Ministers.
          </p>
          <p className="speaker__bio">
            Today, he transforms this real-world experience into structured, visual and practical learning,
            helping professionals learn, apply and replicate Microsoft Copilot, AI and automation solutions
            in their workplace.
          </p>
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
