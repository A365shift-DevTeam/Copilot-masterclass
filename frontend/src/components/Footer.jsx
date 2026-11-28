import { useEffect, useState } from 'react'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { PAYMENT_URL, SHARED, linkLive } from '../data/content.js'
import LegalDialog from './ui/LegalDialog.jsx'
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

/* Everything here is edited in the admin: the columns and links in Website > Sections > Footer, the
 * company, contact and social links in Site-wide content. A link to a #section shows only while that
 * section is on the page; an empty link is shown but not clickable (or, in the first column, goes to
 * the webinar's payment link). Absolute URLs open in a new tab.
 * Column titles are paragraphs, not headings: each column is already a
 * labelled <nav>, so extra <h2>s here would only compete with the page's own
 * section headings in the document outline. */
const isPlaceholder = (href) => !href
const isExternal = (href) => /^https?:\/\//.test(href)

function LinkColumn({ title, links }) {
  return (
    <nav className="footer__col" aria-label={title}>
      <p className="footer__col-title">{title}</p>
      <ul>
        {links.map((l, i) => (
          <li key={i}>
            <a
              href={l.href || undefined}
              aria-disabled={isPlaceholder(l.href) || undefined}
              target={isExternal(l.href) ? '_blank' : undefined}
              rel={isExternal(l.href) ? 'noopener noreferrer' : undefined}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// The popup texts, by the key a bottom-bar link names (Site-wide content > Terms / Privacy / Disclaimer text).
const legalDoc = (key) => SHARED[`legal-${key}`]

export default function Footer({ content }) {
  const year = new Date().getFullYear()
  const site = SHARED.site ?? { social: [] }

  /* Terms and Privacy open in a dialog on a plain click; the href still
   * points at the static page under /legal/, so modifier-clicks, middle
   * clicks and no-JS visitors get the full page instead. The last-shown doc
   * is kept while closing so the content does not vanish mid-fade. */
  const [legalDoc, setLegalDoc] = useState(null)
  const [legalOpen, setLegalOpen] = useState(false)
  const openLegal = (e, key) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    setLegalDoc(legalDoc(key))
    setLegalOpen(true)
  }

  useEffect(() => {
    const handleOpenLegal = (e) => {
      const key = (e && e.detail) || 'disclaimer'
      if (legalDoc(key)) {
        setLegalDoc(legalDoc(key))
        setLegalOpen(true)
      }
    }
    window.addEventListener('ambot365:open-legal', handleOpenLegal)
    return () => window.removeEventListener('ambot365:open-legal', handleOpenLegal)
  }, [])

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__grid">
          <div className="footer__brand">
            <span className="footer__logo-plate">
              <img src="/assets/logo-horizontal.webp" alt={site.logoAlt ?? ''} width="108" height="26" loading="lazy" decoding="async" />
            </span>
            <p className="footer__company">{site.company}</p>
            <p className="footer__tagline">{site.tagline}</p>
            <p className="footer__regions">
              <MapPin size={15} aria-hidden />
              {site.regions}
            </p>
          </div>

          <LinkColumn title={content.webinarTitle} links={content.webinarLinks.map((l) => ({ ...l, href: l.href || PAYMENT_URL })).filter((l) => linkLive(l.href))} />
          <LinkColumn title={content.offeringsTitle} links={content.offerings} />

          <div className="footer__col">
            <p className="footer__col-title">{content.contactTitle}</p>
            <ul className="footer__contact">
              {site.email && (
                <li>
                  <Mail size={15} aria-hidden />
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </li>
              )}
              {site.phone && (
                <li>
                  <Phone size={15} aria-hidden />
                  <a href={`tel:${site.phone.replace(/[^\d+]/g, '')}`}>{site.phone}</a>
                </li>
              )}
              {site.location && (
                <li>
                  <MapPin size={15} aria-hidden />
                  <span>{site.location}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="footer__bar">
          <p className="footer__copy">© {year} {content.copyright}</p>

          <ul className="footer__legal">
            {content.legalLinks.map((l, i) => (
              <li key={i}>
                <a
                  href={l.href || undefined}
                  aria-disabled={isPlaceholder(l.href) || undefined}
                  onClick={l.dialog && legalDoc(l.dialog) ? (e) => openLegal(e, l.dialog) : undefined}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <LegalDialog
            doc={legalDoc}
            open={legalOpen}
            onOpenChange={(next) => !next && setLegalOpen(false)}
          />

          <ul className="footer__social">
            {site.social.map((s, i) => {
              const Icon = SOCIAL_ICONS[s.icon]
              return (
                <li key={i}>
                  <a
                    href={s.href || undefined}
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
