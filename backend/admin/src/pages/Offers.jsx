import { useEffect, useState } from 'react'
import { AlertTriangle, Copy, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { api, fmtDateTime, fromIstInput, money, toIstInput } from '../api.js'
import { confirmAction, Drawer, ErrorNote, Field, toast } from '../ui.jsx'

// Same rule as OfferPricing.SalePrice in the API: whole rupees, never below zero.
export const salePrice = (price, type, value) =>
  Math.max(0, type === 'percent' ? Math.round(price * (1 - value / 100)) : price - value)


/* ── Presets: fill name, badge and dates; everything stays editable ────────── */

const pad = (n) => String(n).padStart(2, '0')
const ist = (y, m, d, h = 0, min = 0) => `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`
const nowIst = () => toIstInput(new Date().toISOString())
const plusHours = (input, h) => toIstInput(new Date(+new Date(fromIstInput(input)) + h * 36e5).toISOString())

// The next run of a yearly window that hasn't ended yet.
function yearly(make) {
  const y = +nowIst().slice(0, 4)
  const [s, e] = make(y)
  return new Date(fromIstInput(e)) > new Date() ? [s, e] : make(y + 1)
}
function blackFriday(y) {
  const firstNov = new Date(Date.UTC(y, 10, 1)).getUTCDay()
  const thanksgiving = 1 + ((4 - firstNov + 7) % 7) + 21
  return [ist(y, 11, thanksgiving + 1), ist(y, 11, thanksgiving + 4, 23, 59)] // Friday to Cyber Monday
}

const PRESETS = [
  { name: 'Black Friday', badge: 'Black Friday sale', value: 30, dates: () => yearly(blackFriday) },
  { name: 'Christmas', badge: 'Christmas offer', value: 20, dates: () => yearly((y) => [ist(y, 12, 24), ist(y, 12, 26, 23, 59)]) },
  { name: 'New Year', badge: 'New Year offer', value: 25, dates: () => yearly((y) => [ist(y, 12, 31), ist(y + 1, 1, 2, 23, 59)]) },
  { name: 'Pongal', badge: 'Pongal offer', value: 20, dates: () => yearly((y) => [ist(y, 1, 13), ist(y, 1, 17, 23, 59)]) },
  { name: 'Flash sale', badge: 'Flash sale: 24 hours only', value: 15, dates: () => { const s = nowIst(); return [s, plusHours(s, 24)] } },
]

const STATUS = {
  live: { label: 'Live now', className: 'pill--paid' },
  scheduled: { label: 'Scheduled', className: 'pill--neutral' },
  paused: { label: 'Paused', className: 'pill--pending' },
  ended: { label: 'Ended', className: 'pill--neutral' },
}

export default function Offers({ arg }) {
  const [offers, setOffers] = useState(null)
  const [courses, setCourses] = useState([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(arg === 'new' ? {} : null)

  // paysOnSite: the website charges this program through checkout (its form is on and Razorpay keys are saved),
  // so an offer's sale price is what gets charged and no separate sale link is needed.
  const load = () => Promise.all([api('/offers'), api('/courses'), api('/settings')]).then(([o, c, st]) => {
    const keys = !!st.razorpay.keyId && st.razorpay.keySecretSet
    setOffers(o)
    setCourses(c.map((x) => ({ ...x, paysOnSite: keys && !x.paymentUrl })))
  }, (e) => setError(e.message))
  useEffect(() => { load() }, [])

  const close = () => { setEditing(null); if (arg === 'new') history.replaceState(null, '', '#offers') }
  const nameOf = Object.fromEntries(courses.map((c) => [c.id, c]))

  async function setPaused(o, isPaused) {
    if (isPaused && o.status === 'live' && !await confirmAction({ title: `Pause "${o.name}"?`, text: 'The website shows normal prices until you resume it.', confirmText: 'Pause offer' })) return
    try {
      await api(`/offers/${o.id}`, { method: 'PUT', body: { ...o, isPaused } })
      toast(isPaused ? `${o.name} paused. Normal prices are back on the website.` : `${o.name} resumed`)
      load()
    } catch (e) { toast(e.message, 'bad') }
  }
  async function remove(o) {
    if (!await confirmAction({ title: `Delete "${o.name}"?`, text: o.status === 'live' ? 'It is live: the website goes back to normal prices straight away.' : 'This can\x27t be undone.', confirmText: 'Delete offer' })) return
    try { await api(`/offers/${o.id}`, { method: 'DELETE' }); toast(`${o.name} deleted`); load() }
    catch (e) { toast(e.message, 'bad') }
  }

  const groups = offers && ['live', 'scheduled', 'paused', 'ended'].map((s) => [s, offers.filter((o) => o.status === s)]).filter(([, list]) => list.length)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Special offers</h1>
          <p>Discount programs for a set time. The website switches to the sale price when an offer starts and back when it ends.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing({})} disabled={!courses.length}>
          <Plus size={16} aria-hidden="true" /> New offer
        </button>
      </header>
      <ErrorNote>{error}</ErrorNote>

      {!offers ? <div className="loading" aria-busy="true">Loading offers…</div> : offers.length === 0 ? (
        <section className="panel empty">
          <p>No offers yet. Start from a preset or make your own.</p>
          <div className="chips">
            {PRESETS.map((p) => <button key={p.name} type="button" className="chip" onClick={() => setEditing({ preset: p })}>{p.name}</button>)}
          </div>
        </section>
      ) : groups.map(([status, list]) => (
        <section key={status} className="offer-group">
          <h2 className="offer-group__title">{STATUS[status].label} <span>{list.length}</span></h2>
          {list.map((o) => (
            <OfferCard key={o.id} o={o} nameOf={nameOf} onEdit={() => setEditing(o)} onCopy={() => setEditing({ copy: o })}
              onPause={() => setPaused(o, !o.isPaused)} onDelete={() => remove(o)} />
          ))}
        </section>
      ))}

      {/* Only programs that are on the website (Pricing section cards) can go in an offer. */}
      <OfferForm offer={editing} courses={courses.filter((c) => c.category)} onClose={close} onSaved={() => { close(); load() }} />
    </>
  )
}

/* One offer: who it is, how big, where it is in its run, and what it does to each price. */
function OfferCard({ o, nameOf, onEdit, onCopy, onPause, onDelete }) {
  const [showAll, setShowAll] = useState(false)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (o.status !== 'live') return
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [o.status])
  const start = +new Date(o.startsAt), end = +new Date(o.endsAt)
  const done = Math.min(1, Math.max(0, (now - start) / (end - start)))
  const items = o.items.filter((i) => nameOf[i.courseId])
  const shown = showAll ? items : items.slice(0, 6)

  return (
    <article className={`offer-card offer-card--${o.status}`}>
      <header className="offer-card__head">
        <div className="offer-card__title">
          <span className={`pill ${STATUS[o.status].className}`}>{STATUS[o.status].label}</span>
          <h3>{o.name}</h3>
          <span className="offer-card__badge" title="How the badge looks on the website">{o.badge}</span>
        </div>
        <div className="offer-card__off">
          <strong>{o.discountType === 'percent' ? `${+o.discountValue}%` : money(o.discountValue)}</strong>
          <span>off {items.length} {items.length === 1 ? 'program' : 'programs'}</span>
        </div>
        <div className="programs__actions">
          {o.status === 'ended' ? (
            <button type="button" className="btn btn--sm" onClick={onCopy}><Copy size={14} aria-hidden="true" /> Run again</button>
          ) : (
            <>
              <button type="button" className="btn btn--sm" onClick={onEdit}><Pencil size={14} aria-hidden="true" /> Edit</button>
              <button type="button" className="btn btn--sm" onClick={onPause}>
                {o.isPaused ? <><Play size={14} aria-hidden="true" /> Resume</> : <><Pause size={14} aria-hidden="true" /> Pause</>}
              </button>
            </>
          )}
          <button type="button" className="icon-btn" onClick={onDelete} aria-label={`Delete ${o.name}`} title="Delete"><Trash2 size={16} /></button>
        </div>
      </header>

      <div className="offer-card__run">
        <div className="offer-card__dates">
          <span><small>Starts</small>{fmtDateTime(o.startsAt)}</span>
          <span className="offer-card__left">
            {o.status === 'live' ? <Countdown to={o.endsAt} /> : o.status === 'scheduled' ? <>starts in <Until to={o.startsAt} /></> : o.status === 'paused' ? 'paused, normal prices showing' : 'finished'}
          </span>
          <span className="offer-card__end"><small>Ends (IST)</small>{fmtDateTime(o.endsAt)}</span>
        </div>
        <div className="offer-card__track" role="progressbar" aria-label="How far through the offer" aria-valuenow={Math.round(done * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${done * 100}%` }} />
        </div>
      </div>

      <ul className="offer-card__prices">
        {shown.map((i) => {
          const c = nameOf[i.courseId]
          return (
            <li key={i.courseId}>
              <span>{c.cardTitle || c.name}</span>
              <span className="offer-card__price"><s>{money(c.price)}</s> <strong>{money(salePrice(c.price, o.discountType, o.discountValue))}</strong></span>
            </li>
          )
        })}
      </ul>
      {items.length > 6 && (
        <button type="button" className="offer-card__more" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show fewer' : `Show all ${items.length} programs`}
        </button>
      )}
    </article>
  )
}

// "2d 4h" until a scheduled offer starts.
function Until({ to }) {
  const left = Math.max(0, +new Date(to) - Date.now())
  const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60
  return <>{d ? `${d}d ` : ''}{h}h {m}m</>
}

export function Countdown({ to }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
  const left = Math.max(0, +new Date(to) - now)
  const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60
  return <span>ends in {d ? `${d}d ` : ''}{h}h {m}m</span>
}

/* ── Create / edit ─────────────────────────────────────────────────────────── */

// `offer` is {} (new), { preset }, { copy } (run an ended offer again) or a saved offer.
function OfferForm({ offer, courses, onClose, onSaved }) {
  const isNew = offer && !offer.id
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!offer) return setForm(null)
    const src = offer.id ? offer : offer.copy
    const [startsAt, endsAt] = offer.preset ? offer.preset.dates() : src ? [toIstInput(src.startsAt), toIstInput(src.endsAt)] : [nowIst(), plusHours(nowIst(), 72)]
    setForm({
      name: offer.preset?.name ?? src?.name ?? '',
      badge: offer.preset?.badge ?? src?.badge ?? '',
      discountType: src?.discountType ?? 'percent',
      discountValue: offer.preset?.value ?? src?.discountValue ?? 20,
      startsAt: offer.copy ? nowIst() : startsAt,
      endsAt: offer.copy ? plusHours(nowIst(), 72) : endsAt,
      isPaused: offer.id ? offer.isPaused : false,
      items: Object.fromEntries((src?.items ?? courses.filter((c) => c.isVisible).map((c) => ({ courseId: c.id, salePaymentUrl: '' })))
        .map((i) => [i.courseId, i.salePaymentUrl ?? ''])),
    })
    setError('')
  }, [offer]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const applyPreset = (p) => { const [s, e] = p.dates(); setForm((f) => ({ ...f, name: p.name, badge: p.badge, discountValue: p.value, discountType: 'percent', startsAt: s, endsAt: e })) }
  const toggle = (id) => setForm((f) => {
    const items = { ...f.items }
    if (id in items) delete items[id]; else items[id] = ''
    return { ...f, items }
  })
  const allOn = form && courses.every((c) => c.id in form.items)
  const toggleAll = () => setForm((f) => ({ ...f, items: allOn ? {} : Object.fromEntries(courses.map((c) => [c.id, f.items[c.id] ?? ''])) }))
  const value = +form?.discountValue || 0

  async function save(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const body = {
        name: form.name, badge: form.badge, discountType: form.discountType, discountValue: value,
        startsAt: fromIstInput(form.startsAt), endsAt: fromIstInput(form.endsAt), isPaused: form.isPaused,
        items: Object.entries(form.items).map(([courseId, salePaymentUrl]) => ({ courseId: +courseId, salePaymentUrl })),
      }
      await api(isNew ? '/offers' : `/offers/${offer.id}`, { method: isNew ? 'POST' : 'PUT', body })
      const starts = new Date(body.startsAt) <= new Date()
      toast(isNew ? (starts ? `${form.name} is live on the website` : `${form.name} scheduled for ${fmtDateTime(body.startsAt)}`) : `${form.name} saved`)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const chosen = form ? courses.filter((c) => c.id in form.items) : []
  // Programs paid on the website are charged the sale price directly; only payment-link ones need a sale link.
  const noSaleLink = chosen.filter((c) => !c.paysOnSite && !form.items[c.id]?.trim())

  return (
    <Drawer
      open={!!offer && !!form}
      title={isNew ? 'New offer' : `Edit ${offer?.name ?? ''}`}
      subtitle="Prices on the website change automatically at the start and end time."
      onClose={onClose}
      footer={offer && form && (
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="offer-form" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create offer' : 'Save changes'}</button>
        </>
      )}
    >
      {offer && form && (
        <form id="offer-form" className="form-grid" onSubmit={save}>
          {isNew && (
            <div className="field--wide">
              <span className="field__label">Start from a preset</span>
              <div className="chips">
                {PRESETS.map((p) => <button key={p.name} type="button" className="chip" aria-pressed={form.name === p.name} onClick={() => applyPreset(p)}>{p.name}</button>)}
              </div>
            </div>
          )}
          <Field label="Offer name" hint="For you; visitors don't see it."><input value={form.name} onChange={set('name')} required maxLength={80} /></Field>
          <Field label="Badge on the website" hint="Short, e.g. Black Friday sale."><input value={form.badge} onChange={set('badge')} maxLength={60} placeholder={form.name} /></Field>

          <div className="field field--wide">
            <span className="field__label">Discount</span>
            <div className="toolbar">
              <div className="segmented" role="group" aria-label="Discount type">
                <button type="button" aria-pressed={form.discountType === 'percent'} onClick={() => setForm((f) => ({ ...f, discountType: 'percent' }))}>% off</button>
                <button type="button" aria-pressed={form.discountType === 'amount'} onClick={() => setForm((f) => ({ ...f, discountType: 'amount' }))}>₹ off</button>
              </div>
              <input type="number" min="1" max={form.discountType === 'percent' ? 99 : undefined} step="1" value={form.discountValue} onChange={set('discountValue')} required style={{ width: 120 }} aria-label="Discount value" />
              <span className="muted">{form.discountType === 'percent' ? 'percent off each price' : 'rupees off each price'}</span>
            </div>
          </div>

          <Field label="Starts (IST)"><input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} required /></Field>
          <Field label="Ends (IST)"><input type="datetime-local" value={form.endsAt} onChange={set('endsAt')} min={form.startsAt} required /></Field>
          <div className="field--wide chips">
            <span className="muted">Run for</span>
            {[['1 day', 24], ['3 days', 72], ['1 week', 168], ['2 weeks', 336]].map(([label, h]) => (
              <button key={label} type="button" className="chip" onClick={() => setForm((f) => ({ ...f, endsAt: plusHours(f.startsAt, h) }))}>{label}</button>
            ))}
          </div>

          <fieldset className="field--wide date-set offer-programs">
            <legend>Programs in this offer</legend>
            <label className="toggle"><input type="checkbox" checked={allOn} onChange={toggleAll} /> <span>All programs</span></label>
            {courses.map((c) => {
              const on = c.id in form.items
              return (
                <div key={c.id} className={`offer-programs__row${on ? ' is-on' : ''}`}>
                  <label className="toggle">
                    <input type="checkbox" checked={on} onChange={() => toggle(c.id)} />
                    <span>{c.name}{!c.isVisible && <small>Hidden on the website</small>}</span>
                  </label>
                  <span className="offer-programs__price">
                    {on ? <><s>{money(c.price)}</s> <strong>{money(salePrice(c.price, form.discountType, value))}</strong></> : money(c.price)}
                  </span>
                  {on && !c.paysOnSite && (
                    <input type="url" className="offer-programs__link" value={form.items[c.id]} pattern="https://.*"
                      onChange={(e) => setForm((f) => ({ ...f, items: { ...f.items, [c.id]: e.target.value } }))}
                      placeholder="Sale payment link (optional), e.g. a Razorpay page at the sale price" aria-label={`Sale payment link for ${c.name}`} />
                  )}
                </div>
              )
            })}
          </fieldset>

          {noSaleLink.length > 0 && (
            <p className="notice field--wide">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                {noSaleLink.length === 1 ? `${noSaleLink[0].name} has` : `${noSaleLink.length} programs have`} no sale link, so the Register button opens the normal payment page.
                Razorpay and Trym charge what that page says, so add a sale link or change the amount there for the offer's duration.
              </span>
            </p>
          )}

          {!isNew && (
            <label className="toggle field--wide">
              <input type="checkbox" checked={form.isPaused} onChange={(e) => setForm((f) => ({ ...f, isPaused: e.target.checked }))} />
              <span>Paused<small>While paused the website shows normal prices.</small></span>
            </label>
          )}
          <ErrorNote>{error}</ErrorNote>
        </form>
      )}
    </Drawer>
  )
}
