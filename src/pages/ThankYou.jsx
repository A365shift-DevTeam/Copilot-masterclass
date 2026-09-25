import { useEffect, useState } from 'react'
import { Check, ChevronRight, Mail, Phone } from 'lucide-react'
import { FOOTER, WHATSAPP_COMMUNITY_URL } from '../data/content.js'

// Seat price, reported to the Meta Pixel as the Purchase value.
const SEAT_PRICE_INR = 499

const PAPER_COLORS = ['#2f9a92', '#69b451', '#f5c542', '#ff6b6b', '#5ec8e5', '#062b70', '#8ed4b0', '#ff9f43']

let paperSeq = 0

function makePapers() {
  return Array.from({ length: 72 }, () => {
    const strip = Math.random() < 0.4
    return {
      id: ++paperSeq,
      left: Math.random() * 100,
      delay: Math.random() * 0.28,
      duration: 2.3 + Math.random() * 1.7,
      color: PAPER_COLORS[Math.floor(Math.random() * PAPER_COLORS.length)],
      drift: Math.round((Math.random() - 0.5) * 200),
      spin: Math.round(420 + Math.random() * 700),
      w: strip ? 6 + Math.round(Math.random() * 3) : 10 + Math.round(Math.random() * 7),
      h: strip ? 14 + Math.round(Math.random() * 12) : 7 + Math.round(Math.random() * 6),
      radius: Math.random() < 0.16 ? '50%' : '2px',
    }
  })
}

/* The payment page redirects here after a successful checkout. The page
 * cannot verify the payment itself, so anyone opening /thank-you directly
 * also fires the Purchase event. */
export default function ThankYou() {
  const [papers, setPapers] = useState([])

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

  function dropPapers() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const burst = makePapers()
    setPapers((current) => [...current, ...burst].slice(-160))
    const life = (Math.max(...burst.map((p) => p.delay + p.duration)) + 0.2) * 1000
    window.setTimeout(() => {
      const ids = new Set(burst.map((p) => p.id))
      setPapers((current) => current.filter((p) => !ids.has(p.id)))
    }, life)
  }

  const email = FOOTER.email.toLowerCase()

  return (
    <main className="ty">
      <div className="ty__halo" aria-hidden="true" />
      <div className="ty__wave" aria-hidden="true" />
      {papers.length > 0 && (
        <div className="ty__confetti" aria-hidden="true">
          {papers.map((p) => (
            <span
              key={p.id}
              className="ty__paper"
              style={{
                left: `${p.left}%`,
                width: p.w,
                height: p.h,
                background: p.color,
                borderRadius: p.radius,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                '--drift': `${p.drift}px`,
                '--spin': p.spin,
              }}
            />
          ))}
        </div>
      )}

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
          target="_blank"
          rel="noopener noreferrer"
          onClick={dropPapers}
        >
          <span className="ty__wa-icon" aria-hidden="true">
            <Phone strokeWidth={2.25} />
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
