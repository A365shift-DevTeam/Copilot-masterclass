import { useRef, useState } from 'react'
import { Bot, CalendarCheck, CirclePlay, Gem, Image, Layers, Lock, MonitorPlay } from 'lucide-react'
import { PRICE_LADDER, label } from '../data/content.js'
import { OfferCountdown, SalePrice } from './ui/SaleBanner.jsx'
import { startCheckout } from './CheckoutDialog.jsx'

const ICONS = {
  'monitor-play': MonitorPlay, 'circle-play': CirclePlay, image: Image,
  'calendar-check': CalendarCheck, bot: Bot, layers: Layers, gem: Gem,
}

function Offer({ ckey, name, includes, price, originalPrice, offer, url, duration, icon, logos, cta, featured }) {
  const Icon = ICONS[icon]
  return (
    <li className={`pl-card${featured ? ' is-featured' : ''}`}>
      <div className="pl-card__top">
        <span className="pl-card__icon" aria-hidden="true">
          {logos
            ? logos.map((src) => <img key={src} src={src} alt="" width="24" height="24" loading="lazy" />)
            : Icon && <Icon />}
        </span>
        {(offer || featured) && <span className="pl-card__tag">{offer ? offer.badge : label('popularLabel')}</span>}
      </div>
      <h4 className="pl-card__name">{name}</h4>
      <p className="pl-card__includes">{includes}</p>
      <div className="pl-card__price">
        <span className="pl-card__amount"><SalePrice price={price} originalPrice={originalPrice} /></span>
        <span className="pl-card__duration">{duration}</span>
        {offer && <OfferCountdown endsAt={offer.endsAt} className="pl-card__countdown" />}
      </div>
      <a
        href={url ?? undefined} // none: the card pays on the site, and startCheckout opens its form
        target="_blank"
        rel="noopener noreferrer"
        className="pl-card__cta"
        onClick={(e) => startCheckout(e, ckey)}
        aria-label={`${cta}: ${name} (opens Razorpay store in a new tab)`}
      >
        {cta}
      </a>
    </li>
  )
}

/* The cards are the programs in Pricing & dates; the heading, intro and note are this section's content. */
export default function PriceLadder({ content }) {
  const [selected, setActive] = useState(0)
  const tabRefs = useRef([])
  // Cards hidden in the admin drop out; a tab left with none drops out too.
  const groups = PRICE_LADDER.map((g) => ({ ...g, items: g.items.filter((i) => !i.hidden) })).filter((g) => g.items.length)
  const active = Math.min(selected, groups.length - 1)
  const group = groups[active]

  // Arrow keys / Home / End move between tabs (WAI-ARIA tabs pattern).
  const onTabKey = (e) => {
    const n = groups.length
    const next = { ArrowRight: active + 1, ArrowLeft: active - 1 + n, Home: 0, End: n - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const i = next % n
    setActive(i)
    tabRefs.current[i]?.focus()
  }

  if (!group) return null // every card hidden in the admin

  return (
    <section id="pricing" className="section pl">
      <div className="section-head">
        <h2 className="h2">{content.heading}</h2>
        <p>{content.intro}</p>
      </div>

      <div className="pl__tabs" role="tablist" aria-label={content.tabsLabel} onKeyDown={onTabKey}>
        {groups.map((g, i) => (
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
          {group.items.map(({ key: k, ...it }) => <Offer key={k ?? it.name} ckey={k} {...it} />)}
        </ul>
      </div>

      <p className="pl__note"><Lock aria-hidden="true" />{content.note}</p>
    </section>
  )
}
