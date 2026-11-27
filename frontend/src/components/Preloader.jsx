import { useEffect, useState } from 'react'
import MorphLoading from './ui/MorphLoading.jsx'
import './preloader.css'

/**
 * The full-screen hold shown until useSitePreload reports the site ready.
 *
 * Kept mounted through its own fade so the overlay does not vanish on the frame
 * the scroll unlocks; it unmounts once that transition has run.
 */
export default function Preloader({ progress, done }) {
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!done) return undefined
    const timer = setTimeout(() => setGone(true), 560)
    return () => clearTimeout(timer)
  }, [done])

  if (gone) return null

  const pct = Math.round(progress * 100)

  return (
    <div className={`preloader${done ? ' preloader--done' : ''}`} role="status" aria-live="polite">
      <MorphLoading size="lg" />

      <div className="preloader__meter" aria-hidden="true">
        <span className="preloader__meter-fill" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <p className="preloader__pct" aria-hidden="true">{pct}%</p>
      <span className="sr-only">Loading the experience, {pct} percent complete</span>
    </div>
  )
}
