import useReveal from '../hooks/useReveal.js'
import { FAQS } from '../data/content.js'
import FaqPlusMinus from './ui/FaqPlusMinus.jsx'

export default function Faq() {
  const headRef = useReveal()

  return (
    <section id="faq" className="faq-section">
      <div ref={headRef} className="section-head" style={{ maxWidth: 'none', marginBottom: 40 }}>
        <h2 className="h2">Frequently Asked Questions</h2>
      </div>

      <FaqPlusMinus items={FAQS.map((f) => ({ q: f.q, a: f.a }))} defaultOpen={0} />
    </section>
  )
}
