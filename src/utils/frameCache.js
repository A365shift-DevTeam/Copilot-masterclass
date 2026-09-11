/**
 * Shared in-memory frame cache and priority loader for scroll experiences.
 * Decoded frames persist across components and initial preloading.
 */

/*
 * What was uploaded. Every frame is still on Cloudinary; STRIDE decides how
 * many of them the scrub actually uses.
 */
const SOURCE_SEAT_FRAMES = 118
const SOURCE_TICKET_FRAMES = 103

/*
 * Play every Nth source frame.
 *
 * Each stage scrubs its whole sequence across roughly one screen of scroll —
 * about 11px per frame at 118 frames — which is far finer than anyone can
 * perceive while scrolling. At stride 2 the sequences cost half as much (13MB
 * down to ~6.5MB) for no visible loss, and the halving is what lets them
 * actually arrive before the viewer scrolls past.
 *
 * Set back to 1 to play every frame again; nothing needs re-uploading.
 */
const FRAME_STRIDE = 2

const strideCount = (source) => Math.ceil(source / FRAME_STRIDE)

export const TOTAL_SEAT_FRAMES = strideCount(SOURCE_SEAT_FRAMES)
export const TOTAL_TICKET_FRAMES = strideCount(SOURCE_TICKET_FRAMES)

export const seatFrames = new Array(TOTAL_SEAT_FRAMES)
export const ticketFrames = new Array(TOTAL_TICKET_FRAMES)

const seatPromises = new Map()
const ticketPromises = new Map()

const seatListeners = new Set()
const ticketListeners = new Set()

/*
 * Frames are served from Cloudinary so the sequences stay out of the deploy and
 * come off a CDN edge sized for the device.
 *
 * There is no local fallback: public/frames was deleted once the upload was
 * verified. Re-run `npm run upload:frames` after regenerating frames, and see
 * scripts/upload-frames-cloudinary.mjs for the public-ID scheme these URLs
 * assume (folder/frame_0001, no extension, no random suffix).
 */
const CLOUD_NAME = import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME || 'dghhdz3et'

export const SEAT_CLOUD_FOLDER = 'seat-frames'
export const TICKET_CLOUD_FOLDER = 'ticket-frames'

const WIDTH_BUCKETS = [640, 960, 1280, 1600, 1920]

/*
 * Resolved once, at module load, and never recomputed. A bucket that shifted on
 * resize would orphan every frame already in the cache and pull the whole
 * sequence down again at the new width.
 */
const FRAME_WIDTH = (() => {
  if (typeof window === 'undefined') return 1920
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const needed = Math.ceil(window.innerWidth * dpr)
  return WIDTH_BUCKETS.find((w) => w >= needed) || 1920
})()

/*
 * f_webp rather than f_auto, deliberately.
 *
 * f_auto makes Cloudinary answer with `Vary: Accept, User-Agent`, so the CDN
 * keeps a separate cached derivative per browser string and most visitors pay
 * a cold origin fetch — measured at 1.9s per frame cold against 0.6s warm.
 * Pinning the format gives every visitor the same cached object. The sources
 * are already WebP, so f_auto was picking WebP anyway, and WebP decodes faster
 * than AVIF, which matters when a scrub decodes 118 of them.
 *
 * c_limit never upscales, so a bucket wider than the 1920px source is free.
 */
const DELIVERY = `f_webp,q_auto:good,c_limit,w_${FRAME_WIDTH}`

/** Scrub index to the 1-based source frame it plays, honouring FRAME_STRIDE. */
function sourceFrameNumber(index, sourceTotal) {
  return Math.min(index * FRAME_STRIDE + 1, sourceTotal)
}

function cloudFrameUrl(folder, sourceNumber) {
  const pad = String(sourceNumber).padStart(4, '0')
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${DELIVERY}/${folder}/frame_${pad}`
}

export function getSeatFrameUrl(index) {
  return cloudFrameUrl(SEAT_CLOUD_FOLDER, sourceFrameNumber(index, SOURCE_SEAT_FRAMES))
}

export function getTicketFrameUrl(index) {
  return cloudFrameUrl(TICKET_CLOUD_FOLDER, sourceFrameNumber(index, SOURCE_TICKET_FRAMES))
}

/**
 * Subscribes to frame-loaded events for a specific sequence ('seat' or 'ticket').
 * Returns an unsubscribe function.
 */
export function subscribeFrames(type, callback) {
  const listeners = type === 'seat' ? seatListeners : ticketListeners
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function notifyFrameLoaded(type, index, img) {
  const listeners = type === 'seat' ? seatListeners : ticketListeners
  listeners.forEach((cb) => {
    try {
      cb(index, img)
    } catch {
      // Ignore listener error
    }
  })
}

/*
 * Every frame request goes through one capped, prioritised queue.
 *
 * Without the cap, preloadAround fires on every animation frame and enqueues
 * the whole sequence as the viewer scrubs. Those requests all multiplex onto a
 * single HTTP/2 connection and share the available bandwidth, so on a slow link
 * a hundred frames each crawl and none of them finishes. A half-downloaded
 * frame paints nothing, so the stage freezes on whatever it had while the
 * overlay copy animates on schedule. Measured on a 1.6Mbps link: 130 requests
 * sent, 35 finished, 95 outstanding, and the seat stage pinned on frame 0.
 *
 * With a cap, the same bandwidth completes frames one after another instead of
 * starving all of them, which is the difference between a coarse scrub and a
 * frozen one.
 */
// Sized against Cloudinary's ~0.6s edge round-trip: below this the sequence is
// latency-bound and frames trickle in, far above it a slow link splits its
// bandwidth across so many requests that none of them finishes.
const MAX_IN_FLIGHT = 10

// Lower number wins. Frames at the viewer's position are worth more than the
// ladder, which is worth more than bulk fill-in.
export const PRIORITY_HOLD = 10
export const PRIORITY_LADDER = 50
export const PRIORITY_BULK = 1000

let inFlight = 0
const waiting = new Map()

const waitKey = (type, index) => `${type}:${index}`

/*
 * Where each stage's scrub currently sits, or null when it is off screen.
 *
 * Demand requests are ranked against this at the moment a slot frees, not at
 * the moment they were queued. Ranking at queue time let a stage the viewer had
 * already left keep a hundred frames sitting at top priority, which starved the
 * stage they were actually scrolling toward.
 */
const activeFrame = { seat: null, ticket: null }

export function setActiveFrame(type, index) {
  activeFrame[type] = index
}

function effectivePriority(entry) {
  if (!entry.demand) return entry.priority
  const active = activeFrame[entry.type]
  if (active == null) return PRIORITY_BULK
  return Math.abs(entry.index - active)
}

function pump() {
  while (inFlight < MAX_IN_FLIGHT && waiting.size > 0) {
    let best = null
    let bestRank = Infinity
    for (const entry of waiting.values()) {
      const rank = effectivePriority(entry)
      if (rank < bestRank) {
        best = entry
        bestRank = rank
      }
    }
    waiting.delete(waitKey(best.type, best.index))
    inFlight += 1
    best.begin()
  }
}

/**
 * Loads a single frame into the shared cache if not already loaded.
 * Ensures decode() is called before resolving.
 *
 * `priority` re-ranks a request that is still queued, so a frame the viewer has
 * just scrolled to overtakes the bulk fill-in already waiting ahead of it.
 */
export function loadFrame(type, index, priority = PRIORITY_BULK, demand = false) {
  const frames = type === 'seat' ? seatFrames : ticketFrames
  const promises = type === 'seat' ? seatPromises : ticketPromises
  const total = type === 'seat' ? TOTAL_SEAT_FRAMES : TOTAL_TICKET_FRAMES
  const getUrl = type === 'seat' ? getSeatFrameUrl : getTicketFrameUrl

  if (index < 0 || index >= total) return Promise.resolve(null)
  if (frames[index]) return Promise.resolve(frames[index])
  if (promises.has(index)) {
    const pendingEntry = waiting.get(waitKey(type, index))
    if (pendingEntry) {
      if (priority < pendingEntry.priority) pendingEntry.priority = priority
      if (demand) pendingEntry.demand = true
    }
    return promises.get(index)
  }

  const p = new Promise((resolve) => {
    // A second settle would decrement inFlight twice and the queue would leak
    // slots until it stalled for good, so guard it rather than trust that only
    // one of decode/onload/onerror ever fires.
    let settled = false
    const settle = (img) => {
      if (settled) return
      settled = true
      promises.delete(index)
      inFlight -= 1
      if (img) {
        frames[index] = img
        notifyFrameLoaded(type, index, img)
      }
      resolve(img)
      pump()
    }

    const begin = () => {
      const img = new Image()
      img.decoding = 'async'
      img.src = getUrl(index)

      const onReady = () => settle(img)
      const onFail = () => settle(null)

      if (typeof img.decode === 'function') {
        img.decode().then(onReady, () => {
          if (img.complete && img.naturalWidth > 0) onReady()
          else {
            img.onload = onReady
            img.onerror = onFail
          }
        })
      } else {
        img.onload = onReady
        img.onerror = onFail
      }
    }

    waiting.set(waitKey(type, index), { type, index, priority, demand, begin })
  })

  promises.set(index, p)
  pump()
  return p
}

/**
 * Finds the nearest decoded frame for a given index so scrubbing never blanks out.
 * Returns { img, isExact, frameIndex }
 */
export function resolveCachedFrame(type, index) {
  const frames = type === 'seat' ? seatFrames : ticketFrames
  const total = type === 'seat' ? TOTAL_SEAT_FRAMES : TOTAL_TICKET_FRAMES
  const clamped = Math.max(0, Math.min(total - 1, index))

  if (frames[clamped]) {
    return { img: frames[clamped], isExact: true, frameIndex: clamped }
  }

  for (let step = 1; step < total; step++) {
    const prev = clamped - step
    if (prev >= 0 && frames[prev]) {
      return { img: frames[prev], isExact: false, frameIndex: prev }
    }
    const next = clamped + step
    if (next < total && frames[next]) {
      return { img: frames[next], isExact: false, frameIndex: next }
    }
  }

  return { img: null, isExact: false, frameIndex: -1 }
}

/**
 * The indices of `count` frames spread evenly across a sequence.
 *
 * Loading a prefix instead leaves resolveCachedFrame with nothing near the far
 * end: a viewer who reaches the section before the fill-in completes sees the
 * canvas pinned on the last frame of the prefix while the scroll runs on, so
 * the stage looks frozen even though the overlay copy keeps animating.
 *
 * A ladder guarantees a decoded frame within total/count of any target, so the
 * scrub always moves. It is coarse until the gaps fill, which reads as a
 * low-frame-rate animation rather than a broken one.
 */
export function ladderIndices(type, count) {
  const total = type === 'seat' ? TOTAL_SEAT_FRAMES : TOTAL_TICKET_FRAMES
  const n = Math.max(1, Math.min(count, total))
  const step = n === 1 ? 0 : (total - 1) / (n - 1)
  const out = new Set()
  for (let i = 0; i < n; i++) out.add(Math.round(i * step))
  return [...out]
}

/** Loads the ladder for a sequence. Resolves once every rung is decoded. */
export function preloadLadder(type, count) {
  return Promise.all(
    ladderIndices(type, count).map((index) => loadFrame(type, index, PRIORITY_LADDER))
  )
}

/*
 * Bulk fill-in waits on this. Without it the ticket stage's 5MB fill-in owns
 * the connection while the viewer is still scrolling toward the seat stage, so
 * the seat ladder arrives one rung at a time and that stage is still frozen
 * when they get there. Measured on a 1.6Mbps link: one seat frame decoded after
 * six seconds of scrolling.
 *
 * Priority ends up: frames at the viewer's position (preloadAround, never
 * gated) > ladders > bulk fill-in.
 */
let bulkGate = Promise.resolve()

export function gateBulkPreload(promise) {
  bulkGate = Promise.resolve(promise).catch(() => {})
}

/**
 * Prioritizes loading frames in a radius around the user's current scroll frame.
 */
export function preloadAround(type, centerIndex, radius = 6) {
  const total = type === 'seat' ? TOTAL_SEAT_FRAMES : TOTAL_TICKET_FRAMES
  const clamped = Math.max(0, Math.min(total - 1, centerIndex))

  // Flagged as demand, so the queue ranks these against where the viewer is
  // when a slot frees rather than where they were when the request was made.
  setActiveFrame(type, clamped)
  loadFrame(type, clamped, 0, true)
  for (let i = 1; i <= radius; i++) {
    const next = clamped + i
    const prev = clamped - i
    if (next < total) loadFrame(type, next, i, true)
    if (prev >= 0) loadFrame(type, prev, i, true)
  }
}

/**
 * Bulk preload with bounded concurrency, filling outward from `startIndex`.
 *
 * Order matters on a slow connection: starting at 0 spends the whole pipe on
 * frames the viewer has already scrolled past, so the frames actually needed
 * next queue behind them.
 */
export function startBulkPreload(type, concurrency = 8, startIndex = 0) {
  const total = type === 'seat' ? TOTAL_SEAT_FRAMES : TOTAL_TICKET_FRAMES
  const from = Math.max(0, Math.min(total - 1, Math.round(startIndex) || 0))

  const order = []
  for (let i = from; i < total; i++) order.push(i)
  for (let i = from - 1; i >= 0; i--) order.push(i)

  let cursor = 0
  let active = true

  const worker = async () => {
    await bulkGate
    while (active && cursor < order.length) {
      const idx = order[cursor++]
      await loadFrame(type, idx, PRIORITY_BULK)
    }
  }

  for (let i = 0; i < concurrency; i++) {
    worker()
  }

  return () => {
    active = false
  }
}
