import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import Swal from 'sweetalert2'

/* Popup for every edit form. The native <dialog> gives focus trapping,
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
      // Esc asks the page, like the close button, so a form with unsaved edits can say so first.
      onCancel={(e) => { e.preventDefault(); onClose() }}
      // No close on a backdrop click: one stray click would throw away a half-filled form. Close button, Cancel or Esc.
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
      {items.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          {t.tone === 'bad' ? <AlertCircle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

/* Confirmation before anything destructive. Resolves true when confirmed.
   SweetAlert2, dressed in the admin's own buttons so it follows the theme. */
export async function confirmAction({ title, text, confirmText = 'Yes, continue', danger = true }) {
  const { isConfirmed } = await Swal.fire({
    title, text,
    icon: danger ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    focusCancel: danger,
    buttonsStyling: false,
    customClass: {
      popup: 'swal-admin',
      confirmButton: danger ? 'btn btn--danger-solid' : 'btn btn--primary',
      cancelButton: 'btn',
      actions: 'swal-admin__actions',
    },
  })
  return isConfirmed
}

/* Pagination attached under every list (.crm-pagination in the design system):
   rows per page, "Showing 26–50 of 120", page x of y, first / previous / pages / next / last. */
export function Pagination({ page, size, total, onPage, onSize, noun = 'rows' }) {
  const pages = Math.max(1, Math.ceil(total / size))
  const from = total ? (page - 1) * size + 1 : 0
  const to = Math.min(total, page * size)
  // First, last, and the pages either side of this one; gaps become an ellipsis.
  const shown = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const go = (n) => onPage(Math.min(pages, Math.max(1, n)))
  return (
    <nav className="crm-pagination crm-pagination--attached" aria-label="Pagination">
      <div className="crm-pagination-left">
        <label className="crm-pagination-size">
          <span className="crm-pagination-size-label">Rows per page</span>
          <select className="crm-pagination-select" value={size} onChange={(e) => onSize(+e.target.value)} aria-label="Rows per page">
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <span className="crm-pagination-info" aria-live="polite">Showing <strong>{from}–{to}</strong> of <strong>{total.toLocaleString('en-IN')}</strong> {noun}</span>
        <span className="crm-pagination-pageof">Page <strong>{page}</strong> of <strong>{pages}</strong></span>
      </div>
      <div className="crm-pagination-right">
        <button type="button" className="crm-pagination-btn" onClick={() => go(1)} disabled={page <= 1} aria-label="First page" title="First page"><ChevronsLeft size={15} /></button>
        <button type="button" className="crm-pagination-btn" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page" title="Previous page"><ChevronLeft size={15} /></button>
        <div className="crm-pagination-pages">
          {shown.map((n, i) => (
            <span key={n} style={{ display: 'contents' }}>
              {i > 0 && n - shown[i - 1] > 1 && <span className="crm-pagination-gap" aria-hidden="true">…</span>}
              <button type="button" className={`crm-pagination-btn${n === page ? ' active' : ''}`} onClick={() => go(n)}
                aria-label={`Page ${n}`} aria-current={n === page ? 'page' : undefined}>{n}</button>
            </span>
          ))}
        </div>
        <span className="crm-pagination-compact" aria-hidden="true">{page} / {pages}</span>
        <button type="button" className="crm-pagination-btn" onClick={() => go(page + 1)} disabled={page >= pages} aria-label="Next page" title="Next page"><ChevronRight size={15} /></button>
        <button type="button" className="crm-pagination-btn" onClick={() => go(pages)} disabled={page >= pages} aria-label="Last page" title="Last page"><ChevronsRight size={15} /></button>
      </div>
    </nav>
  )
}
