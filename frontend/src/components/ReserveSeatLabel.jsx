import { HERO_PRICES, label } from '../data/content.js'
import { SalePrice } from './ui/SaleBanner.jsx'

export const BOT_LOGO = '/assets/ambot-bot.webp'

// Read at render, so a price changed in the admin (or a running offer) shows on every pill.
const program = (key) => HERO_PRICES.find((p) => p.key === key)
const Amount = ({ amount, of }) =>
  amount != null ? <>&#8377;{amount}</> : <SalePrice price={program(of).price} originalPrice={program(of).originalPrice} />

/**
 * The label inside every "reserve your seat" pill: the hero's, the two scroll
 * reveals, and the four section buttons. Shared so the wording and the price
 * stay identical across all of them.
 *
 * Callers own the pill itself, since each one is a different element with its
 * own reveal mechanics.
 */
export default function ReserveSeatLabel({ amount }) {
  return (
    <>
      {label('reserveLabel')}{' '}
      <span className="btn-price-highlight"><Amount amount={amount} of="webinar" /></span>
    </>
  )
}

export function LiveSessionsLabel({ amount }) {
  return (
    <>
      {label('liveSessionsLabel')}{' '}
      <span className="btn-price-highlight"><Amount amount={amount} of="webinar" /></span>
    </>
  )
}

export function RecordedVideosLabel({ amount }) {
  return (
    <>
      {label('recordedLabel')}{' '}
      <span className="btn-price-highlight"><Amount amount={amount} of="recorded" /></span>
    </>
  )
}

/**
 * The bot that sits beside the pill — outside it, off its right end, so the
 * pill's own `overflow: hidden` (which clips the .btn-shine sweep) cannot
 * crop it. Every caller wraps its pill and this in a `.seat-cta-row`.
 *
 * The slot is a fixed-size box, so the row's width never shifts whether or
 * not the live bot is currently parked there. Where `travels` is true the
 * slot is registered as a waypoint and its own image is hidden — the live bot
 * in LogoTraveller flies between those and is the only one you see. The two
 * scroll reveals opt out: their pills ride their own scroll transforms, so a
 * traveller aiming at them would chase a moving target. They show a solid bot
 * instead. Below the mobile break no traveller mounts at all, so the hidden
 * images come back (see .btn-bot--ghost in styles.css).
 */
export function ReserveSeatBot({ travels = true }) {
  return (
    <span
      className={`btn-bot${travels ? ' btn-bot--ghost' : ''}`}
      aria-hidden="true"
      {...(travels ? { 'data-bot-slot': '' } : null)}
    >
      <img src={BOT_LOGO} alt="" aria-hidden="true" />
    </span>
  )
}
