export const SEAT_PRICE = 499

/**
 * The label inside every "reserve your seat" pill: the hero's, and the two
 * scroll reveals that used to read BOOK NOW. Shared so the wording, the quote
 * marks and the breathing price stay identical across all three.
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
