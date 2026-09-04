import { scrollToTarget } from '../hooks/useLenis.js'
import './seat-reveal.css'

/**
 * The copy block that lands on the right of the chair once the scrub reaches
 * the end: "YOUR SEAT IS WAITING", the price, and the real CTA.
 *
 * These used to be baked into the video frames. They are now real DOM, so the
 * headline is selectable, the price is readable by a screen reader and BOOK NOW
 * is a genuine focusable <button>.
 *
 * Reveal timing is driven by --wait / --price / --cta / --connector, written
 * once per frame by SeatScrollExperience from the single scroll progress value.
 * Each one only feeds an opacity and a transform.
 */
export default function SeatReveal({ onBook, tabbable = false, amount = 499 }) {
  const openBookingModal = () => {
    if (onBook) {
      onBook()
      return
    }
    scrollToTarget('#register', -20)
  }

  return (
    <div className="seat-reveal">
      {/* Dotted leader running back to the chair, as in the reference */}
      <div className="seat-reveal__connector" aria-hidden="true">
        <span className="seat-reveal__connector-line" />
        <span className="seat-reveal__connector-dot" />
      </div>

      <div className="seat-reveal__copy">
        <h3 className="seat-reveal__headline">
          <span>Your Seat</span>
          <span>Is Waiting</span>
        </h3>

        <p className="seat-reveal__price">
          <span className="seat-reveal__amount">&#8377;{amount}</span>
          <span className="seat-reveal__only">Only</span>
        </p>

        <button
          type="button"
          className="seat-reveal__cta"
          onClick={openBookingModal}
          tabIndex={tabbable ? 0 : -1}
          aria-label={`Book now — reserve your seat for ₹${amount}`}
        >
          <span>Book Now</span>
          {/* The site's existing sweep, same as the hero's "Reserve My Seat" */}
          <span className="btn-shine" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
