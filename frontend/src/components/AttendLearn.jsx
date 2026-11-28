/**
 * Who should attend + what you'll learn, as a stack of cards.
 *
 * "Who" is a short introduction. "What" is five full-width cards that pin
 * near the top as you scroll: each new card slides up over the last, and
 * the cards underneath ease back and dim, like sheets being laid on a
 * desk. The card on top types its example prompt. A gradient finale card
 * closes the stack with the one-skill-many-apps line and its pulse.
 *
 * Pinning is CSS (position: sticky with a rising offset). The push-back
 * is one number per card, `--p`, written by a scroll handler that only
 * runs while the stack is near the viewport. Reduced motion keeps the
 * pinning, drops the push-back, and shows prompts in full.
 */
import { useEffect, useRef, useState } from 'react'
import useReveal from '../hooks/useReveal.js'
import { LEARN_FLOW_APPS } from '../data/content.js'

const CDN = 'https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/'
const TOP = 96 // where cards pin, in px from the top of the viewport
const STEP = 14 // each later card pins this much lower, so the edges peek

function AppIcon({ file, mono, name }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="st__mono" aria-hidden="true">{mono}</span>
  return <img src={CDN + file} alt={name} loading="lazy" onError={() => setFailed(true)} />
}

function M365Mark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function KeyMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11l8.5-8.5M16 6l2.5 2.5M13.5 8.5l2.5 2.5" />
    </svg>
  )
}

function SendMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h13M12 6l6 6-6 6" />
    </svg>
  )
}

function Mark({ kind }) {
  if (kind === 'm365') return <M365Mark />
  if (kind === 'copilot') return <AppIcon file="copilot/copilot-365.svg" mono="C" name="" />
  return null
}

/* One glyph per outcome, keyed by `icon` in the data. */
const ICONS = {
  prompt: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16A2.5 2.5 0 0 1 4 13.5z" />
      <path d="M8 10h5M8 7.5h8" />
      <path d="M15.5 12.5v-4" strokeWidth="2.2" />
    </>
  ),
  apps: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <path d="M17 13.5v7M13.5 17h7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6z" />
      <rect x="9.25" y="11" width="5.5" height="4.5" rx="1" />
      <path d="M10.5 11V9.6a1.5 1.5 0 0 1 3 0V11" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18.5h6M10 21h4" />
      <path d="M8.5 14.5A5.5 5.5 0 1 1 15.5 14.5c-.8.7-1.3 1.5-1.5 2.5h-4c-.2-1-.7-1.8-1.5-2.5z" />
      <path d="M12 9.5v4M10.5 11.5h3" />
    </>
  ),
  agent: (
    <>
      <rect x="4.5" y="8" width="15" height="11" rx="3" />
      <path d="M12 8V5.5M12 5.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      <path d="M9 13h.01M15 13h.01" strokeWidth="2.6" />
      <path d="M9.5 16.2c1.5 1 3.5 1 5 0" />
      <path d="M2.5 12v3M21.5 12v3" />
    </>
  ),
}

function OutcomeIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* Types `text` while `run` is true, resuming where it left off, so a card
   that comes back to the front keeps what it had. */
function useTyped(text, run, speed = 24) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!run) return
    if (reduced()) {
      setN(text.length)
      return
    }
    const id = setInterval(() => {
      setN((k) => {
        if (k >= text.length) {
          clearInterval(id)
          return k
        }
        return k + 1
      })
    }, speed)
    return () => clearInterval(id)
  }, [text, run, speed])
  return { out: text.slice(0, n), done: n >= text.length }
}

/* Writes --p (0..1: how far the next card has covered this one) to every
   card, and reports which card is on top. */
function useStack(stackRef, count, onFront) {
  useEffect(() => {
    const stack = stackRef.current
    if (!stack) return
    const cards = Array.from(stack.querySelectorAll('.st__card'))
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = null
    let near = false

    const tick = () => {
      raf = null
      let front = 0
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect()
        const pin = TOP + i * STEP
        if (r.top <= pin + 2) front = i
        const next = cards[i + 1]
        let p = 0
        if (next && !still.matches) {
          const n = next.getBoundingClientRect()
          p = Math.min(1, Math.max(0, (pin + r.height - n.top) / r.height))
        }
        card.style.setProperty('--p', p.toFixed(3))
      })
      onFront(front)
    }
    const onScroll = () => {
      if (near && raf === null) raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      ([en]) => {
        near = en.isIntersecting
        if (near) onScroll()
      },
      { rootMargin: '30% 0px' }
    )
    io.observe(stack)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    tick()
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [stackRef, count, onFront])
}

function Card({ item, index, front, count, promptLabel }) {
  const { out, done } = useTyped(item.prompt, front)
  return (
    <article
      className={`st__card st__card--${item.style}${front ? ' is-front' : ''}`}
      style={{ '--i': index, top: TOP + index * STEP }}
    >
      <div className="st__card-main">
        <span className="st__code" aria-hidden="true"><OutcomeIcon name={item.icon} /></span>
        <div>
          <h4 className="st__card-title">{item.title}</h4>
          <p className="st__card-desc">{item.text}</p>
        </div>
      </div>
      <div className="st__card-side">
        {item.style === 'ca' && (
          <span className="st__card-apps" aria-hidden="true">
            {LEARN_FLOW_APPS.map((a) => (
              <span key={a.id} className="st__card-app"><AppIcon file={a.file} mono={a.mono} name="" /></span>
            ))}
          </span>
        )}
        <div className="st__prompt" aria-hidden="true">
          <span className="st__prompt-label">{promptLabel}</span>
          <div className="st__prompt-bar">
            <span className="st__prompt-app"><AppIcon file="copilot/copilot-365.svg" mono="C" name="" /></span>
            <span className="st__prompt-text">{out}<i className={`st__caret${done ? ' is-idle' : ''}`} /></span>
            <span className={`st__send${done ? ' is-ready' : ''}`}><SendMark /></span>
          </div>
        </div>
      </div>
      <span className="st__count" aria-hidden="true">{index + 1}<em>/{count}</em></span>
    </article>
  )
}

/* The attendee badge. Its name line flips through the audiences every few
   seconds; hovering holds it. Reduced motion shows the first one still. */
const BADGE_DWELL = 2600

function Badge({ c, index, held, onHold }) {
  const a = c.attendees[index % c.attendees.length]
  return (
    <div
      className={`st__badge${held ? ' is-held' : ''}`}
      onMouseEnter={() => onHold(true)}
      onMouseLeave={() => onHold(false)}
      aria-hidden="true"
    >
      <span className="st__lanyard" />
      <span className="st__clip" />
      <div className="st__badge-card">
        <div className="st__badge-top">
          <img className="st__badge-logo" src="/assets/logo-icon.webp" alt="" width="34" height="34" loading="lazy" decoding="async" />
          <span className="st__badge-event">{c.badgeEvent1}<br />{c.badgeEvent2}</span>
        </div>
        <div className="st__badge-body">
          <span className="st__badge-label">{c.badgeLabel}</span>
          <span key={index} className="st__badge-name">
            {a.mark && <span className="st__badge-mark"><Mark kind={a.mark} /></span>}
            {a.title}
          </span>
          <span className="st__badge-role">{c.badgeRole}</span>
        </div>
        <div className="st__badge-foot">
          <span className="st__badge-bars" />
          <span className="st__badge-seat">{c.badgeSeat}</span>
        </div>
      </div>
    </div>
  )
}

/* Part of the Benefits section; its text is that section's content. */
export default function AttendLearn({ content: c }) {
  const whoRef = useReveal()
  const headRef = useReveal()
  const stackRef = useRef(null)
  const [front, setFront] = useState(0)
  useStack(stackRef, c.outcomes.length, setFront)

  const [who, setWho] = useState(0)
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (held || reduced()) return
    const id = setInterval(() => setWho((k) => (k + 1) % c.attendees.length), BADGE_DWELL)
    return () => clearInterval(id)
  }, [held, c.attendees.length])

  return (
    <div className="st">
      {/* Who should attend: one attendee badge that flips through the
          audiences, and a list beside it that follows. */}
      <div id="who" ref={whoRef} className="st__who">
        <div className="st__who-intro">
          <div className="eyebrow eyebrow--teal">{c.whoEyebrow}</div>
          <h3 className="st__title">{c.whoHeading}</h3>
          <p className="st__lead">
            {c.whoText}
          </p>
        </div>
        <div className="st__pass">
          <Badge c={c} index={who} held={held} onHold={setHeld} />
          <div className="st__roster">
            <ul className="st__roster-list">
              {c.attendees.map((a, i) => (
                <li
                  key={i}
                  className={`${a.mark ? 'is-core' : ''}${i === who ? ' is-on' : ''}`}
                  style={{ '--i': i }}
                  onMouseEnter={() => { setWho(i); setHeld(true) }}
                  onMouseLeave={() => setHeld(false)}
                >
                  <i className="st__roster-dot" aria-hidden="true" />
                  {a.mark && <span className="st__roster-mark"><Mark kind={a.mark} /></span>}
                  {a.title}
                </li>
              ))}
            </ul>
            <p className="st__seat-note">
              <span className="st__seat-key"><KeyMark /></span>
              {c.licenseNote}
            </p>
          </div>
        </div>
      </div>

      {/* What you'll learn */}
      <div className="st__learn">
        <div ref={headRef} className="st__learn-head">
          <div>
            <div className="eyebrow eyebrow--green">{c.learnEyebrow}</div>
            <h3 className="st__title">{c.learnHeading}</h3>
          </div>
          <p className="st__hint" aria-hidden="true">{c.learnHint}</p>
        </div>

        <div ref={stackRef} className="st__stack">
          {c.outcomes.map((l, i) => (
            <Card key={i} item={l} index={i} front={i === front} count={c.outcomes.length} promptLabel={c.promptLabel} />
          ))}

          <div
            className="st__card st__card--end"
            style={{ '--i': c.outcomes.length, top: TOP + c.outcomes.length * STEP }}
            role="img"
            aria-label={c.endLabel}
          >
            <div className="st__end">
              <span className="st__end-step"><small>{c.endFromSmall}</small>{c.endFrom}</span>
              <i className="st__wire st__wire--1" />
              <span className="st__end-apps">
                <span className="st__end-row">
                  {LEARN_FLOW_APPS.map((a, i) => (
                    <span key={a.id} className="st__end-app" style={{ '--k': i }}>
                      <AppIcon file={a.file} mono={a.mono} name={a.name} />
                    </span>
                  ))}
                </span>
                <small>{c.endApps}</small>
              </span>
              <i className="st__wire st__wire--2" />
              <span className="st__end-step st__end-step--out"><small>{c.endToSmall}</small>{c.endTo}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
