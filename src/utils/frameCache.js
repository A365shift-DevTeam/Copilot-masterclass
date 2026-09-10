/**
 * Shared in-memory frame cache and priority loader for scroll experiences.
 * Decoded frames persist across components and initial preloading.
 */

export const TOTAL_SEAT_FRAMES = 118
export const TOTAL_TICKET_FRAMES = 107

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

// c_limit never upscales, so a bucket wider than the 1920px source costs nothing.
const DELIVERY = `f_auto,q_auto:good,c_limit,w_${FRAME_WIDTH}`

function cloudFrameUrl(folder, pad) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${DELIVERY}/${folder}/frame_${pad}`
}

export function getSeatFrameUrl(index) {
  return cloudFrameUrl(SEAT_CLOUD_FOLDER, String(index + 1).padStart(4, '0'))
}

export function getTicketFrameUrl(index) {
  return cloudFrameUrl(TICKET_CLOUD_FOLDER, String(index + 1).padStart(4, '0'))
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
