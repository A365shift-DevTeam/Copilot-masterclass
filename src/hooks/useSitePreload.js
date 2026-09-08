import { useEffect, useState } from 'react'
import { getLenis } from './useLenis.js'
import {
  TOTAL_FRAMES as TICKET_FRAMES,
  FRAME_BASE as TICKET_BASE,
} from '../components/TicketScrollExperience.jsx'
import {
  TOTAL_FRAMES as SEAT_FRAMES,
  FRAME_BASE as SEAT_BASE,
} from '../components/SeatScrollExperience.jsx'

// Both scroll stages scrub a decoded frame sequence, so a frame that has not
// arrived is a visibly stuck animation. They are the whole reason for holding
// the page: 225 frames, ~15MB together.
const IMAGES = [
  ...Array.from({ length: TICKET_FRAMES }, (_, i) => frameUrl(TICKET_BASE, i)),
  ...Array.from({ length: SEAT_FRAMES }, (_, i) => frameUrl(SEAT_BASE, i)),
  '/assets/logo-horizontal.png',
  '/assets/illustration-circuit-large.png',
]

// Enough parallelism to saturate a connection without starving the main thread
// of decode slots. Matches the per-section preloaders this one front-runs.
const CONCURRENCY = 10

// Nothing may trap the viewer. If an asset hangs past this the page is released
// regardless and the sections fall back to their own progressive loading.
const MAX_WAIT_MS = 30000

function frameUrl(base, index) {
  return `${base}${String(index + 1).padStart(4, '0')}.webp`
}

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
    const total = IMAGES.length + 2
    let loaded = 0
    const step = () => {
      if (!active) return
      loaded += 1
      setProgress(Math.min(1, loaded / total))
    }

    let cursor = 0
    const worker = async () => {
      while (active && cursor < IMAGES.length) {
        const url = IMAGES[cursor++]
        await loadImage(url)
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
