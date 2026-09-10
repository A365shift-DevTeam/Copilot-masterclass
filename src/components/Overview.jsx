import { BookOpen, Bot, Globe, GraduationCap, LayoutGrid, Terminal } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'
import { JOURNEY } from '../data/content.js'
import CoverflowCarousel from './ui/CoverflowCarousel.jsx'

const ICONS = {
  learn: BookOpen,
  use: LayoutGrid,
  build: Bot,
  prompt: Terminal,
  expand: Globe,
  master: GraduationCap,
}

/** One journey stage as a coverflow face. */
function StageFace({ stage }) {
  const Icon = ICONS[stage.icon]
  return (
    <div className="journey-face">
      <span className="journey-face__rule" />
      <div className="journey-face__head">
        <span className="journey-face__mark">
          <Icon strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="journey-face__stage">
          <b>{stage.n}</b>
          {stage.stage}
        </span>
      </div>
      <h3 className="journey-face__title">{stage.t}</h3>
      <p className="journey-face__desc">{stage.d}</p>
    </div>
  )
}

export default function Overview() {
  const headRef = useReveal()

  return (
    <section id="overview" className="section">
      <div ref={headRef} className="section-head">
        <div className="eyebrow eyebrow--green">SIX-STAGE JOURNEY</div>
        <h2 className="h2" style={{ fontSize: 'clamp(27px,3.2vw,42px)', lineHeight: 1.14 }}>
          Your Copilot Learning Journey
        </h2>
        <p>Start with Copilot. Build skills. Create Agents. Master AI.</p>
      </div>

      <CoverflowCarousel
        className="app-coverflow"
        label="The six stages of the Copilot learning journey"
        items={JOURNEY.map((stage) => (
          <StageFace key={stage.n} stage={stage} />
        ))}
        pageLabels={JOURNEY.map((stage) => stage.stage)}
        autoplay
        autoplayDelay={3400}
        showNavigation
        cardWidth="clamp(210px, 26vw, 300px)"
      />

      {/* Only the centre card is readable and the faces are decorative to
          assistive tech, so the full set is listed here for screen readers. */}
      <ol className="sr-only">
        {JOURNEY.map((stage) => (
          <li key={stage.n}>
            {stage.stage}: {stage.t}. {stage.d}
          </li>
        ))}
      </ol>
    </section>
  )
}
