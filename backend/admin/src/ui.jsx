import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

/* Side panel for every edit form. The native <dialog> gives focus trapping,
   Esc to close and an inert page behind it for free. */
export function Drawer({ open, title, subtitle, onClose, children, footer }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="drawer"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="drawer-title"
    >
      {open && (
        <div className="drawer__panel">
          <header className="drawer__head">
            <div>
              <h2 id="drawer-title">{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </header>
          <div className="drawer__body">{children}</div>
          {footer && <footer className="drawer__foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

export function Field({ label, hint, children, wide }) {
  return (
    <label className={`field${wide ? ' field--wide' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

export const StatusPill = ({ status }) => <span className={`pill pill--${status.toLowerCase()}`}>{status}</span>

export const ErrorNote = ({ children }) => (children ? <p className="error-note" role="alert">{children}</p> : null)

/* Toasts: toast('Saved') from anywhere; <Toaster /> in the shell shows them. */
export const toast = (message, tone = 'ok') => window.dispatchEvent(new CustomEvent('admin:toast', { detail: { message, tone } }))

export function Toaster() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const add = (e) => {
      const id = Math.random()
      setItems((list) => [...list, { id, ...e.detail }])
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3500)
    }
    window.addEventListener('admin:toast', add)
    return () => window.removeEventListener('admin:toast', add)
  }, [])
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => <div key={t.id} className={`toast toast--${t.tone}`}>{t.message}</div>)}
    </div>
  )
}
