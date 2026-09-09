/**
 * Shared in-memory frame cache and priority loader for scroll experiences.
 * Decoded frames persist across components and initial preloading.
 */

export const TOTAL_SEAT_FRAMES = 118
export const SEAT_FRAME_BASE = '/frames/seat-scroll/frame_'

export const TOTAL_TICKET_FRAMES = 107
export const TICKET_FRAME_BASE = '/frames/ticket-scroll/frame_'

export const seatFrames = new Array(TOTAL_SEAT_FRAMES)
export const ticketFrames = new Array(TOTAL_TICKET_FRAMES)

const seatPromises = new Map()
const ticketPromises = new Map()

const seatListeners = new Set()
const ticketListeners = new Set()

export function getSeatFrameUrl(index) {
  const pad = String(index + 1).padStart(4, '0')
  return `${SEAT_FRAME_BASE}${pad}.webp`
}

export function getTicketFrameUrl(index) {
  const pad = String(index + 1).padStart(4, '0')
  return `${TICKET_FRAME_BASE}${pad}.webp`
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

/**
 * Loads a single frame into the shared cache if not already loaded.
 * Ensures decode() is called before resolving.
 */
export function loadFrame(type, index) {
  const frames = type === 'seat' ? seatFrames : ticketFrames
  const promises = type === 'seat' ? seatPromises : ticketPromises
  const total = type === 'seat' ? TOTAL_SEAT_FRAMES : TOTAL_TICKET_FRAMES
  const getUrl = type === 'seat' ? getSeatFrameUrl : getTicketFrameUrl

  if (index < 0 || index >= total) return Promise.resolve(null)
  if (frames[index]) return Promise.resolve(frames[index])
  if (promises.has(index)) return promises.get(index)

  const p = new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.src = getUrl(index)

    const onReady = () => {
      frames[index] = img
      promises.delete(index)
      notifyFrameLoaded(type, index, img)
      resolve(img)
    }

    const onFail = () => {
      promises.delete(index)
      resolve(null)
    }

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
  })

  promises.set(index, p)
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
 * Prioritizes loading frames in a radius around the user's current scroll frame.
 */
export function preloadAround(type, centerIndex, radius = 6) {
  const total = type === 'seat' ? TOTAL_SEAT_FRAMES : TOTAL_TICKET_FRAMES
  const clamped = Math.max(0, Math.min(total - 1, centerIndex))

  loadFrame(type, clamped)
  for (let i = 1; i <= radius; i++) {
    const next = clamped + i
    const prev = clamped - i
    if (next < total) loadFrame(type, next)
    if (prev >= 0) loadFrame(type, prev)
  }
}

/**
 * Bulk preload with bounded concurrency.
 */
export function startBulkPreload(type, concurrency = 8) {
  const total = type === 'seat' ? TOTAL_SEAT_FRAMES : TOTAL_TICKET_FRAMES
  let cursor = 0
  let active = true

  const worker = async () => {
    while (active && cursor < total) {
      const idx = cursor++
      await loadFrame(type, idx)
    }
  }

  for (let i = 0; i < concurrency; i++) {
    worker()
  }

  return () => {
    active = false
  }
}
