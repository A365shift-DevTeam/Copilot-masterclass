import { useEffect, useState } from 'react'
import { SALE } from '../../data/content.js'
import { loadSiteData } from '../../data/siteData.js'

/* Time left on an offer, ticking every second. At zero the site reloads its
   prices from the API, so the normal prices come back without a page refresh. */
export function useCountdown(endsAt) {
  const [now, setNow] = useState(Date.now())
  const ends = endsAt ? +new Date(endsAt) : 0
  const left = ends - now

  useEffect(() => {
    if (!ends) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [ends])

  const over = !!ends && left <= 0
  useEffect(() => { if (over) loadSiteData() }, [over])

  if (!ends || over) return null
  const d = Math.floor(left / 864e5)
  const hms = [Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60]
    .map((n) => String(n).padStart(2, '0')).join(':')
  return { days: d, hms }
}

/** "Ends in 1d 04:12:09" for an offer, or nothing once it has ended. */
export function OfferCountdown({ endsAt, className = 'sale-banner__clock' }) {
  const t = useCountdown(endsAt)
  if (!t) return null
  return (
    <span className={className}>
      Ends in {t.days > 0 && `${t.days}d `}<span className="sale-banner__time">{t.hms}</span>
    </span>
  )
}

/* The running offer from the admin, in the hero. */
export default function SaleBanner() {
  const t = useCountdown(SALE?.endsAt)
  if (!SALE || !t) return null
  return (
    <p className="sale-banner" role="note">
      <span className="sale-banner__badge">{SALE.badge}</span>
      <span className="sale-banner__clock">Ends in {t.days > 0 && `${t.days}d `}<span className="sale-banner__time">{t.hms}</span></span>
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
