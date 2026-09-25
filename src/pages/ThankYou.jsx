import { useEffect, useRef } from 'react'
import { Check, ChevronRight, Mail } from 'lucide-react'
import { FOOTER, WHATSAPP_COMMUNITY_URL } from '../data/content.js'
import Confetti from '../components/ui/motion-confetti.tsx'

// Seat price, reported to the Meta Pixel as the Purchase value.
const SEAT_PRICE_INR = 499

// Matches Confetti's duration so the redirect starts when the burst ends.
const CONFETTI_MS = 2500

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.32 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.15h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.9c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.81-.11-.42-.14-.95-.3-1.64-.59-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.27.64-.39.85-.39.21 0 .42 0 .6.01.19.01.45-.07.7.53.26.64.87 2.2.95 2.36.08.16.13.35.03.56-.1.21-.16.34-.31.52-.16.19-.33.42-.47.56-.16.16-.32.33-.14.64.19.32.83 1.37 1.78 2.22 1.22 1.09 2.25 1.43 2.57 1.59.32.16.5.13.69-.08.19-.21.8-.93 1.01-1.25.21-.32.43-.27.72-.16.29.1 1.84.87 2.16 1.03.32.16.53.24.61.37.08.14.08.78-.16 1.46z"
      />
    </svg>
  )
}

/* The payment page redirects here after a successful checkout. The page
 * cannot verify the payment itself, so anyone opening /thank-you directly
 * also fires the Purchase event. */
export default function ThankYou() {
  const confettiRef = useRef(null)
  const leaving = useRef(false)

  useEffect(() => {
    document.title = 'Payment Successful - Copilot AmBot365'

    // Post-payment page: keep it out of search results.
    const robots = document.querySelector('meta[name="robots"]')
    if (robots) robots.setAttribute('content', 'noindex, nofollow')

    // index.html has already loaded the pixel and sent the PageView.
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Purchase', { value: SEAT_PRICE_INR, currency: 'INR' })
    }
  }, [])

  function joinCommunity(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (leaving.current) return
    leaving.current = true

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced) confettiRef.current?.fire()
    window.setTimeout(() => {
      window.location.assign(WHATSAPP_COMMUNITY_URL)
    }, reduced ? 0 : CONFETTI_MS)
  }

  const email = FOOTER.email.toLowerCase()

  return (
    <main className="ty">
      <div className="ty__halo" aria-hidden="true" />
      <div className="ty__wave" aria-hidden="true" />
      <Confetti
        ref={confettiRef}
        showTrigger={false}
        fullscreen
        particleCount={400}
        spread={360}
        startVelocity={48}
        size={1.15}
        duration={CONFETTI_MS / 1000}
      />

      <div className="ty__inner">
        <div className="ty__seal" aria-hidden="true">
          <svg className="ty__rays" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="58" />
            <line x1="80.0" y1="14.0" x2="80.0" y2="2.0" />
            <line x1="111.5" y1="25.4" x2="116.0" y2="17.6" />
            <line x1="134.6" y1="48.5" x2="142.4" y2="44.0" />
            <line x1="146.0" y1="80.0" x2="158.0" y2="80.0" />
            <line x1="134.6" y1="111.5" x2="142.4" y2="116.0" />
            <line x1="111.5" y1="134.6" x2="116.0" y2="142.4" />
            <line x1="80.0" y1="146.0" x2="80.0" y2="158.0" />
            <line x1="48.5" y1="134.6" x2="44.0" y2="142.4" />
            <line x1="25.4" y1="111.5" x2="17.6" y2="116.0" />
            <line x1="14.0" y1="80.0" x2="2.0" y2="80.0" />
            <line x1="25.4" y1="48.5" x2="17.6" y2="44.0" />
            <line x1="48.5" y1="25.4" x2="44.0" y2="17.6" />
          </svg>
          <span className="ty__check">
            <Check strokeWidth={3} />
          </span>
        </div>

        <p className="ty__badge">Payment Successful</p>

        <h1 className="ty__title">
          Thank You!
          <br />
          <span className="ty__seat">
            Your Seat is <span className="ty__confirmed">Confirmed</span>
          </span>
        </h1>

        <p className="ty__lead">
          You're registered for the
          <br />
          <strong>Microsoft 365 Copilot Masterclass.</strong>
        </p>

        <a
          className="ty__wa"
          href={WHATSAPP_COMMUNITY_URL}
          onClick={joinCommunity}
        >
          <span className="ty__wa-icon" aria-hidden="true">
            <WhatsAppIcon />
          </span>
          <span className="ty__wa-text">
            Join the
            <br />
            WhatsApp Community
            <ChevronRight aria-hidden="true" />
          </span>
        </a>

        <div className="ty__support">
          <span className="ty__mail" aria-hidden="true">
            <Mail strokeWidth={1.75} />
          </span>
          <p>
            For any support, email us at
            <br />
            <a href={`mailto:${email}`}>{email}</a>
          </p>
        </div>
      </div>
    </main>
  )
}
