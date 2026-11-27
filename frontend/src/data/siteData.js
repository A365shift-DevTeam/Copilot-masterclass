import { applySiteData } from './content.js'

/* The admin backend is the source of truth for names, prices, payment links,
   dates, offers and the WhatsApp link. `firstLoad` starts as soon as this module
   is imported, and the preloader (hooks/useSitePreload.js) holds the page until
   it settles, so visitors never see a stale price. If the API is down, the
   values written in content.js are the fallback, so the site still works. */

let rerender = () => {}
// Bumped on every load, so the memoised page in App.jsx knows to re-render with the new values.
export let version = 0
export const onSiteData = (fn) => { rerender = fn }

// One load at a time: several countdowns reaching zero together share it.
let inflight = null

export function loadSiteData() {
  const api = import.meta.env.VITE_API_URL
  if (!api) return Promise.resolve() // dev without a backend: content.js only
  if (inflight) return inflight
  inflight = fetch(`${api}/api/public/site`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`site data: ${r.status}`))))
    .then((data) => { applySiteData(data); version += 1; rerender() })
    .catch((e) => console.warn('Admin API unavailable, using built-in content:', e.message))
    .finally(() => { inflight = null })
  return inflight
}

export const firstLoad = loadSiteData()
