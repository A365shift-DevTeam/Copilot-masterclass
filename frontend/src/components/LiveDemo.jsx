import { useEffect, useRef, useState } from 'react'
import useReveal from '../hooks/useReveal.js'

export default function LiveDemo({ content }) {
  const leftRef = useReveal()
  const rightRef = useReveal()
  const [demo, setDemo] = useState(0)
  const [typed, setTyped] = useState('')
  const timerRef = useRef(null)
  const stateRef = useRef({ demo: 0, typed: '' })
  // Read by the typing loop, so an edit in the admin's preview doesn't restart it.
  const conversations = useRef(content.conversations)
  conversations.current = content.conversations

  useEffect(() => {
    const step = () => {
      const { demo: d, typed: cur } = stateRef.current
      const list = conversations.current
      const full = list[d % list.length].answer
      if (cur.length < full.length) {
        const next = full.slice(0, cur.length + 6)
        stateRef.current.typed = next
        setTyped(next)
        timerRef.current = setTimeout(step, 70)
      } else {
        timerRef.current = setTimeout(() => {
          const nd = (stateRef.current.demo + 1) % conversations.current.length
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
          <div className="eyebrow eyebrow--lime">{content.eyebrow}</div>
          <h2 className="h2 demo__title">{content.heading}</h2>
          <p className="demo__desc">{content.intro}</p>
          <div className="demo__list">
            {content.demos.map((d, i) => (
              <div key={i} className="demo__list-item"><span style={{ color: '#6BD194', fontWeight: 700 }}>✓</span>{d}</div>
            ))}
          </div>
        </div>

        <div ref={rightRef} className="demo-window">
          <div className="demo-window__bar">
            <i style={{ background: '#EF4444' }} />
            <i style={{ background: '#F59E0B' }} />
            <i style={{ background: '#3FC073' }} />
            <span className="demo-window__bar-title">{content.windowTitle}</span>
          </div>
          <div className="demo-window__body">
            <div className="demo-window__prompt">{content.conversations[demo % content.conversations.length].prompt}</div>
            <div className="demo-window__answer">
              {typed}
              <span className="demo-window__caret" />
            </div>
            <div className="demo-window__chips">
              {content.chips.map((c, i) => <span key={i}>{c}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
