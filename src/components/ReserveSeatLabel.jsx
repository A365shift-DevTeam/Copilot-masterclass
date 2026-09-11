export const SEAT_PRICE = 499
export const BOT_LOGO = '/assets/ambot-bot.png'

/**
 * The label inside every "reserve your seat" pill: the hero's, the two scroll
 * reveals, and the four section buttons. Shared so the wording, the price and
 * the bot beside it stay identical across all of them.
 *
 * The bot sits in a fixed-size slot after the price. Where `travels` is true
 * the slot holds a dimmed ghost and is registered as a waypoint — the live
 * bot in LogoTraveller flies between those and lands on top. The two scroll
 * reveals opt out: their pills ride their own scroll transforms, so a
 * traveller aiming at them would chase a moving target. They show a solid bot
 * instead.
 *
 * Callers own the pill itself, since each one is a different element with its
 * own reveal mechanics.
 */
export default function ReserveSeatLabel({ amount = SEAT_PRICE, travels = true }) {
  return (
    <>
      Reserve your seat for just{' '}
      <span className="btn-price-highlight">&#8377;{amount}</span>
      <span
        className={`btn-bot${travels ? ' btn-bot--ghost' : ''}`}
        {...(travels ? { 'data-bot-slot': '' } : null)}
      >
        <img src={BOT_LOGO} alt="" aria-hidden="true" />
      </span>
    </>
  )
}
