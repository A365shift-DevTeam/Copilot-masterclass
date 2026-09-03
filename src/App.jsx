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
import Testimonials from './components/Testimonials.jsx'
import Register from './components/Register.jsx'
import Faq from './components/Faq.jsx'
import FinalCta from './components/FinalCta.jsx'
import Footer from './components/Footer.jsx'
import PageCurtains from './components/ui/PageCurtains.jsx'
import StickyRevealFooter from './components/ui/StickyRevealFooter.jsx'

export default function App() {
  return (
    <div style={{ overflow: 'hidden' }}>
      <PageCurtains />
      <Navbar />

      {/* Opaque and stacked above the footer, which is pinned behind it —
          without both, the footer would show through the whole page. */}
      <div className="page-stack">
        <Hero />
        <Overview />
        <CopilotStudio />
        <Agenda />
        <Audience />
        {/* <UseCases /> */}
        {/* <LiveDemo /> */}
        <Benefits />
        <Speaker />
        {/* <Ecosystem /> */}
        <Testimonials />
        <Register />
        <Faq />
        {/* <FinalCta /> */}
      </div>

      <StickyRevealFooter>
        <Footer />
      </StickyRevealFooter>
    </div>
  )
}
