import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { FOOTER } from '../data/content.js'
// lucide v1 removed its brand icons, so these four are inlined locally.
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from './ui/SocialIcons.jsx'

const SOCIAL_ICONS = {
  linkedin: LinkedinIcon,
  whatsapp: MessageCircle,
  youtube: YoutubeIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
}

/** Anchors on this page work; the rest are still placeholders (see content.js). */
const isPlaceholder = (href) => href === '#'

function LinkColumn({ title, links }) {
  return (
    <nav className="footer__col" aria-label={title}>
      <h2 className="footer__col-title">{title}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} aria-disabled={isPlaceholder(l.href) || undefined}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__grid">
          <div className="footer__brand">
            <span className="footer__logo-plate">
              <img src="/assets/logo-horizontal.png" alt="AmBot365 — RPA & Digital IT Solutions" />
            </span>
            <p className="footer__company">{FOOTER.company}</p>
            <p className="footer__tagline">{FOOTER.tagline}</p>
            <p className="footer__regions">
              <MapPin size={15} aria-hidden />
              {FOOTER.regions}
            </p>
          </div>

          <LinkColumn title="Webinar" links={FOOTER.webinar} />
          <LinkColumn title="Core offerings" links={FOOTER.offerings} />

          <div className="footer__col">
            <h2 className="footer__col-title">Contact us</h2>
            <ul className="footer__contact">
              <li>
                <Mail size={15} aria-hidden />
                <a href={`mailto:${FOOTER.email}`}>{FOOTER.email}</a>
              </li>
              <li>
                <Phone size={15} aria-hidden />
                <a href={`tel:${FOOTER.phone.replace(/\s/g, '')}`}>{FOOTER.phone}</a>
              </li>
              <li>
                <MapPin size={15} aria-hidden />
                <span>{FOOTER.location}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bar">
          <p className="footer__copy">© {year} Ambot365. All rights reserved.</p>

          <ul className="footer__legal">
            {FOOTER.legal.map((l) => (
              <li key={l.label}>
                <a href={l.href} aria-disabled={isPlaceholder(l.href) || undefined}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <ul className="footer__social">
            {FOOTER.social.map((s) => {
              const Icon = SOCIAL_ICONS[s.icon]
              return (
                <li key={s.label}>
                  <a
                    href={s.href}
                    aria-label={s.label}
                    aria-disabled={isPlaceholder(s.href) || undefined}
                  >
                    {Icon ? <Icon size={17} aria-hidden /> : s.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </footer>
  )
}
