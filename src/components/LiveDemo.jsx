import { useEffect, useRef, useState } from 'react'
import useReveal from '../hooks/useReveal.js'
import { DEMOS, DEMO_CONVERSATIONS } from '../data/content.js'

export default function LiveDemo() {
  const leftRef = useReveal()
  const rightRef = useReveal()
  const [demo, setDemo] = useState(0)
  const [typed, setTyped] = useState('')
  const timerRef = useRef(null)
  const stateRef = useRef({ demo: 0, typed: '' })

  useEffect(() => {
    const step = () => {
      const { demo: d, typed: cur } = stateRef.current
      const full = DEMO_CONVERSATIONS[d].a
      if (cur.length < full.length) {
        const next = full.slice(0, cur.length + 6)
        stateRef.current.typed = next
        setTyped(next)
        timerRef.current = setTimeout(step, 70)
      } else {
        timerRef.current = setTimeout(() => {
          const nd = (stateRef.current.demo + 1) % DEMO_CONVERSATIONS.length
          stateRef.current = { demo: nd, typed: '' }
          setDemo(nd)
          setTyped('')
          timerRef.current = setTimeout(step, 400)
        }, 3200)
      }
    }
    timerRef.current = setTimeout(step, 900)
    return () => clearTimeout(timerRef.current)
  }, [])

  return (
    <section className="demo-section">
      <div className="demo-section__dots" />
      <div className="demo-grid">
        <div ref={leftRef}>
          <div className="eyebrow eyebrow--lime">LIVE DEMONSTRATION</div>
          <h2 className="h2 demo__title">See Copilot in Action</h2>
          <p className="demo__desc">Every capability is shown live inside real Microsoft 365 applications — not slides.</p>
          <div className="demo__list">
            {DEMOS.map((d) => (
              <div key={d} className="demo__list-item"><span style={{ color: '#8BBF2F', fontWeight: 700 }}>✓</span>{d}</div>
            ))}
          </div>
        </div>

        <div ref={rightRef} className="demo-window">
          <div className="demo-window__bar">
            <i style={{ background: '#D94F4F' }} />
            <i style={{ background: '#F5A623' }} />
            <i style={{ background: '#75B734' }} />
            <span className="demo-window__bar-title">microsoft 365 — copilot</span>
          </div>
          <div className="demo-window__body">
            <div className="demo-window__prompt">{DEMO_CONVERSATIONS[demo].p}</div>
            <div className="demo-window__answer">
              {typed}
              <span className="demo-window__caret" />
            </div>
            <div className="demo-window__chips">
              <span>Analyse</span>
              <span>Summarise</span>
              <span>Automate</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
