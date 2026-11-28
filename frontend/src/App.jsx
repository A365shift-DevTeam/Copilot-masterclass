import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Overview from './components/Overview.jsx'
import CopilotStudio from './components/CopilotStudio.jsx'
import Agenda from './components/Agenda.jsx'
import Audience from './components/Audience.jsx'
import UseCases from './components/UseCases.jsx'
import LiveDemo from './components/LiveDemo.jsx'
import Benefits from './components/Benefits.jsx'
import Speaker from './components/Speaker.jsx'
import Pricing from './components/Pricing.jsx'
import Programs from './components/Programs.jsx'
import PriceLadder from './components/PriceLadder.jsx'
import Ecosystem from './components/Ecosystem.jsx'
import Faq from './components/Faq.jsx'
import FinalCta from './components/FinalCta.jsx'
import Footer from './components/Footer.jsx'
import StickyRevealFooter from './components/ui/StickyRevealFooter.jsx'
import SeatScrollExperience from './components/SeatScrollExperience.jsx'
import TicketScrollExperience from './components/TicketScrollExperience.jsx'
import Preloader from './components/Preloader.jsx'
import LogoTraveller from './components/LogoTraveller.jsx'
import { memo } from 'react'
import useLenis from './hooks/useLenis.js'
import useSitePreload from './hooks/useSitePreload.js'
import { version, failed } from './data/siteData.js'
import { SECTIONS } from './data/content.js'
import SiteUnavailable from './components/SiteUnavailable.jsx'
import PreviewBar from './components/PreviewBar.jsx'
import CheckoutDialog from './components/CheckoutDialog.jsx'
import { OfferPopup, PromoStrip } from './components/ui/OfferPromo.jsx'

/* The component for each section type the admin's Website page lists (Application/Website/PageDoc.cs).
   The navbar and footer are drawn in their own places below; a type not listed here is skipped. */
const SECTION = {
  hero: Hero,
  'ticket-scroll': TicketScrollExperience,
  overview: Overview,
  'copilot-studio': CopilotStudio,
  'seat-scroll': SeatScrollExperience,
  agenda: Agenda,
  audience: Audience,
  'use-cases': UseCases,
  'live-demo': LiveDemo,
  benefits: Benefits,
  speaker: Speaker,
  coaching: Pricing,
  programs: Programs,
  'price-ladder': PriceLadder,
  ecosystem: Ecosystem,
  faq: Faq,
  'final-cta': FinalCta,
}

/* Everything except the preloader. useSitePreload updates `progress` on each
   loaded asset and flips `done` at release; without memo every one of those
   re-rendered the whole page, which showed up as a 1s main-thread task on
   mobile. Nothing in here reads that state. `version` changes only when the
   admin's page, prices, dates and offers (re)load, which must re-render every section.
   Which sections show, and in what order, is the admin's (SECTIONS). */
// eslint-disable-next-line no-unused-vars
const Page = memo(function Page({ version }) {
  const navbar = SECTIONS.find((s) => s.type === 'navbar')
  const footer = SECTIONS.find((s) => s.type === 'footer')
  return (
    <>
      {navbar && <Navbar content={navbar.content} />}

      {/* Opaque and stacked above the footer, which is pinned behind it —
          without both, the footer would show through the whole page. */}
      <div className="page-stack">
        {SECTIONS.map((s) => {
          const Section = SECTION[s.type]
          return Section ? <Section key={s.id} content={s.content} anchor={s.anchor} /> : null
        })}
      </div>

      {/* Outside .page-stack and any transformed ancestor, so its document
          coordinates are the page's own. */}
      <LogoTraveller />

      {footer && (
        <StickyRevealFooter>
          <Footer content={footer.content} />
        </StickyRevealFooter>
      )}
    </>
  )
})

export default function App() {
  // Order matters: useLenis creates the instance that useSitePreload stops
  // while it holds the page, and hooks in one component run in call order.
  useLenis()
  const { progress, done } = useSitePreload()

  // Prices, links and cards only come from the admin API: no page without them.
  if (failed) return <SiteUnavailable />
  return (
    <div style={{ overflowX: 'clip', overflowY: 'visible' }}>
      <Preloader progress={progress} done={done} />
      <PreviewBar />
      {version > 0 && (
        <>
          <Page version={version} />
          {/* Outside the memoised Page: it opens over whatever section the button was in. */}
          <CheckoutDialog />
          {/* A running offer: the strip above the navbar, and the popup once the page is ready. */}
          <PromoStrip />
          <OfferPopup ready={done} />
        </>
      )}
    </div>
  )
}
