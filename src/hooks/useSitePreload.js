import { useEffect, useState } from 'react'
import { getLenis } from './useLenis.js'
import {
  PRIORITY_HOLD,
  gateBulkPreload,
  ladderIndices,
  loadFrame,
  preloadLadder,
} from '../utils/frameCache.js'

// Both scroll stages scrub a decoded frame sequence, so a frame that has not
// arrived is a visibly stuck animation. Holding the page on all 225 of them was
// ~13MB before the viewer saw anything, and on a slow connection that overran
// MAX_WAIT_MS anyway: the visitor paid the bytes and still got released early.
//
// The hold now covers a ladder — every Nth frame across the sequence, not the
// first N. That is what keeps the stage moving before the fill-in lands: a
// prefix leaves nothing decoded near the far end, so a viewer who scrolls in
// early sees the canvas pinned on one frame while the overlay copy animates on
// schedule, which reads as broken.
// Every rung is roughly 60KB and the hold waits for all of the ticket ones, so
// TICKET_RUNGS is the main dial on how long the loading screen lasts. Ten
// spreads a decoded frame every ~11 across the stage, enough for the scrub to
// read as moving while the gaps fill in behind it.
const TICKET_RUNGS = 10

// The seat ladder is fetched in the background after release, so it costs the
// viewer no waiting and can afford to be finer. It needs to be: by the time
// anyone reaches that stage they have already spent the connection scrubbing
// the ticket stage, so its gaps are the ones most likely to still be open.
const SEAT_RUNGS = 16

// Only the ticket stage is held for. It sits directly below the fold, so its
// frames are needed within a second of release. The seat stage is five sections
// down; holding the loading screen for it just made everyone wait longer.
const TASKS = [
  ...ladderIndices('ticket', TICKET_RUNGS).map((index) => ({ type: 'ticket', index })),
  { type: 'static', url: '/assets/logo-horizontal.png' },
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

      // The seat stage is not worth holding the page for, but its ladder must
      // be in place well before the viewer scrolls that far. Start it now, off
      // the critical path, and hold bulk fill-in behind it: both stages scrub
      // 100+ frames across roughly one viewport of scroll, so a stage that has
      // only its first few frames when the viewer arrives looks frozen.
      gateBulkPreload(preloadLadder('seat', SEAT_RUNGS))
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
            await loadFrame(task.type, task.index, PRIORITY_HOLD)
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
