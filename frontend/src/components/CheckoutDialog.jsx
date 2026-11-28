import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, Lock, X } from 'lucide-react'
import { CHECKOUT, COPILOT_ICON, label } from '../data/content.js'
import { SalePrice } from './ui/SaleBanner.jsx'

const API = import.meta.env.VITE_API_URL

/* Every Register / Enrol / Reserve button calls this on click. When the program
   takes payment on the site it opens the registration form and returns true (the
   link's own href is the fallback when it doesn't, or the API is unreachable). */
export function startCheckout(e, key) {
  if (!API || !CHECKOUT[key]) return false
  e?.preventDefault()
  window.dispatchEvent(new CustomEvent('site:checkout', { detail: key }))
  return true
}

// Razorpay's script loads on the first registration, never with the page.
let razorpayScript
function loadRazorpay() {
  razorpayScript ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = resolve
    s.onerror = () => { razorpayScript = null; reject(new Error(label('checkoutLoadError'))) }
    document.head.appendChild(s)
  })
  return razorpayScript
}

async function post(path, body) {
  const res = await fetch(`${API}/api/public/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.detail || label('checkoutError'))
  return data
}

/* The registration form for one program, then Razorpay Checkout. Mounted once in App. */
export default function CheckoutDialog() {
  const [key, setKey] = useState(null)
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const open = (e) => { setKey(e.detail); setAnswers({}); setError('') }
    window.addEventListener('site:checkout', open)
    return () => window.removeEventListener('site:checkout', open)
  }, [])

  const program = key && CHECKOUT[key]
  const set = (k, v) => setAnswers((a) => ({ ...a, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const [order] = await Promise.all([post(`checkout/${key}`, { answers }), program.paysByLink ? null : loadRazorpay()])
      // A card with a payment link saves the form, then hands over to that link.
      if (order.redirect) return window.location.assign(order.redirect)
      await loadRazorpay()
      // Razorpay's window must open with this dialog closed: an open Radix dialog makes the rest of the page unclickable.
      const reopen = (msg) => { setError(msg); setKey(key) }
      setKey(null)
      let failed = ''
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: label('checkoutMerchant'),
        description: order.description,
        prefill: order.prefill,
        theme: { color: '#3D7B80' },
        // Razorpay calls this only once the money is taken, so the visitor always goes on to
        // the thank-you page, never back to a payable form. If confirming fails here, the
        // payment.captured webhook records it.
        handler: async (r) => {
          await post('checkout/verify', { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }).catch(() => {})
          window.location.assign(`/thank-you?value=${order.amount / 100}`)
        },
        modal: { ondismiss: () => reopen(failed ? label('checkoutFailed', { reason: failed }) : label('checkoutCancelled')) },
      })
      rzp.on('payment.failed', (r) => { failed = r.error?.description || 'declined' })
      rzp.open()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={!!program} onOpenChange={(o) => { if (!o) setKey(null) }}>
      {program && (
        <Dialog.Portal>
          <Dialog.Overlay className="legal-dialog__overlay" />
          <Dialog.Content className="legal-dialog course-dialog checkout-dialog" aria-describedby={undefined}>
            <Dialog.Close className="course-dialog__close" aria-label={label('close')}><X size={18} aria-hidden /></Dialog.Close>
            <form onSubmit={submit} noValidate={false}>
              <div className="course-dialog__body" data-lenis-prevent>
                <header className="plan__head">
                  <span className="plan__icon"><img src={COPILOT_ICON} alt="" /></span>
                  <div>
                    <p className="checkout-dialog__kicker">{label('checkoutKicker')}</p>
                    <Dialog.Title className="plan__name">{program.title}</Dialog.Title>
                  </div>
                </header>
                <div className="checkout-form">
                  {program.form.map((f) => <Field key={f.key} f={f} value={answers[f.key]} onChange={(v) => set(f.key, v)} />)}
                </div>
                {error && <p className="checkout-dialog__error" role="alert">{error}</p>}
              </div>
              <footer className="course-dialog__footer">
                <div>
                  <p className="course-dialog__fee-label">{label('checkoutToPay')}</p>
                  <p className="plan__price course-dialog__fee"><SalePrice price={program.price} originalPrice={program.originalPrice} /></p>
                </div>
                <div className="course-dialog__actions">
                  <button type="submit" className="btn-primary" disabled={busy}>
                    {busy ? label('checkoutWait') : <>{label('checkoutContinue')} <ArrowRight aria-hidden="true" /></>}
                    <span className="btn-shine" />
                  </button>
                </div>
              </footer>
              {!program.paysByLink &&<p className="checkout-dialog__secure"><Lock aria-hidden="true" /> {label('checkoutSecure')}</p>}
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  )
}

const INPUT_TYPES = { text: 'text', email: 'email', phone: 'tel', number: 'number', date: 'date' }

function Field({ f, value, onChange }) {
  const id = `ck-${f.key}`
  const label = <>{f.label}{f.required && <span className="checkout-form__req" aria-hidden="true"> *</span>}</>
  if (f.type === 'radio' || f.type === 'checkbox') {
    const picked = f.type === 'checkbox' ? (value ?? []) : value
    const toggle = (o) => onChange(f.type === 'checkbox' ? (picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o]) : o)
    return (
      <fieldset className="checkout-form__field checkout-form__field--wide">
        <legend>{label}</legend>
        <div className="checkout-form__choices">
          {f.options.map((o) => (
            <label key={o} className="checkout-form__choice">
              <input type={f.type} name={id} value={o} checked={f.type === 'checkbox' ? picked.includes(o) : picked === o}
                onChange={() => toggle(o)} required={f.required && f.type === 'radio'} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }
  return (
    <label className={`checkout-form__field${f.type === 'textarea' ? ' checkout-form__field--wide' : ''}`} htmlFor={id}>
      <span>{label}</span>
      {f.type === 'textarea' ? (
        <textarea id={id} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={f.required} placeholder={f.placeholder ?? ''} maxLength={2000} />
      ) : f.type === 'select' ? (
        <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={f.required}>
          <option value="">{f.placeholder || label('checkoutChoose')}</option>
          {f.options.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input id={id} type={INPUT_TYPES[f.type] ?? 'text'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} required={f.required}
          placeholder={f.placeholder ?? ''} maxLength={f.type === 'text' ? 200 : undefined}
          autoComplete={{ name: 'name', email: 'email', phone: 'tel' }[f.key]} />
      )}
    </label>
  )
}
