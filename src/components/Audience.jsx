import useReveal from '../hooks/useReveal.js'
import { AUDIENCE } from '../data/content.js'

const ICONS = {
  owner: (
    <>
      <circle cx="12" cy="7.5" r="3.2" />
      <path d="M5 20c.6-4 3.4-6 7-6s6.4 2 7 6" />
      <path d="M12 14.2l-1.3 2 1.3 3 1.3-3z" />
    </>
  ),
  ceo: (
    <>
      <circle cx="12" cy="5.5" r="2.4" />
      <path d="M8.5 10.5h7" />
      <path d="M7 20v-6.5h10V20" />
      <path d="M5.5 20h13" />
    </>
  ),
  managers: (
    <>
      <circle cx="7" cy="8.5" r="2.1" />
      <circle cx="17" cy="8.5" r="2.1" />
      <circle cx="12" cy="6.5" r="2.4" />
      <path d="M3.5 19c.4-2.8 1.8-4.4 3.5-4.4M20.5 19c-.4-2.8-1.8-4.4-3.5-4.4" />
      <path d="M8 20c.4-3.4 2-5.2 4-5.2s3.6 1.8 4 5.2" />
    </>
  ),
  m365: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  sales: (
    <>
      <path d="M4 20v-7M9.5 20V9M15 20v-5M20 20V7" />
      <path d="M4 9l5.5-3.5 5 3L20 4" />
      <path d="M20 4h-3.5M20 4v3.5" />
    </>
  ),
  finance: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9.5 8h5M9.5 11.5h5M9.5 15h3" />
    </>
  ),
  hr: (
    <>
      <rect x="5" y="5" width="14" height="15" rx="2" />
      <path d="M10 5V3.5h4V5" />
      <circle cx="12" cy="11" r="2" />
      <path d="M8.8 17c.5-1.6 1.7-2.4 3.2-2.4s2.7.8 3.2 2.4" />
    </>
  ),
  admin: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.7 6.7l1.4 1.4M15.9 15.9l1.4 1.4M6.7 17.3l1.4-1.4M15.9 8.1l1.4-1.4" />
    </>
  ),
  educator: (
    <>
      <path d="M3 9l9-4.5L21 9l-9 4.5z" />
      <path d="M7 11.2V15c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6v-3.8" />
      <path d="M21 9v5" />
    </>
  ),
  it: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
      <path d="M10 20.5h4M12 16.5v4" />
      <path d="M9 8.5l-2.2 2 2.2 2M15 8.5l2.2 2-2.2 2" />
    </>
  ),
  dx: (
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 3.5V8h-4.5" />
    </>
  ),
}

function AudienceCard({ person, accent }) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`aud-card aud-card--${accent}`}>
      <span className="aud-card__num">{person.n}</span>
      <span className="aud-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[person.icon]}
        </svg>
      </span>
      <div className="aud-card__body">
        <h3 className="aud-card__title">{person.t}</h3>
        <p className="aud-card__desc">{person.d}</p>
        <span className="aud-card__bar" />
      </div>
    </div>
  )
}

export default function Audience() {
  const headRef = useReveal()
  return (
    <section className="section--subtle" style={{ padding: 'var(--section-pad)' }}>
      <div className="section__inner" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div ref={headRef} className="section-head" style={{ maxWidth: 700, marginBottom: 44 }}>
          <h2 className="h2" style={{ marginBottom: 12 }}>Who Should Attend?</h2>
          <p style={{ fontSize: 16 }}>Built for teams who already work in Microsoft 365 and want to work smarter.</p>
        </div>
        <div className="audience-grid">
          {AUDIENCE.map((p, i) => (
            <AudienceCard key={p.n} person={p} accent={i % 2 === 0 ? 'green' : 'blue'} />
          ))}
        </div>
      </div>
    </section>
  )
}
