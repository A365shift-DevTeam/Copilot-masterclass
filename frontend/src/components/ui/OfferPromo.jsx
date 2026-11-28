import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, X } from 'lucide-react'
import { SALE, SHARED, label } from '../../data/content.js'
import { startCheckout } from '../CheckoutDialog.jsx'
import { useCountdown } from './SaleBanner.jsx'

/* While an offer runs (set in the admin): a scrolling strip across the top of the
   page, fashion-site style, and a popup with a countdown 3 seconds after the page
   is ready. Both close for the rest of the visit when dismissed. */

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`
const seen = (k) => { try { return sessionStorage.getItem(k) === '1' } catch { return false } }
const remember = (k) => { try { sessionStorage.setItem(k, '1') } catch { /* storage unavailable */ } }

// Register for the promoted program: its form when it takes payment on the site, else its link.
function register(e) {
  if (!startCheckout(e, SALE.key) && SALE.url) window.open(SALE.url, '_blank', 'noopener,noreferrer')
  e?.preventDefault()
}

const clock = (t) => `${t.days > 0 ? `${t.days}d ` : ''}${t.hms}`

export function PromoStrip() {
  const key = SALE && `promo-strip-${SALE.endsAt}`
  const [closed, setClosed] = useState(() => !!key && seen(key))
  const t = useCountdown(SALE?.endsAt)
  const show = !!SALE && !!t && !closed

  // The fixed navbar moves down below the strip while it shows (see .has-promo in styles.css).
  useEffect(() => {
    document.documentElement.classList.toggle('has-promo', show)
    return () => document.documentElement.classList.remove('has-promo')
  }, [show])
  if (!show) return null

  const save = SALE.originalPrice - SALE.price
  const item = (
    <span className="promo-strip__item">
      <strong>{SALE.badge}</strong>
      <span className="promo-strip__star" aria-hidden="true">✦</span>
      {save > 0 ? <>{label('stripSave')} {inr(save)} {label('stripOn')} {SALE.title}</> : SALE.title}
      <span className="promo-strip__star" aria-hidden="true">✦</span>
      {label('stripEndsIn')} <span className="promo-strip__time">{clock(t)}</span>
      <span className="promo-strip__star" aria-hidden="true">✦</span>
    </span>
  )
  return (
    <div className="promo-strip" role="region" aria-label={label('stripLabel')}>
      <a href={SALE.url ?? '#pricing'} className="promo-strip__track" onClick={register}>
        {/* The same message four times over two halves, so the scroll loops without a seam. */}
        <span className="promo-strip__run">{item}{item}{item}{item}</span>
        <span className="promo-strip__run" aria-hidden="true">{item}{item}{item}{item}</span>
      </a>
      <button type="button" className="promo-strip__close" aria-label={label('stripClose')} onClick={() => { remember(key); setClosed(true) }}>
        <X size={15} />
      </button>
    </div>
  )
}

export function OfferPopup({ ready }) {
  const key = SALE && `promo-popup-${SALE.endsAt}`
  const [open, setOpen] = useState(false)
  const t = useCountdown(SALE?.endsAt)

  // 3 seconds after the page is ready (the loading screen gone), once per visit per offer.
  useEffect(() => {
    if (!ready || !SALE || seen(key)) return
    const timer = setTimeout(() => setOpen(true), 3000)
    return () => clearTimeout(timer)
  }, [ready, key])

  const close = () => { remember(key); setOpen(false) }
  if (!SALE || !t) return null
  const save = SALE.originalPrice - SALE.price
  const names = SHARED.labels?.offerUnits ?? ['', '', '', '']
  const units = [[t.days, names[0]], ...t.hms.split(':').map((n, i) => [n, names[i + 1]])]

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) close() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="legal-dialog__overlay" />
        <Dialog.Content className="legal-dialog offer-popup" aria-describedby={undefined}>
          <Dialog.Close className="course-dialog__close" aria-label={label('close')}><X size={18} aria-hidden /></Dialog.Close>
          <p className="offer-popup__badge">{SALE.badge}</p>
          <Dialog.Title className="offer-popup__title">
            {save > 0 ? <>{label('offerSave')} <span>{inr(save)}</span></> : label('offerSpecial')}
          </Dialog.Title>
          <p className="offer-popup__program">{label('offerOn')} {SALE.title}</p>
          {save > 0 && (
            <p className="offer-popup__price"><s>{inr(SALE.originalPrice)}</s> <strong>{inr(SALE.price)}</strong></p>
          )}
          <p className="offer-popup__ends">{label('offerEndsIn')}</p>
          <div className="offer-popup__clock" role="timer" aria-live="off">
            {units.map(([n, unit]) => (
              <div key={unit}><strong>{String(n).padStart(2, '0')}</strong><span>{unit}</span></div>
            ))}
          </div>
          <a href={SALE.url ?? '#pricing'} className="btn-primary offer-popup__cta" onClick={(e) => { close(); register(e) }}>
            {label('offerRegister')} <ArrowRight aria-hidden="true" />
            <span className="btn-shine" aria-hidden="true" />
          </a>
          <button type="button" className="offer-popup__later" onClick={close}>{label('offerLater')}</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
