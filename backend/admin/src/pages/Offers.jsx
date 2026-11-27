import { useEffect, useState } from 'react'
import { AlertTriangle, Copy, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { api, fmtDateTime, fromIstInput, money, toIstInput } from '../api.js'
import { Drawer, ErrorNote, Field, toast } from '../ui.jsx'

// Same rule as OfferPricing.SalePrice in the API: whole rupees, never below zero.
export const salePrice = (price, type, value) =>
  Math.max(0, type === 'percent' ? Math.round(price * (1 - value / 100)) : price - value)

const offText = (o) => (o.discountType === 'percent' ? `${+o.discountValue}% off` : `${money(o.discountValue)} off`)

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

  const load = () => Promise.all([api('/offers'), api('/courses')]).then(([o, c]) => { setOffers(o); setCourses(c) }, (e) => setError(e.message))
  useEffect(() => { load() }, [])

  const close = () => { setEditing(null); if (arg === 'new') history.replaceState(null, '', '#offers') }
  const nameOf = Object.fromEntries(courses.map((c) => [c.id, c]))

  async function setPaused(o, isPaused) {
    try {
      await api(`/offers/${o.id}`, { method: 'PUT', body: { ...o, isPaused } })
      toast(isPaused ? `${o.name} paused. Normal prices are back on the website.` : `${o.name} resumed`)
      load()
    } catch (e) { toast(e.message, 'bad') }
  }
  async function remove(o) {
    if (!window.confirm(`Delete "${o.name}"? If it is live, normal prices return straight away.`)) return
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
        <section key={status} className="panel panel--flush">
          <div className="panel__head panel__head--pad"><h2>{STATUS[status].label}</h2></div>
          <ul className="offers">
            {list.map((o) => (
              <li key={o.id}>
                <div className="offers__main">
                  <span className={`pill ${STATUS[o.status].className}`}>{STATUS[o.status].label}</span>
                  <strong>{o.name}</strong>
                  <span className="offers__badge">{o.badge}</span>
                  <small>{fmtDateTime(o.startsAt)} to {fmtDateTime(o.endsAt)} IST{o.status === 'live' && <>, <Countdown to={o.endsAt} /></>}</small>
                </div>
                <div className="offers__prices">
                  <span className="offers__off">{offText(o)}</span>
                  {o.items.map((i) => nameOf[i.courseId] && (
                    <span key={i.courseId} className="offers__price">
                      {nameOf[i.courseId].name}: <s>{money(nameOf[i.courseId].price)}</s> {money(salePrice(nameOf[i.courseId].price, o.discountType, o.discountValue))}
                    </span>
                  ))}
                </div>
                <div className="programs__actions">
                  {o.status === 'ended' ? (
                    <button type="button" className="btn btn--sm" onClick={() => setEditing({ copy: o })}><Copy size={14} aria-hidden="true" /> Run again</button>
                  ) : (
                    <>
                      <button type="button" className="btn btn--sm" onClick={() => setEditing(o)}><Pencil size={14} aria-hidden="true" /> Edit</button>
                      <button type="button" className="btn btn--sm" onClick={() => setPaused(o, !o.isPaused)}>
                        {o.isPaused ? <><Play size={14} aria-hidden="true" /> Resume</> : <><Pause size={14} aria-hidden="true" /> Pause</>}
                      </button>
                    </>
                  )}
                  <button type="button" className="icon-btn" onClick={() => remove(o)} aria-label={`Delete ${o.name}`} title="Delete"><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <OfferForm offer={editing} courses={courses} onClose={close} onSaved={() => { close(); load() }} />
    </>
  )
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
  const noSaleLink = chosen.filter((c) => !form.items[c.id]?.trim())

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
                  {on && (
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
