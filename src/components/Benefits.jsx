/**
 * Benefits: two reference cards, then the fork.
 *
 * The fork is the argument of the page drawn as one picture. Two people start
 * on the same line today. Scrolling the tall section moves them right: the
 * Copilot user climbs the lit ribbon, the manual user drifts down the grey
 * one. At four checkpoints a dotted rung joins the two
 * branches, so each column reads as the same moment seen from two careers.
 *
 * All motion hangs off one number. A rAF ticker writes the section's scroll
 * progress to `--p` on the stage while it is near the viewport, and the CSS
 * derives every draw, position and fade from it, so nothing here touches a
 * transform directly. On phones and under reduced motion the ticker stays
 * off, `--p` sits at 1, and the finished picture is shown with the
 * checkpoints as lists. The travellers are the pins themselves; their name
 * cards only appear once they arrive.
 */
import { useEffect, useRef, useState } from 'react'
import useReveal from '../hooks/useReveal.js'
import useTypewriter from '../hooks/useTypewriter.js'
import { AUDIENCE, BENEFITS, CAREER_PROMPT, CAREER_STEPS } from '../data/content.js'

const CDN = 'https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/'

// The fork in a 1000 x 520 box: one start at (80, 260), the up branch ending
// at (900, 90), the down branch at (900, 430). Checkpoints sit at four
// fractions along each branch; the overlays read them as percentages.
const ORIGIN = { x: 80, y: 260 }
const END_X = 900
const RISE = 170
const CHECKPOINTS = [0.22, 0.44, 0.66, 0.86]
const STEP_START = [0.06, 0.28, 0.5, 0.72]
const STEP_WINDOW = 0.16
// Stems grow left to right. Each label's neighbour sits one rise-step further
// out along the ribbon, so a longer stem keeps every label in its own band.
const STEM = [20, 32, 44, 56]

const px = (v) => `${(v / 10).toFixed(2)}%`
const py = (v) => `${((v / 520) * 100).toFixed(2)}%`
const pointAt = (t, dir) => ({ x: ORIGIN.x + t * (END_X - ORIGIN.x), y: ORIGIN.y - dir * t * RISE })

/* The manual traveller's mark. The Copilot traveller carries the Copilot logo. */
function PersonMark() {
  return (
    <svg className="fork__person" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M4.8 20.5c.6-4.2 3.4-6.6 7.2-6.6s6.6 2.4 7.2 6.6" />
    </svg>
  )
}

function CopilotBadge() {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="fork__mono">C</span>
  return <img src={`${CDN}copilot/copilot-365.svg`} alt="" onError={() => setFailed(true)} />
}

function useForkProgress(sectionRef, stageRef) {
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
        return
      }
      const rect = section.getBoundingClientRect()
      const range = section.offsetHeight - window.innerHeight
      const p = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 1
      stage.style.setProperty('--p', p.toFixed(4))
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

const stepVars = (i) => ({ '--start': STEP_START[i], '--window': STEP_WINDOW, '--stem': `${STEM[i]}px` })

function Checkpoints({ dir, steps }) {
  const sign = dir === 'up' ? 1 : -1
  return steps.map((step, i) => {
    const p = pointAt(CHECKPOINTS[i], sign)
    return (
      <span
        key={step}
        className={`fork__step fork__step--${dir}`}
        style={{ left: px(p.x), top: py(p.y), ...stepVars(i) }}
      >
        <i className="fork__node" />
        <span className="fork__label">{step}</span>
      </span>
    )
  })
}

/* The question in the middle of the fork. A hidden sizer holds the full
   sentence so the box never resizes while the visible copy is typed into it;
   without it the centred line would slide outward character by character.
   The hook lives here rather than in Benefits so its ticks re-render this
   node alone and leave the scroll-driven picture untouched. */
function TypedPrompt() {
  const { displayedText } = useTypewriter({
    text: CAREER_PROMPT,
    typingSpeed: 70,
    deletingSpeed: 30,
    pauseDuration: 2600,
    deletePauseDuration: 500,
    loop: true,
  })
  return (
    <>
      {displayedText}
      <i className="fork__prompt-caret" />
    </>
  )
}

function ForkPrompt() {
  const [still, setStill] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setStill(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <span className="fork__prompt" aria-hidden="true">
      <span className="fork__prompt-sizer">{CAREER_PROMPT}&nbsp;</span>
      <span className="fork__prompt-line">
        {still ? CAREER_PROMPT : <TypedPrompt />}
      </span>
    </span>
  )
}

export default function Benefits() {
  const cardsRef = useReveal()
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  useForkProgress(sectionRef, stageRef)

  return (
    <section className="section benefits">
      <div ref={cardsRef} className="benefits-cards">
        <div className="benefit-card benefit-card--who">
          <div className="eyebrow eyebrow--teal">WHO IT IS FOR</div>
          <h3>Who should attend?</h3>
          <p>Built for people who already work in Microsoft 365 and want to work smarter.</p>
          <ul className="benefit-chips">
            {AUDIENCE.map((a) => (
              <li key={a.n}>{a.t}</li>
            ))}
          </ul>
        </div>

        <div className="benefit-card benefit-card--get">
          <div className="eyebrow eyebrow--green">INCLUDED</div>
          <h3>What you get</h3>
          <ul className="benefit-list">
            {BENEFITS.map((b) => (
              <li key={b.i}>
                <span className="benefit-card__icon">{b.i}</span>
                <span>
                  <strong>{b.t}</strong>
                  {b.d}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div ref={sectionRef} className="career">
        <div ref={stageRef} className="career__stage">
          <div className="career__head">
            <div className="eyebrow eyebrow--green">BENEFITS</div>
            <h2 className="h2">Same Career. Two Different Futures.​</h2>
            <p>
              One professional builds Microsoft Copilot skills. The other continues working the same way. See how one decision can change the direction.​
            </p>
          </div>

          <div className="fork-panel">
            <div
              className="fork"
              role="img"
              aria-label={`Two careers start from the same point. The Copilot user's path rises through saving time, working smarter, staying relevant, and promotion. The manual user's path falls through more manual work, a widening skills gap, lower relevance, and fear of job loss. ${CAREER_PROMPT}`}
            >
              <svg className="fork__svg" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="forkUp" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#4D9AA1" />
                    <stop offset="1" stopColor="#65A859" />
                  </linearGradient>
                  <filter id="forkGlow" x="-10%" y="-60%" width="120%" height="220%">
                    <feGaussianBlur stdDeviation="7" />
                  </filter>
                </defs>

                <line className="fork__base" x1={ORIGIN.x} y1={ORIGIN.y} x2={END_X} y2={ORIGIN.y} vectorEffect="non-scaling-stroke" />

                {CHECKPOINTS.map((t, i) => {
                  const up = pointAt(t, 1)
                  const down = pointAt(t, -1)
                  return (
                    <line
                      key={t}
                      className="fork__rung"
                      x1={up.x} y1={up.y} x2={down.x} y2={500}
                      vectorEffect="non-scaling-stroke"
                      style={stepVars(i)}
                    />
                  )
                })}

                <line className="fork__ribbon fork__ribbon--halo" x1={ORIGIN.x} y1={ORIGIN.y} x2={END_X} y2={ORIGIN.y - RISE} pathLength="1" vectorEffect="non-scaling-stroke" filter="url(#forkGlow)" />
                <line className="fork__ribbon fork__ribbon--down" x1={ORIGIN.x} y1={ORIGIN.y} x2={END_X} y2={ORIGIN.y + RISE} pathLength="1" vectorEffect="non-scaling-stroke" />
                <line className="fork__ribbon fork__ribbon--up" x1={ORIGIN.x} y1={ORIGIN.y} x2={END_X} y2={ORIGIN.y - RISE} pathLength="1" vectorEffect="non-scaling-stroke" />
              </svg>

              <span className="fork__lane fork__lane--up">COPILOT-POWERED PROFESSIONAL</span>
              <span className="fork__lane fork__lane--down">Skills not updated</span>
              <span className="fork__axis fork__axis--start">Today</span>
              <span className="fork__axis fork__axis--end">Career<br />direction →</span>
              <i className="fork__origin" style={{ left: px(ORIGIN.x), top: py(ORIGIN.y) }} />

              {CHECKPOINTS.map((t, i) => (
                <span key={t} className="fork__tick" style={{ left: px(pointAt(t, 1).x), ...stepVars(i) }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              ))}

              <Checkpoints dir="up" steps={CAREER_STEPS.up} />
              <Checkpoints dir="down" steps={CAREER_STEPS.down} />

              <ForkPrompt />

              <div className="fork__fig fork__fig--up">
                <i className="fork__pin fork__pin--copilot"><CopilotBadge /></i>
                <div className="fork__card">
                  <span className="fork__who">Copilot-Skilled Professional<small></small></span>
                  <span className="fork__result">Career value ↑</span>
                </div>
              </div>
              <div className="fork__fig fork__fig--down">
                <i className="fork__pin fork__pin--manual"><PersonMark /></i>
                <div className="fork__card">
                  <span className="fork__who">Traditional Work Approach<small></small></span>
                  <span className="fork__result">Career Risk ↑</span>
                </div>
              </div>
            </div>

            <div className="fork-lists" aria-hidden="true">
              <ul className="fork-lists__col fork-lists__col--up">
                {CAREER_STEPS.up.map((s) => <li key={s}>{s}</li>)}
              </ul>
              <ul className="fork-lists__col fork-lists__col--down">
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
