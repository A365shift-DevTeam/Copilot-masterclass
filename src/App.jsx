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
import Ecosystem from './components/Ecosystem.jsx'
import Register from './components/Register.jsx'
import Faq from './components/Faq.jsx'
import FinalCta from './components/FinalCta.jsx'
import Footer from './components/Footer.jsx'
import StickyRevealFooter from './components/ui/StickyRevealFooter.jsx'
import SeatScrollExperience from './components/SeatScrollExperience.jsx'
import TicketScrollExperience from './components/TicketScrollExperience.jsx'
import Preloader from './components/Preloader.jsx'
import LogoTraveller from './components/LogoTraveller.jsx'
import useLenis from './hooks/useLenis.js'
import useSitePreload from './hooks/useSitePreload.js'

export default function App() {
  // Order matters: useLenis creates the instance that useSitePreload stops
  // while it holds the page, and hooks in one component run in call order.
  useLenis()
  const { progress, done } = useSitePreload()

  return (
    <div style={{ overflowX: 'clip', overflowY: 'visible' }}>
      <Preloader progress={progress} done={done} />
      <Navbar />

      {/* Opaque and stacked above the footer, which is pinned behind it —
          without both, the footer would show through the whole page. */}
      <div className="page-stack">
        <Hero />
        <TicketScrollExperience />
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
        {/* <Ecosystem /> */}
        {/* <Register /> */}
        {/* <Faq /> */}
        {/* <FinalCta /> */}
      </div>

      {/* Outside .page-stack and any transformed ancestor, so its document
          coordinates are the page's own. */}
      <LogoTraveller />

      <StickyRevealFooter>
        <Footer />
      </StickyRevealFooter>
    </div>
  )
}
