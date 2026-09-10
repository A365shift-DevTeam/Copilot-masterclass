/**
 * The four agenda days as a stacked deck. The front card is the one being
 * read; the others sit behind it, stepped up and to the right, and the deck
 * turns on a timer: the front card lifts away, the rest come forward, and the
 * lifted card settles at the back.
 *
 * Positions are a pure function of (card, front): `pos` 0 is the front and 3
 * is the back, and the CSS owns the transform for each. `leaving` is the one
 * transient state, held for the lift so a card can leave from the top of the
 * stack before it reappears at the bottom. Hover pauses the deck, and any
 * card or dot can be picked to bring a day forward.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AGENDA } from '../../data/content.js'

const COUNT = AGENDA.length
const HOLD = 3400
const LIFT = 560

export default function AgendaDeck() {
  const [front, setFront] = useState(0)
  const [leaving, setLeaving] = useState(null)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(motion.matches)
    sync()
    motion.addEventListener('change', sync)
    return () => motion.removeEventListener('change', sync)
  }, [])

  // Turn the deck: lift the front card, then hand the front to the next one.
  useEffect(() => {
    if (reduced || paused || leaving !== null) return
    timer.current = setTimeout(() => setLeaving(front), HOLD)
    return () => clearTimeout(timer.current)
  }, [front, paused, leaving, reduced])

  useEffect(() => {
    if (leaving === null) return
    const id = setTimeout(() => {
      setFront((leaving + 1) % COUNT)
      setLeaving(null)
    }, LIFT)
    return () => clearTimeout(id)
  }, [leaving])

  const pick = useCallback((i) => {
    clearTimeout(timer.current)
    setLeaving(null)
    setFront(i)
  }, [])

  return (
    <div
      className="agenda-deck"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {AGENDA.map((item, i) => {
        const pos = (i - front + COUNT) % COUNT
        const isFront = pos === 0
        const isLeaving = leaving === i
        return (
          <article
            key={item.n}
            className={`deck-card deck-card--pos${pos}${isLeaving ? ' deck-card--leaving' : ''}`}
            aria-hidden={!isFront}
            onClick={isFront ? undefined : () => pick(i)}
          >
            <div className="deck-card__head">
              <span className="deck-card__num">{item.n}</span>
              <span className="deck-card__day">{item.day}</span>
            </div>
            <h3 className="deck-card__title">{item.t}</h3>
            <p className="deck-card__desc">{item.d}</p>
            <div className="deck-card__foot">
              <span className="deck-card__count">{item.day} of {COUNT}</span>
              <span className="deck-card__dots" role="group" aria-label="Choose a day">
                {AGENDA.map((d, j) => (
                  <button
                    key={d.n}
                    type="button"
                    className={`deck-card__dot${j === front ? ' deck-card__dot--on' : ''}`}
                    aria-label={`Show ${d.day}`}
                    aria-pressed={j === front}
                    tabIndex={isFront ? 0 : -1}
                    onClick={(e) => { e.stopPropagation(); pick(j) }}
                  />
                ))}
              </span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
