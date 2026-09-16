export const SEAT_PRICE = 499
export const BOT_LOGO = '/assets/ambot-bot.png'

/**
 * The label inside every "reserve your seat" pill: the hero's, the two scroll
 * reveals, and the four section buttons. Shared so the wording and the price
 * stay identical across all of them.
 *
 * Callers own the pill itself, since each one is a different element with its
 * own reveal mechanics.
 */
export default function ReserveSeatLabel({ amount = SEAT_PRICE }) {
  return (
    <>
      Reserve your seat for just{' '}
      <span className="btn-price-highlight">&#8377;{amount}</span>
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
 * slot holds a dimmed ghost and is registered as a waypoint — the live bot in
 * LogoTraveller flies between those and lands on top. The two scroll reveals
 * opt out: their pills ride their own scroll transforms, so a traveller
 * aiming at them would chase a moving target. They show a solid bot instead.
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
