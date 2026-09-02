import { useState } from 'react'
import useReveal from '../hooks/useReveal.js'
import { FAQS } from '../data/content.js'

export default function Faq() {
  const headRef = useReveal()
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" className="faq-section">
      <div ref={headRef} className="section-head" style={{ maxWidth: 'none', marginBottom: 40 }}>
        <h2 className="h2">Frequently Asked Questions</h2>
      </div>
      <div className="faq-list">
        {FAQS.map((f, i) => (
          <div key={f.q} className={`faq-item${open === i ? ' open' : ''}`}>
            <button
              className="faq-item__btn"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              {f.q}
              <span className="faq-item__plus">+</span>
            </button>
            <div className="faq-item__body">
              <p>{f.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
