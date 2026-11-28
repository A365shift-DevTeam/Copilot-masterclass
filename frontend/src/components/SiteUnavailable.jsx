import { useState } from 'react'
import { RotateCw } from 'lucide-react'
import { loadSiteData } from '../data/siteData.js'
import './site-unavailable.css'

/* Shown instead of the page when the admin API can't be reached on the first load.
   Prices and links only ever come from the API, so there is nothing safe to show without it. */
export default function SiteUnavailable() {
  const [busy, setBusy] = useState(false)
  const retry = () => { setBusy(true); loadSiteData().finally(() => setBusy(false)) }

  return (
    <main className="site-down" role="alert">
      <img src="/assets/logo-horizontal.webp" alt="AmBot365" className="site-down__logo" />
      <h1>We couldn’t load the page</h1>
      <p>Please check your connection and try again. If it keeps happening, we’re on it.</p>
      <button type="button" className="btn-primary" onClick={retry} disabled={busy}>
        <RotateCw aria-hidden="true" className={busy ? 'site-down__spin' : ''} /> {busy ? 'Trying…' : 'Try again'}
      </button>
    </main>
  )
}
