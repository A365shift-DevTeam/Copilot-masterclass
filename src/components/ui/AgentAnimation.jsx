/**
 * The Copilot Studio agent card, wired to the Microsoft apps it reads from and
 * acts through.
 *
 * Ported from the AgentAnimation.tsx drop-in: the source used Tailwind and
 * motion/react, neither of which this project carries, so the float, the
 * breathing glow and the capability ping are CSS keyframes and every colour
 * comes from the design system (green/teal, not the original cyan/purple).
 * Tracks and photons are driven by CSS custom properties so the light theme
 * can restate them without a second copy of the SVG.
 *
 * Geometry lives in one place. NODES carries viewBox coordinates; the SVG uses
 * them directly and the app chips are positioned by converting the same
 * numbers to percentages, so a track always ends where its icon sits.
 */
import { useEffect, useState } from 'react'
import { Clock, Database, MessageSquare, Zap } from 'lucide-react'
import { AGENT_CAPS } from '../../data/content.js'

// Same icon source as the hero orbit, with the same mono-letter fallback.
const CDN = 'https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/'

const VB = { w: 800, h: 520 }

const ICONS = {
  data: Database,
  ask: MessageSquare,
  act: Zap,
  always: Clock,
}

/**
 * Left = what the agent reads. Right = how it acts. `track` runs from the chip
 * edge to the panel edge (x 168 / 632 = the 21% gutters set in CSS); photons
 * follow it in path order, so the left three flow inward and the right three
 * flow out.
 */
const NODES = [
  { id: 'sharepoint', name: 'SharePoint', mono: 'S', file: 'microsoft-365/sharepoint.svg', side: 'in', x: 52, y: 110, dur: 2.2, track: 'M 84 110 L 120 110 L 120 150 L 164 150' },
  { id: 'onedrive', name: 'OneDrive', mono: 'D', file: 'microsoft-365/onedrive.svg', side: 'in', x: 52, y: 260, dur: 1.8, track: 'M 84 260 L 164 260' },
  { id: 'excel', name: 'Excel', mono: 'X', file: 'microsoft-365/excel.svg', side: 'in', x: 52, y: 410, dur: 2.4, track: 'M 84 410 L 120 410 L 120 370 L 164 370' },
  { id: 'teams', name: 'Teams', mono: 'T', file: 'microsoft-365/teams.svg', side: 'out', x: 748, y: 110, dur: 2.0, track: 'M 636 150 L 680 150 L 680 110 L 716 110' },
  { id: 'outlook', name: 'Outlook', mono: 'O', file: 'microsoft-365/outlook.svg', side: 'out', x: 748, y: 260, dur: 1.7, track: 'M 636 260 L 716 260' },
  { id: 'powerautomate', name: 'Power Automate', mono: 'U', file: 'power-platform/power-automate.svg', side: 'out', x: 748, y: 410, dur: 2.3, track: 'M 636 370 L 680 370 L 680 410 L 716 410' },
]

const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`

function CdnIcon({ file, alt, mono }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="agent-anim__mono">{mono}</span>
  return <img src={CDN + file} alt={alt} onError={() => setFailed(true)} />
}

function AppChip({ node, index }) {
  return (
    <span
      className={`agent-anim__app agent-anim__app--${node.side}`}
      style={{
        left: pct(node.x, VB.w),
        top: pct(node.y, VB.h),
        animationDelay: `${index * 0.45}s`,
      }}
      title={node.name}
    >
      <CdnIcon file={node.file} alt={node.name} mono={node.mono} />
    </span>
  )
}

export default function AgentAnimation({ roleTitle = 'Customer Support Agent', speed = 1 }) {
  const [activeCap, setActiveCap] = useState(0)
  // The stylesheet's reduced-motion rule only reaches CSS animations, so the
  // cycling highlight and the SMIL photons are gated here as well.
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
    const id = setInterval(() => {
      setActiveCap((prev) => (prev + 1) % AGENT_CAPS.length)
    }, 2400 / speed)
    return () => clearInterval(id)
  }, [speed, reduced])

  return (
    <div className="agent-anim">
      <span className="agent-anim__glow" aria-hidden="true" />

      <svg
        className="agent-anim__circuit"
        viewBox={`0 0 ${VB.w} ${VB.h}`}
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
            className={`agent-anim__track agent-anim__track--${n.side}`}
            d={n.track}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {!reduced && NODES.map((n) => (
          <circle
            key={`photon-${n.id}`}
            className={`agent-anim__photon agent-anim__photon--${n.side}`}
            r="4.5"
            filter="url(#agentPhotonGlow)"
          >
            <animateMotion dur={`${(n.dur / speed).toFixed(2)}s`} repeatCount="indefinite" path={n.track} />
          </circle>
        ))}
      </svg>

      {NODES.map((n, i) => (
        <AppChip key={n.id} node={n} index={i} />
      ))}

      <div className="agent-panel">
        <div className="agent-panel__head">
          <span className="agent-panel__avatar">
            <CdnIcon file="copilot/copilot-365.svg" alt="Microsoft Copilot" mono="C" />
          </span>
          <span className="agent-panel__name">{roleTitle}</span>
        </div>

        <div className="agent-panel__caps">
          {AGENT_CAPS.map((cap, i) => {
            const Icon = ICONS[cap.icon]
            const active = activeCap === i
            return (
              <div key={cap.t} className={`agent-cap${active ? ' agent-cap--active' : ''}`}>
                <Icon className="agent-cap__icon" strokeWidth={1.9} aria-hidden="true" />
                <span className="agent-cap__label">{cap.t}</span>
                {active && <i className="agent-cap__ping" />}
              </div>
            )
          })}
        </div>

        <div className="agent-anim__ready">Your AI Agent is Ready!</div>
      </div>
    </div>
  )
}
