/**
 * The Copilot Studio diagram: how an agent gets built, and which Microsoft
 * apps it reads from and acts through once it is.
 *
 * The panel walks the four build steps in the design system's green; the
 * footer timeline fills in as the walkthrough advances. Step N also lights
 * row N of the circuit (one chip each side, with its track and port), so the
 * apps walk down in time with the steps. Everything on a row carries
 * `agent-r{N}` and the block carries `data-step`; the CSS pairs them.
 *
 * Geometry lives in one place. The stage is 62% wide and centred, so each
 * gutter is 19%; the app chips sit at 7.5% from the outer edge and the tracks
 * bridge from the chip to the panel. TRACKS is in viewBox units (1000 x 1000
 * = 100% x 100% of the block) and the chips and port dots are HTML positioned
 * from the same numbers, so a track always ends where its chip sits.
 */
import { useEffect, useState } from 'react'
import { Clock, Database, FileSliders, UserRoundPlus } from 'lucide-react'
import { AGENT_APPS, AGENT_HEADER, AGENT_STEPS } from '../../data/content.js'

// Same icon source as the hero orbit, with the same mono-letter fallback.
const CDN = 'https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/'

const ICONS = {
  create: UserRoundPlus,
  knowledge: Database,
  instruct: FileSliders,
  work: Clock,
}

// How long each step stays lit. The finished agent holds a beat longer.
const HOLD = [2400, 2800, 2400, 3400]

/**
 * Row centres (y) and the short elbowed bridge from chip to panel edge. Outer
 * rows bend inward so the four tracks fan into the panel instead of hitting
 * it as a flat comb. Mirrored for the right side.
 */
const ROWS = [
  { y: 160, to: 200 },
  { y: 387, to: 405 },
  { y: 613, to: 595 },
  { y: 840, to: 800 },
]
const CHIP_X = 75 // chip centre, 7.5% in from the outer edge
const CHIP_EDGE = 112 // where the track leaves the chip
const PANEL_EDGE = 190 // stage starts at 19%
const ELBOW = 150

const trackFor = (side, row) => {
  const { y, to } = ROWS[row]
  if (side === 'in') return `M ${CHIP_EDGE} ${y} L ${ELBOW} ${y} L ${ELBOW} ${to} L ${PANEL_EDGE} ${to}`
  const m = (x) => 1000 - x
  return `M ${m(PANEL_EDGE)} ${to} L ${m(ELBOW)} ${to} L ${m(ELBOW)} ${y} L ${m(CHIP_EDGE)} ${y}`
}

const pct = (v) => `${(v / 10).toFixed(2)}%`

const NODES = AGENT_APPS.map((app) => {
  const row = AGENT_APPS.filter((a) => a.side === app.side).indexOf(app)
  const { y, to } = ROWS[row]
  return {
    ...app,
    row: row + 1,
    x: app.side === 'in' ? CHIP_X : 1000 - CHIP_X,
    y,
    track: trackFor(app.side, row),
    port: { x: app.side === 'in' ? PANEL_EDGE : 1000 - PANEL_EDGE, y: to },
    dur: [2.2, 1.8, 2.4, 2.0][row] + (app.side === 'out' ? 0.3 : 0),
  }
})

function CdnIcon({ file, alt, mono }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="agent-anim__mono">{mono}</span>
  return <img src={CDN + file} alt={alt} onError={() => setFailed(true)} />
}

function AppChip({ node, index }) {
  return (
    <span
      className={`agent-app agent-app--${node.side} agent-r${node.row}`}
      style={{ '--x': pct(node.x), '--y': pct(node.y), '--delay': `${index * 0.4}s` }}
      title={node.name}
    >
      <CdnIcon file={node.file} alt={node.name} mono={node.mono} />
    </span>
  )
}

export default function AgentAnimation({ speed = 1 }) {
  const [active, setActive] = useState(0)
  // The stylesheet's reduced-motion rule only reaches CSS animations, so the
  // step walkthrough and the SMIL photons are gated here as well.
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(motion.matches)
    sync()
    motion.addEventListener('change', sync)
    return () => motion.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reduced) return
    const id = setTimeout(() => {
      setActive((prev) => (prev + 1) % AGENT_STEPS.length)
    }, HOLD[active] / speed)
    return () => clearTimeout(id)
  }, [active, speed, reduced])

  // 0 lights nothing: the static state when motion is off.
  const step = reduced ? 0 : active + 1

  return (
    <div className="agent-anim" data-step={step}>
      <span className="agent-anim__glow" aria-hidden="true" />

      <svg
        className="agent-anim__circuit"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id="agentPhotonGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {NODES.map((n) => (
          <path
            key={n.id}
            className={`agent-anim__track agent-anim__track--${n.side} agent-r${n.row}`}
            d={n.track}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {!reduced && NODES.map((n) => (
          <circle
            key={`photon-${n.id}`}
            className={`agent-anim__photon agent-anim__photon--${n.side} agent-r${n.row}`}
            r="4"
            filter="url(#agentPhotonGlow)"
          >
            <animateMotion dur={`${(n.dur / speed).toFixed(2)}s`} repeatCount="indefinite" path={n.track} />
          </circle>
        ))}
      </svg>

      {NODES.map((n) => (
        <i
          key={`${n.id}-port`}
          className={`agent-port agent-port--${n.side} agent-r${n.row}`}
          style={{ left: pct(n.port.x), top: pct(n.port.y) }}
          aria-hidden="true"
        />
      ))}

      <div className="agent-stage">
        <div className="agent-pill">
          <span className="agent-pill__avatar">
            <CdnIcon file="copilot/copilot-365.svg" alt="Microsoft Copilot" mono="C" />
          </span>
          <span className="agent-pill__text">
            <span className="agent-pill__name">{AGENT_HEADER.name}</span>
            <span className="agent-pill__tag">{AGENT_HEADER.tagline}</span>
          </span>
        </div>

        <div className="agent-panel">
          <h3 className="agent-panel__title">
            Build Your Copilot Agent <span className="text-gradient">in 4 Steps</span>
          </h3>
          <p className="agent-panel__sub">From idea to impact — in minutes</p>

          <ol className="agent-steps">
            {AGENT_STEPS.map((step, i) => {
              const Icon = ICONS[step.icon]
              const isActive = active === i
              return (
                <li
                  key={step.n}
                  className={`agent-step${isActive ? ' agent-step--active' : ''}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="agent-step__n">{step.n}</span>
                  <span className="agent-step__icon">
                    <Icon strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="agent-step__text">
                    <span className="agent-step__t">{step.t}</span>
                    <span className="agent-step__d">{step.d}</span>
                  </span>
                </li>
              )
            })}
          </ol>

          <div className="agent-timeline" aria-hidden="true">
            {AGENT_STEPS.map((step, i) => {
              const Icon = ICONS[step.icon]
              const state = i < active ? ' agent-tl__node--done' : i === active ? ' agent-tl__node--active' : ''
              return (
                <div key={step.n} className="agent-tl__group">
                  {i > 0 && (
                    <span className={`agent-tl__link${i <= active ? ' agent-tl__link--done' : ''}`} />
                  )}
                  <span className={`agent-tl__node${state}`}>
                    <span className="agent-tl__ring">
                      <Icon strokeWidth={1.9} />
                    </span>
                    <span className="agent-tl__label">{step.short}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="agent-apps">
        {NODES.map((n, i) => (
          <AppChip key={n.id} node={n} index={i} />
        ))}
      </div>
    </div>
  )
}
