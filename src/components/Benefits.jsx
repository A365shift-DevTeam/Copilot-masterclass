/**
 * Benefits: the attend/learn panel, then the staircase.
 *
 * The staircase is the argument of the page drawn as one picture. Two
 * people stand on the same landing today. Scrolling the tall section
 * builds the stairs out from it: four steps climb to the right and the
 * Copilot user takes them one by one; four steps fall to the left and the
 * manual user takes those. Each step carries its milestone.
 *
 * Nothing that moves can touch the text: the two names live in a fixed
 * legend in the top-left corner, which no step reaches; each milestone is
 * printed inside its own step, under the tread the traveller stands on;
 * and the two results have reserved rows, one above the top step and one
 * under the floor.
 *
 * All motion hangs off one number. A rAF ticker writes the section's scroll
 * progress to `--p` on the stage while it is near the viewport, plus `--s`,
 * the number of steps taken so far, and the CSS derives every build, move
 * and fade from those. On phones and under reduced motion the ticker stays
 * off, the finished staircase is shown, and the steps are listed.
 */
import { useEffect, useRef, useState } from 'react'
import AttendLearn from './AttendLearn.jsx'
import { CAREER_STEPS } from '../data/content.js'

const CDN = 'https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/'

// The staircase in an 1100 x 600 box. The landing sits in the middle; up
// steps run right from it, down steps run left. The top row (above the
// highest step) is kept for the up result, and the row under the floor for
// the down result. Each step comes on at its STEP_START fraction of the
// scroll, over STEP_WINDOW.
const W = 1100
const H = 600
const LANDING = { x: 490, w: 120, y: 330 }
const STEP_W = 120
const RISE = 46
const DROP = 36
const FLOOR = 560
const STEP_START = [0.14, 0.34, 0.54, 0.74]
const STEP_WINDOW = 0.14

const px = (v) => `${((v / W) * 100).toFixed(2)}%`
const py = (v) => `${((v / H) * 100).toFixed(2)}%`
const stepVars = (i) => ({ '--start': STEP_START[i], '--window': STEP_WINDOW })

/* The manual traveller's mark. The Copilot traveller carries the Copilot logo. */
function PersonMark() {
  return (
    <svg className="stairs__person" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M4.8 20.5c.6-4.2 3.4-6.6 7.2-6.6s6.6 2.4 7.2 6.6" />
    </svg>
  )
}

function CopilotBadge() {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="stairs__mono">C</span>
  return <img src={`${CDN}copilot/copilot-365.svg`} alt="" onError={() => setFailed(true)} />
}

function useStairsProgress(sectionRef, stageRef) {
  useEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    if (!section || !stage) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 719px)')
    let rafId = null
    let near = false

    const tick = () => {
      rafId = null
      if (still.matches) {
        stage.style.setProperty('--p', '1')
        stage.style.setProperty('--s', String(STEP_START.length))
        return
      }
      const rect = section.getBoundingClientRect()
      const range = section.offsetHeight - window.innerHeight
      const p = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 1
      stage.style.setProperty('--p', p.toFixed(4))
      stage.style.setProperty('--s', String(STEP_START.filter((t) => p >= t + STEP_WINDOW * 0.6).length))
      if (near) rafId = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting
        if (near && rafId === null) rafId = requestAnimationFrame(tick)
      },
      { rootMargin: '20% 0px' }
    )
    io.observe(section)
    still.addEventListener('change', tick)
    tick()

    return () => {
      io.disconnect()
      still.removeEventListener('change', tick)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [sectionRef, stageRef])
}

/* One flight of steps: the blocks in the SVG. */
function Blocks({ dir, steps }) {
  const up = dir === 'up'
  return steps.map((step, i) => {
    const x = up ? LANDING.x + LANDING.w + STEP_W * i : LANDING.x - STEP_W * (i + 1)
    const y = up ? LANDING.y - RISE * (i + 1) : LANDING.y + DROP * (i + 1)
    return (
      <g key={step} className={`stairs__block stairs__block--${dir}`} style={stepVars(i)}>
        <rect x={x} y={y} width={STEP_W} height={FLOOR - y} />
        <rect className="stairs__edge" x={x} y={y} width={STEP_W} height="5" />
      </g>
    )
  })
}

/* The same flight's labels, printed inside each step under its tread. */
function StepLabels({ dir, steps }) {
  const up = dir === 'up'
  return steps.map((step, i) => {
    const x = up ? LANDING.x + LANDING.w + STEP_W * (i + 0.5) : LANDING.x - STEP_W * (i + 0.5)
    const y = up ? LANDING.y - RISE * (i + 1) : LANDING.y + DROP * (i + 1)
    return (
      <span key={step} className={`stairs__label stairs__label--${dir}`} style={{ left: px(x), top: py(y + 5), ...stepVars(i) }}>
        {step}
      </span>
    )
  })
}

export default function Benefits() {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  useStairsProgress(sectionRef, stageRef)

  return (
    <section className="section benefits">
      <AttendLearn />

      <div ref={sectionRef} className="career">
        <div ref={stageRef} className="career__stage">
          <div className="career__head">
            <div className="eyebrow eyebrow--green">BENEFITS</div>
            <h2 className="h2">Same starting point. Different career direction.</h2>
            <p>
              Both begin on the same line today. One updates their skills with Copilot and
              climbs. The other keeps the same routine and drifts below the line.
            </p>
          </div>

          <div className="stairs-panel">
            <div
              className="stairs"
              role="img"
              aria-label="Two people stand on the same landing today. The Copilot user climbs four steps: save time, work smarter, stay relevant, promotion and growth. The manual user descends four steps: more manual work, skills gap widens, lower career relevance, fear of job loss."
            >
              <svg className="stairs__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="stairUp" gradientUnits="userSpaceOnUse" x1={LANDING.x + LANDING.w} y1="0" x2={W} y2="0">
                    <stop offset="0" stopColor="#4D9AA1" />
                    <stop offset="1" stopColor="#65A859" />
                  </linearGradient>
                </defs>
                <line className="stairs__floor" x1="0" y1={FLOOR} x2={W} y2={FLOOR} vectorEffect="non-scaling-stroke" />
                <rect className="stairs__landing" x={LANDING.x} y={LANDING.y} width={LANDING.w} height={FLOOR - LANDING.y} />
                <Blocks dir="up" steps={CAREER_STEPS.up} />
                <Blocks dir="down" steps={CAREER_STEPS.down} />
              </svg>

              {/* Legend, fixed in the top-left corner, which no step reaches. */}
              <div className="stairs__legend">
                <span className="stairs__legend-row stairs__legend-row--up"><i />Copilot user<small>Learning and adapting</small></span>
                <span className="stairs__legend-row stairs__legend-row--down"><i />Manual user<small>Same skills, same routine</small></span>
              </div>

              <span className="stairs__today" style={{ left: px(LANDING.x + LANDING.w / 2), top: py(FLOOR) }}>Today</span>

              <StepLabels dir="up" steps={CAREER_STEPS.up} />
              <StepLabels dir="down" steps={CAREER_STEPS.down} />

              {/* The travellers: pins only, standing on their current tread. */}
              <i className="stairs__pin stairs__pin--up"><CopilotBadge /></i>
              <i className="stairs__pin stairs__pin--down"><PersonMark /></i>

              {/* Results, each in its reserved row. */}
              <span className="stairs__result stairs__result--up" style={{ left: px(W - STEP_W / 2), top: py(LANDING.y - RISE * 4) }}>Career value ↑</span>
              <span className="stairs__result stairs__result--down" style={{ left: px(STEP_W / 2), top: py(FLOOR) }}>Career risk ↓</span>
            </div>

            <div className="stairs-lists" aria-hidden="true">
              <ul className="stairs-lists__col stairs-lists__col--up">
                {CAREER_STEPS.up.map((s) => <li key={s}>{s}</li>)}
              </ul>
              <ul className="stairs-lists__col stairs-lists__col--down">
                {CAREER_STEPS.down.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>

          <p className="career__hint" aria-hidden="true">Scroll to watch the difference</p>
        </div>
      </div>
    </section>
  )
}
