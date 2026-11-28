import { applySiteData } from './content.js'

/* The admin backend is the only source of names, prices, payment links, dates,
   Pricing cards, offers and the WhatsApp link. `firstLoad` starts as soon as this
   module is imported, and the preloader (hooks/useSitePreload.js) holds the page
   until it settles. Nothing is shown until the first load succeeds: if it fails,
   App shows SiteUnavailable with a Retry, never a built-in price. */

let rerender = () => {}
// Bumped on every successful load, so the memoised page in App.jsx knows to re-render with the new values.
// 0 means no data yet.
export let version = 0
// True once a load has failed with nothing loaded before it.
export let failed = false
export const onSiteData = (fn) => { rerender = fn }

// One load at a time: several countdowns reaching zero together share it.
let inflight = null

export function loadSiteData() {
  const api = import.meta.env.VITE_API_URL
  if (inflight) return inflight
  inflight = (api ? fetch(`${api}/api/public/site`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    : Promise.reject(new Error('VITE_API_URL is not set')))
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`site data: ${r.status}`))))
    .then((data) => { applySiteData(data); version += 1; failed = false; rerender() })
    // A later refresh (an offer ending) that fails keeps the values already loaded from the API.
    .catch((e) => { console.warn('Admin API unavailable:', e.message); if (version === 0) { failed = true; rerender() } })
    .finally(() => { inflight = null })
  return inflight
}

export const firstLoad = loadSiteData()
