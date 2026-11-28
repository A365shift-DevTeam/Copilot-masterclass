import { BookOpen, Bot, Globe, GraduationCap, LayoutGrid, Terminal } from 'lucide-react'
import useReveal from '../hooks/useReveal.js'
import CoverflowCarousel from './ui/CoverflowCarousel.jsx'
import ReserveSeatButton from './ReserveSeatButton.jsx'

const ICONS = {
  learn: BookOpen,
  use: LayoutGrid,
  build: Bot,
  prompt: Terminal,
  expand: Globe,
  master: GraduationCap,
}

/** One journey stage as a coverflow face. Stages are edited in the admin (Website > Sections > Overview). */
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
      <h3 className="journey-face__title">{stage.title}</h3>
      <ul className="journey-face__desc journey-face__points">
        {stage.points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
    </div>
  )
}

export default function Overview({ content }) {
  const headRef = useReveal()

  return (
    <section id="overview" className="section">
      <div ref={headRef} className="section-head">
        <div className="eyebrow eyebrow--green">{content.eyebrow}</div>
        <h2 className="h2" style={{ fontSize: 'clamp(27px,3.2vw,42px)', lineHeight: 1.14 }}>
          {content.heading}
        </h2>
        <p>{content.subheading}</p>
      </div>

      <CoverflowCarousel
        className="app-coverflow"
        label={content.carouselLabel}
        items={content.stages.map((stage, i) => (
          <StageFace key={i} stage={stage} />
        ))}
        autoplay
        autoplayDelay={3400}
        showNavigation
        cardWidth="clamp(210px, 26vw, 300px)"
      />

      {/* Only the centre card is readable and the faces are decorative to
          assistive tech, so the full set is listed here for screen readers. */}
      <ol className="sr-only">
        {content.stages.map((stage, i) => (
          <li key={i}>
            {stage.stage}: {stage.title}. {stage.points.join('. ')}.
          </li>
        ))}
      </ol>

      <ReserveSeatButton />
    </section>
  )
}
