import { useState } from 'react'
import useReveal from '../hooks/useReveal.js'
import { APP_CARDS } from '../data/content.js'
import CoverflowCarousel from './ui/CoverflowCarousel.jsx'

// Same icon CDN the orbit already uses, so the two visuals stay in step.
const ICON_CDN = 'https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/'

/**
 * One app card as a coverflow face. The letter mark is the base layer and the
 * real icon sits on top, so a CDN failure falls back to the letter instead of a
 * broken-image glyph — the same guard CopilotOrbit uses.
 */
function AppFace({ card }) {
  const [iconFailed, setIconFailed] = useState(false)

  return (
    <div className="app-face">
      <span className="app-face__rule" />
      <span className="app-face__mark" style={{ background: card.tint, color: card.color }}>
        <span className="app-face__mono">{card.mark}</span>
        {card.icon && !iconFailed ? (
          <img
            src={ICON_CDN + card.icon}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setIconFailed(true)}
          />
        ) : null}
      </span>
      <h3 className="app-face__title">{card.title}</h3>
      <div className="app-face__points">
        {card.points.map((pt) => (
          <span key={pt}>
            <i className="app-face__dot">·</i>
            {pt}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Overview() {
  const headRef = useReveal()

  return (
    <section id="overview" className="section">
      <div ref={headRef} className="section-head">
        <div className="eyebrow eyebrow--green">MICROSOFT 365 + COPILOT</div>
        <h2 className="h2" style={{ fontSize: 'clamp(27px,3.2vw,42px)', lineHeight: 1.14 }}>
          Master Copilot Across Microsoft 365
        </h2>
        <p>Learn how AI transforms the applications you already use every day.</p>
      </div>

      <CoverflowCarousel
        className="app-coverflow"
        label="Microsoft 365 apps Copilot works across"
        items={APP_CARDS.map((card) => (
          <AppFace key={card.title} card={card} />
        ))}
        autoplay
        autoplayDelay={3000}
        showNavigation
        cardWidth="clamp(210px, 26vw, 300px)"
      />

      {/* Only the centre card is readable and the faces are decorative to
          assistive tech, so the full set is listed here for screen readers. */}
      <ul className="sr-only">
        {APP_CARDS.map((card) => (
          <li key={card.title}>
            {card.title}: {card.points.join(', ')}.
          </li>
        ))}
      </ul>
    </section>
  )
}
