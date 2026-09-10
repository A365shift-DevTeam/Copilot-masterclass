import { useEffect, useState } from 'react'
import { getLenis } from './useLenis.js'
import {
  TOTAL_TICKET_FRAMES,
  TOTAL_SEAT_FRAMES,
  loadFrame,
} from '../utils/frameCache.js'

// Both scroll stages scrub a decoded frame sequence, so a frame that has not
// arrived is a visibly stuck animation. Holding the page on all 225 of them was
// ~13MB before the viewer saw anything, and on a slow connection that overran
// MAX_WAIT_MS anyway: the visitor paid the bytes and still got released early.
//
// So the hold now covers only the opening frames of each stage. The rest is
// covered by machinery that already exists: startBulkPreload fires when a
// section nears the viewport, preloadAround keeps a radius of 8 warm during the
// scrub, and resolveCachedFrame falls back to the nearest decoded frame so a
// gap slows the animation rather than blanking it.
const LEAD_IN_FRAMES = 24

const leadIn = (type, total) =>
  Array.from({ length: Math.min(LEAD_IN_FRAMES, total) }, (_, index) => ({ type, index }))

const TASKS = [
  ...leadIn('ticket', TOTAL_TICKET_FRAMES),
  ...leadIn('seat', TOTAL_SEAT_FRAMES),
  { type: 'static', url: '/assets/logo-horizontal.png' },
  { type: 'static', url: '/assets/illustration-circuit-large.png' },
]

// Enough parallelism to saturate a connection without starving the main thread
// of decode slots. Matches the per-section preloaders this one front-runs.
const CONCURRENCY = 10

// Nothing may trap the viewer. If an asset hangs past this the page is released
// regardless and the sections fall back to their own progressive loading.
const MAX_WAIT_MS = 25000

/** Resolves on load or error alike: one bad asset must not hold the site. */
function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = resolve
    img.onerror = resolve
    img.src = url
  })
}

function whenWindowLoaded() {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise((resolve) => window.addEventListener('load', resolve, { once: true }))
}

function whenFontsReady() {
  return document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve()
}

/**
 * Holds the page on a loading screen until the site is genuinely ready, then
 * releases the scroll.
 *
 * The lock is two-part on purpose: `overflow: hidden` stops native and touch
 * scrolling, and Lenis is stopped separately because it drives scroll itself
 * and would keep running straight through a CSS lock.
 *
 * @returns {{progress: number, done: boolean}} progress is 0-1.
 */
export default function useSitePreload() {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    const root = document.documentElement

    root.classList.add('is-preloading')
    // A reload can restore a mid-page scroll position behind the overlay.
    window.scrollTo(0, 0)
    const lenis = getLenis()
    if (lenis) lenis.stop()

    const release = () => {
      if (!active) return
      active = false
      root.classList.remove('is-preloading')
      const l = getLenis()
      if (l) l.start()
      setProgress(1)
      setDone(true)
    }

    // Two extra units so the bar does not sit at 100% while fonts and the
    // document's own load event are still outstanding.
    const total = TASKS.length + 2
    let loaded = 0
    const step = () => {
      if (!active) return
      loaded += 1
      setProgress(Math.min(1, loaded / total))
    }

    let cursor = 0
    const worker = async () => {
      while (active && cursor < TASKS.length) {
        const task = TASKS[cursor++]
        if (!task) break
        try {
          if (task.type === 'static') {
            await loadImage(task.url)
          } else {
            await loadFrame(task.type, task.index)
          }
        } catch {
          // Continue on error
        }
        step()
      }
    }

    const timeout = setTimeout(release, MAX_WAIT_MS)

    Promise.all([
      ...Array.from({ length: CONCURRENCY }, worker),
      whenFontsReady().then(step),
      whenWindowLoaded().then(step),
    ]).then(release)

    return () => {
      active = false
      clearTimeout(timeout)
      root.classList.remove('is-preloading')
      const l = getLenis()
      if (l) l.start()
    }
  }, [])

  return { progress, done }
}
