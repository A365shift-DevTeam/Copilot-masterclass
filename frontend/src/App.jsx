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
import PriceLadder from './components/PriceLadder.jsx'
import Ecosystem from './components/Ecosystem.jsx'
import Register from './components/Register.jsx'
import Faq from './components/Faq.jsx'
import FinalCta from './components/FinalCta.jsx'
import Footer from './components/Footer.jsx'
import StickyRevealFooter from './components/ui/StickyRevealFooter.jsx'
import SeatScrollExperience from './components/SeatScrollExperience.jsx'
// import TicketScrollExperience from './components/TicketScrollExperience.jsx'
import Preloader from './components/Preloader.jsx'
import LogoTraveller from './components/LogoTraveller.jsx'
// import DisclaimerPopup from './components/DisclaimerPopup.jsx'
// import VideoPopup from './components/VideoPopup.jsx'
import { memo } from 'react'
import useLenis from './hooks/useLenis.js'
import useSitePreload from './hooks/useSitePreload.js'
import { version } from './data/siteData.js'
import CheckoutDialog from './components/CheckoutDialog.jsx'
import { OfferPopup, PromoStrip } from './components/ui/OfferPromo.jsx'

/* Everything except the preloader. useSitePreload updates `progress` on each
   loaded asset and flips `done` at release; without memo every one of those
   re-rendered the whole page, which showed up as a 1s main-thread task on
   mobile. Nothing in here reads that state. `version` changes only when the
   admin's prices, dates and offers (re)load, which must re-render every section. */
// eslint-disable-next-line no-unused-vars
const Page = memo(function Page({ version }) {
  return (
    <>
      <Navbar />

      {/* Opaque and stacked above the footer, which is pinned behind it —
          without both, the footer would show through the whole page. */}
      <div className="page-stack">
        <Hero />
        {/* Laptop scroll scene hidden. To bring it back, uncomment this and
            set TICKET_STAGE_ON to true in hooks/useSitePreload.js. */}
        {/* <TicketScrollExperience /> */}
        <Overview />
        <CopilotStudio />
        <SeatScrollExperience />
        {/* <Agenda /> */}
        {/* <Audience /> */}
        {/* <UseCases /> */}
        {/* <LiveDemo /> */}
        <Benefits />
        {/* Feedback is no longer its own section — it runs as a strip at the
            bottom of Speaker. */}
        <Speaker />
        {/* 1:1 coaching plans ("Only Limited Seats for a Month") hidden.
            To bring them back, uncomment this and re-add the Pricing nav link
            in data/content.js. */}
        {/* <Pricing /> */}
        {/* <Programs /> "Other Copilot programs" removed; the hero price table links to each program directly. */}
        <PriceLadder />
        {/* <Ecosystem /> */}
        {/* <Register /> */}
        {/* <Faq /> */}
        {/* <FinalCta /> */}
      </div>

      {/* Outside .page-stack and any transformed ancestor, so its document
          coordinates are the page's own. */}
      <LogoTraveller />

      {/* Both entry popups are switched off. To bring them back, render them
          in App (they need `done`) and restore their imports. */}
      {/* <DisclaimerPopup preloaderDone={done} onOpenChange={setDisclaimerOpen} /> */}
      {/* <VideoPopup ready={done && !disclaimerOpen} /> */}

      <StickyRevealFooter>
        <Footer />
      </StickyRevealFooter>
    </>
  )
})

export default function App() {
  // Order matters: useLenis creates the instance that useSitePreload stops
  // while it holds the page, and hooks in one component run in call order.
  useLenis()
  const { progress, done } = useSitePreload()

  return (
    <div style={{ overflowX: 'clip', overflowY: 'visible' }}>
      <Preloader progress={progress} done={done} />
      <Page version={version} />
      {/* Outside the memoised Page: it opens over whatever section the button was in. */}
      <CheckoutDialog />
      {/* A running offer: the strip above the navbar, and the popup once the page is ready. */}
      <PromoStrip />
      <OfferPopup ready={done} />
    </div>
  )
}
