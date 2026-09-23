import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

/**
 * Modal that shows a legal document from src/data/legal.js.
 *
 * A port of the shadcn "Terms & Conditions" dialog to this site's own CSS:
 * fixed header, scrolling body, and a footer whose confirm button unlocks only
 * once the reader has scrolled to the end. Radix supplies the portal, overlay,
 * focus trap and Escape handling; the look comes from .legal-dialog* rules in
 * styles.css, so it follows the site's dark and light themes.
 *
 * Controlled: the footer owns `open` and `doc`, so a link can open it while
 * still carrying a real href to the static page for new-tab and no-JS use.
 */
export default function LegalDialog({ doc, open, onOpenChange }) {
  const [readToBottom, setReadToBottom] = useState(false)
  const bodyRef = useRef(null)

  const checkScroll = () => {
    const el = bodyRef.current
    if (!el) return
    const room = el.scrollHeight - el.clientHeight
    // Short content has nothing to scroll; treat it as already read.
    const ratio = room <= 0 ? 1 : el.scrollTop / room
    if (ratio >= 0.99) setReadToBottom(true)
  }

  // Reset the gate every time the dialog opens (or the document changes), then
  // measure once the content has laid out.
  useEffect(() => {
    if (!open) return undefined
    setReadToBottom(false)
    const id = requestAnimationFrame(checkScroll)
    return () => cancelAnimationFrame(id)
  }, [open, doc])

  if (!doc) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="legal-dialog__overlay" />
        <Dialog.Content className="legal-dialog" aria-describedby={undefined}>
          <header className="legal-dialog__header">
            <Dialog.Title className="legal-dialog__title">{doc.title}</Dialog.Title>
            <Dialog.Close className="legal-dialog__close" aria-label="Close">
              <X size={16} aria-hidden />
            </Dialog.Close>
          </header>

          {/* data-lenis-prevent keeps the page's smooth-scroll from swallowing
              wheel events meant for this box. */}
          <div
            ref={bodyRef}
            onScroll={checkScroll}
            className="legal-dialog__body"
            data-lenis-prevent
          >
            <p className="legal-dialog__intro">{doc.intro}</p>
            {doc.sections.map((s) => (
              <section key={s.heading} className="legal-dialog__section">
                <h3>{s.heading}</h3>
                <p>
                  {s.body}
                  {s.email && (
                    <>
                      {' '}
                      <a href={`mailto:${s.email}`}>{s.email}</a>.
                    </>
                  )}
                </p>
                {s.list && (
                  <ul>
                    {s.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <footer className="legal-dialog__footer">
            {!readToBottom && <span className="legal-dialog__hint">{doc.hint}</span>}
            <Dialog.Close className="legal-dialog__btn legal-dialog__btn--ghost">
              Cancel
            </Dialog.Close>
            <Dialog.Close
              className="legal-dialog__btn legal-dialog__btn--primary"
              disabled={!readToBottom}
            >
              {doc.agreeLabel}
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
