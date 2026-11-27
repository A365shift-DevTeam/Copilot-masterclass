import { useRef, useState } from 'react'
import { Bot, CalendarCheck, CirclePlay, Gem, Image, Layers, Lock, MonitorPlay } from 'lucide-react'
import { PRICE_LADDER, STORE_URL } from '../data/content.js'

const ICONS = {
  'monitor-play': MonitorPlay, 'circle-play': CirclePlay, image: Image,
  'calendar-check': CalendarCheck, bot: Bot, layers: Layers, gem: Gem,
}

const inr = (n) => `₹${n.toLocaleString('en-IN')}`

function Offer({ name, includes, price, duration, icon, logos, cta, featured }) {
  const Icon = ICONS[icon]
  return (
    <li className={`pl-card${featured ? ' is-featured' : ''}`}>
      <div className="pl-card__top">
        <span className="pl-card__icon" aria-hidden="true">
          {logos
            ? logos.map((src) => <img key={src} src={src} alt="" width="24" height="24" loading="lazy" />)
            : Icon && <Icon />}
        </span>
        {featured && <span className="pl-card__tag">Most popular</span>}
      </div>
      <h4 className="pl-card__name">{name}</h4>
      <p className="pl-card__includes">{includes}</p>
      <div className="pl-card__price">
        <span className="pl-card__amount">{inr(price)}</span>
        <span className="pl-card__duration">{duration}</span>
      </div>
      <a
        href={STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="pl-card__cta"
        aria-label={`${cta}: ${name} (opens Razorpay store in a new tab)`}
      >
        {cta}
      </a>
    </li>
  )
}

export default function PriceLadder() {
  const [active, setActive] = useState(0)
  const tabRefs = useRef([])
  const group = PRICE_LADDER[active]

  // Arrow keys / Home / End move between tabs (WAI-ARIA tabs pattern).
  const onTabKey = (e) => {
    const n = PRICE_LADDER.length
    const next = { ArrowRight: active + 1, ArrowLeft: active - 1 + n, Home: 0, End: n - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const i = next % n
    setActive(i)
    tabRefs.current[i]?.focus()
  }

  return (
    <section id="pricing" className="section pl">
      <div className="section-head">
        <h2 className="h2">Pricing</h2>
        <p>Start with one session or cover every Microsoft 365 app.</p>
      </div>

      <div className="pl__tabs" role="tablist" aria-label="Pricing categories" onKeyDown={onTabKey}>
        {PRICE_LADDER.map((g, i) => (
          <button
            key={g.id}
            ref={(el) => { tabRefs.current[i] = el }}
            type="button"
            role="tab"
            id={`pl-tab-${g.id}`}
            aria-controls={`pl-panel-${g.id}`}
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            className="pl-tab"
            onClick={() => setActive(i)}
          >
            {g.name}
            <span className="pl-tab__count">{g.items.length}</span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`pl-panel-${group.id}`}
        aria-labelledby={`pl-tab-${group.id}`}
        className={`pl-panel pl-panel--${group.id}`}
      >
        <p className="pl-panel__blurb">{group.blurb}</p>
        <ul className="pl-panel__cards">
          {group.items.map((it) => <Offer key={it.name} {...it} />)}
        </ul>
      </div>

      <p className="pl__note"><Lock aria-hidden="true" />Secure checkout through Razorpay. Enrol opens the store in a new tab.</p>
    </section>
  )
}
