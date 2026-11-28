import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, CalendarDays, Check, X } from 'lucide-react'
import { COPILOT_ICON } from '../data/content.js'
import { SalePrice } from './ui/SaleBanner.jsx'
import { startCheckout } from './CheckoutDialog.jsx'

/* Click ripple shared by every gradient button that opens a payment page. */
export function rippleClick(e) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const ripple = document.createElement('span')
  ripple.className = 'btn-ripple'
  ripple.style.left = `${e.clientX - rect.left}px`
  ripple.style.top = `${e.clientY - rect.top}px`
  btn.appendChild(ripple)
  setTimeout(() => ripple.remove(), 700)
}

/* The "View details" popup for one HERO_PRICES entry. Pass `course` to open it,
   null to close. Built on LegalDialog's base styles (.legal-dialog) for theming,
   focus and animation; .course-dialog restyles the inside. */
export default function CourseDialog({ course, onClose }) {
  return (
    <Dialog.Root open={course != null} onOpenChange={(o) => { if (!o) onClose() }}>
      {course && (() => {
        const { key, title, meta, facts, descLead, desc, pointsHeading, points, price, originalPrice, url } = course
        return (
          <Dialog.Portal>
            <Dialog.Overlay className="legal-dialog__overlay" />
            <Dialog.Content className="legal-dialog course-dialog" aria-describedby={undefined}>
              <Dialog.Close className="course-dialog__close" aria-label="Close">
                <X size={18} aria-hidden />
              </Dialog.Close>
              <div className="course-dialog__body" data-lenis-prevent>
                <div className="eyebrow eyebrow--green">AMBOT365 · COURSE DETAILS</div>
                <header className="plan__head">
                  <span className="plan__icon"><img src={COPILOT_ICON} alt="" /></span>
                  <Dialog.Title className="plan__name">{title}</Dialog.Title>
                </header>
                {meta && <p className="course-dialog__meta"><CalendarDays aria-hidden="true" />{meta}</p>}
                {facts?.map(([label, value]) => (
                  <p key={label} className="course-dialog__fact"><strong>{label}:</strong> {value}</p>
                ))}
                {desc && (
                  <p className="course-dialog__desc">
                    {descLead && <><strong>{descLead}</strong>{' '}</>}
                    {desc}
                  </p>
                )}
                {pointsHeading && <h3 className="course-dialog__heading">{pointsHeading}</h3>}
                {points && (
                  <ul className="plan__features">
                    {points.map((p) => <li key={p}><Check aria-hidden="true" />{p}</li>)}
                  </ul>
                )}
              </div>
              <footer className="course-dialog__footer">
                <div>
                  <p className="course-dialog__fee-label">Program fee</p>
                  <p className="plan__price course-dialog__fee"><SalePrice price={price} originalPrice={originalPrice} /></p>
                </div>
                <div className="course-dialog__actions">
                  <Dialog.Close className="course-dialog__ghost">Close</Dialog.Close>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary"
                    onClick={(e) => { rippleClick(e); if (startCheckout(e, key)) onClose() }}>
                    Register <ArrowRight aria-hidden="true" />
                    <span className="btn-shine" />
                  </a>
                </div>
              </footer>
            </Dialog.Content>
          </Dialog.Portal>
        )
      })()}
    </Dialog.Root>
  )
}
