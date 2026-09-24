import { useEffect } from 'react'
import { Check, Mail, CalendarCheck, MonitorPlay } from 'lucide-react'
import { FOOTER } from '../data/content.js'

// Seat price, reported to the Meta Pixel as the Purchase value.
const SEAT_PRICE_INR = 499

const STEPS = [
  {
    icon: Mail,
    t: 'Check your inbox',
    d: "A payment receipt and registration confirmation are on their way to your email. Check spam or promotions if you don't see them.",
  },
  {
    icon: CalendarCheck,
    t: 'Watch for your joining link',
    d: "We'll send the session joining link, a calendar invite and a reminder before the masterclass starts.",
  },
  {
    icon: MonitorPlay,
    t: 'Come ready to build',
    d: 'Keep Microsoft 365 open on the day so you can follow the live demos and try the prompts as we go.',
  },
]

/* The payment page redirects here after a successful checkout. The page
 * cannot verify the payment itself, so anyone opening /thank-you directly
 * also fires the Purchase event. */
export default function ThankYou() {
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

  const tel = FOOTER.phone.replace(/\s/g, '')

  return (
    <div className="ty">
      <header className="ty__top">
        <a href="/" aria-label="AmBot365 home">
          <img src="/assets/logo-horizontal.png" alt="AmBot365" className="ty__logo" />
        </a>
      </header>

      <main className="ty__main">
        <section className="ty__card" aria-labelledby="ty-title">
          <div className="ty__tick" aria-hidden="true">
            <Check strokeWidth={3} />
          </div>

          <p className="ty__badge">Payment Successful</p>
          <h1 id="ty-title" className="ty__title">
            Thank you! Your seat is <span className="text-gradient">confirmed.</span>
          </h1>
          <p className="ty__lead">
            You're registered for the <strong>Microsoft 365 Copilot Masterclass</strong>.
            We've received your payment and can't wait to see you at the live session.
          </p>

          <ol className="ty__steps">
            {STEPS.map(({ icon: Icon, t, d }) => (
              <li key={t} className="ty__step">
                <span className="ty__step-icon" aria-hidden="true"><Icon /></span>
                <div>
                  <p className="ty__step-title">{t}</p>
                  <p className="ty__step-text">{d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="ty__actions">
            <a href="/" className="btn-primary">Back to Website</a>
            <a
              href={`mailto:${FOOTER.email}?subject=Copilot%20Masterclass%20registration`}
              className="ty__btn-ghost"
            >
              Contact Us
            </a>
          </div>

          <p className="ty__help">
            Questions about your registration? Email{' '}
            <a href={`mailto:${FOOTER.email}`}>{FOOTER.email}</a> or call{' '}
            <a href={`tel:${tel}`}>{FOOTER.phone}</a>.
          </p>
        </section>
      </main>

      <footer className="ty__footer">
        © {new Date().getFullYear()} {FOOTER.company}
      </footer>
    </div>
  )
}
