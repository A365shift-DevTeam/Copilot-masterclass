import useReveal from '../hooks/useReveal.js'
import FaqPlusMinus from './ui/FaqPlusMinus.jsx'

/* Questions and answers, edited in the admin (Website > Sections > FAQ). Only the page's first FAQ
   block carries the #faq anchor the menu links to. */
export default function Faq({ content, anchor }) {
  const headRef = useReveal()

  return (
    <section id={anchor?.slice(1)} className="faq-section">
      <div ref={headRef} className="section-head" style={{ maxWidth: 'none', marginBottom: 40 }}>
        <h2 className="h2">{content.heading}</h2>
      </div>

      <FaqPlusMinus items={content.items} defaultOpen={0} />
    </section>
  )
}
