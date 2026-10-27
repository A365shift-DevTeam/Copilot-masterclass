import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { DISCLAIMER } from '../data/content.js'
import './disclaimer-popup.css'

const STORAGE_KEY = 'ambot365_disclaimer_ack'

/**
 * Centered Disclaimer Popup Modal
 *
 * Elegantly presents the trademark and non-affiliation disclaimer centered on screen.
 * Avoids colliding with floating chat/call widgets, respects user acknowledgment via
 * localStorage, handles Escape key and outside backdrop clicks, and can be reopened
 * at any time from the footer "Disclaimer" link.
 */
export default function DisclaimerPopup({ preloaderDone }) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    // Listen for manual trigger to reopen disclaimer popup
    const handleManualOpen = () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      setClosing(false)
      setOpen(true)
    }
    window.addEventListener('ambot365:open-disclaimer-popup', handleManualOpen)

    return () => {
      window.removeEventListener('ambot365:open-disclaimer-popup', handleManualOpen)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!preloaderDone) return undefined

    let isAck = false
    try {
      isAck = localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      // Storage unavailable or blocked
    }

    if (isAck) return undefined

    // Reveal gently shortly after preloader completes its exit
    const timer = setTimeout(() => {
      setOpen(true)
    }, 900)

    return () => clearTimeout(timer)
  }, [preloaderDone])

  const dismiss = (persist = false) => {
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true')
      } catch {
        // Storage unavailable
      }
    }
    setClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 220)
  }

  // Handle Escape key to dismiss
  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dismiss(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const handleOpenFullDocument = () => {
    dismiss(false)
    window.dispatchEvent(
      new CustomEvent('ambot365:open-legal', { detail: 'disclaimer' })
    )
  }

  if (!open) return null

  return (
    <div
      className={`disclaimer-overlay${closing ? ' disclaimer-overlay--closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss(false)
      }}
      data-lenis-prevent
      aria-hidden={!open}
    >
      <div
        className={`disclaimer-popup${closing ? ' disclaimer-popup--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        aria-describedby="disclaimer-desc"
      >
        <div className="disclaimer-popup__bar" aria-hidden="true" />
        <div className="disclaimer-popup__inner">
          <header className="disclaimer-popup__header">
            <div className="disclaimer-popup__identity">
              <span className="disclaimer-popup__icon-wrap" aria-hidden="true">
                <ShieldCheck size={20} strokeWidth={2.2} />
              </span>
              <div className="disclaimer-popup__titles">
                <span className="disclaimer-popup__badge">{DISCLAIMER.badge}</span>
                <h2 id="disclaimer-title" className="disclaimer-popup__title">
                  {DISCLAIMER.title}
                </h2>
              </div>
            </div>

            <button
              type="button"
              className="disclaimer-popup__close"
              onClick={() => dismiss(false)}
              aria-label="Close disclaimer popup"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </header>

          <p id="disclaimer-desc" className="disclaimer-popup__body">
            <strong>Microsoft, Microsoft 365, Copilot, Excel, Word, PowerPoint, Outlook</strong>
            , and their respective logos/icons are trademarks of Microsoft Corporation.
            This webinar is independently delivered by <strong>Ambot365</strong> and is{' '}
            <strong>not affiliated with, endorsed by, sponsored by, or authorized by Microsoft Corporation</strong>.
          </p>

          <footer className="disclaimer-popup__actions">
            <button
              type="button"
              className="disclaimer-popup__details-link"
              onClick={handleOpenFullDocument}
            >
              {DISCLAIMER.moreLabel}
            </button>

            <button
              type="button"
              className="disclaimer-popup__btn"
              onClick={() => dismiss(true)}
            >
              {DISCLAIMER.acceptLabel}
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
