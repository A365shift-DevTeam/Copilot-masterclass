import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Volume2, X } from 'lucide-react'
import { SHARED } from '../data/content.js'
import { WhatsAppIcon } from '../pages/ThankYou.jsx'
import ReserveSeatButton from './ReserveSeatButton.jsx'
import BorderBeam from './ui/BorderBeam.jsx'
import './disclaimer-popup.css'
import './video-popup.css'

/**
 * Promo video popup — opens 2s after the page is ready (preloader gone and
 * no disclaimer on screen), once per page load. Portrait video on the left,
 * class summary on the right. Reuses the disclaimer modal shell.
 */
// Served from Cloudinary's CDN; w_540 is ~1.5x the popup's display width and halves the file size.
const VIDEO_BASE = 'https://res.cloudinary.com/dghhdz3et/video/upload'

export default function VideoPopup({ ready }) {
  // Not rendered today (see App.jsx); reads the shared agenda from the admin if it comes back.
  const AGENDA = SHARED['agenda-items']?.items ?? []
  const DAYS = [...new Set(AGENDA.map((item) => item.day))]
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)
  const videoRef = useRef(null)

  // Try to play with sound; browsers refuse until the visitor has interacted
  // with the page, so fall back to muted playback plus a "Tap for sound" button.
  useEffect(() => {
    const video = videoRef.current
    if (!open || !video) return
    video.play().catch(() => {
      video.muted = true
      setNeedsTap(true)
      video.play().catch(() => {})
    })
  }, [open])

  useEffect(() => {
    if (!ready || shown) return undefined
    const timer = setTimeout(() => {
      setOpen(true)
      setShown(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [ready, shown])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div
      className="disclaimer-overlay"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      data-lenis-prevent
    >
      <div
        className="disclaimer-popup video-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-popup-title"
      >
        <BorderBeam className="video-popup__beam" duration={8} borderWidth={3} />

        <button
          type="button"
          className="disclaimer-popup__close"
          onClick={() => setOpen(false)}
          aria-label="Close video"
        >
          <X size={17} aria-hidden="true" />
        </button>

        <div className="video-popup__media">
          <video
            ref={videoRef}
            className="video-popup__video"
            src={`${VIDEO_BASE}/v1793862752/Learn_AI_whats_App_cb9zpe.mp4`}
            poster={`${VIDEO_BASE}/so_0,w_540,q_auto,f_jpg/videos/webinar-ad02.jpg`}
            playsInline
            controls
            onVolumeChange={(e) => !e.currentTarget.muted && setNeedsTap(false)}
          />
          {needsTap && (
            <button
              type="button"
              className="video-popup__unmute"
              onClick={() => {
                videoRef.current.muted = false
                setNeedsTap(false)
              }}
            >
              <Volume2 size={18} aria-hidden="true" />
              Tap for sound
            </button>
          )}
        </div>

        <div className="video-popup__info">
          <span className="disclaimer-popup__badge">Live Interactive Webinar</span>
          <h2 id="video-popup-title" className="video-popup__title">
            Microsoft 365 Copilot Masterclass
          </h2>
          <p className="video-popup__subtitle">1-Day Live Online Program</p>

          <ul className="video-popup__list">
            {DAYS.map((day) => {
              const items = AGENDA.filter((item) => item.day === day)
              return (
                <li key={day}>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span>
                    <span className="video-popup__day">{day}</span>
                    <br />
                    <strong>{items.map((item) => item.title).join(' & ')}</strong>
                    <br />
                    <span className="video-popup__points">
                      {items.flatMap((item) => item.points).join(' • ')}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>

          <ReserveSeatButton />

          <a
            className="video-popup__whatsapp"
            href={`https://wa.me/${(SHARED.site?.phone ?? '').replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon />
            {SHARED.site?.phone}
          </a>
        </div>
      </div>
    </div>
  )
}
