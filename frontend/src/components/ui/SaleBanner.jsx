import { useEffect, useState } from 'react'
import { SALE } from '../../data/content.js'
import { loadSiteData } from '../../data/siteData.js'

/* The running offer from the admin, with a countdown. When it reaches zero the
   site reloads its prices from the API, so the normal prices come back without
   a page refresh. */
export default function SaleBanner() {
  const [now, setNow] = useState(Date.now())
  const ends = SALE ? +new Date(SALE.endsAt) : 0
  const left = ends - now

  useEffect(() => {
    if (!SALE) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [ends])

  useEffect(() => {
    if (SALE && left <= 0) loadSiteData()
  }, [SALE && left <= 0]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!SALE || left <= 0) return null
  const d = Math.floor(left / 864e5)
  const hms = [Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60]
    .map((n) => String(n).padStart(2, '0')).join(':')

  return (
    <p className="sale-banner" role="note">
      <span className="sale-banner__badge">{SALE.badge}</span>
      <span className="sale-banner__clock">Ends in {d > 0 && `${d}d `}<span className="sale-banner__time">{hms}</span></span>
    </p>
  )
}

/** "₹349" with the normal price struck through while an offer runs. */
export function SalePrice({ price, originalPrice }) {
  const fmt = (n) => `₹${n.toLocaleString('en-IN')}`
  if (originalPrice == null || originalPrice <= price) return fmt(price)
  return (
    <>
      <s className="sale-was" aria-label={`was ${fmt(originalPrice)}`}>{fmt(originalPrice)}</s> {fmt(price)}
    </>
  )
}
