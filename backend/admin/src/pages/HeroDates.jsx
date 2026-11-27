import { useEffect, useState } from 'react'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, fmtDate, fromIstInput, toIstInput } from '../api.js'
import { confirmAction, Drawer, ErrorNote, Field, toast } from '../ui.jsx'

const ends = (x) => +new Date(x.endsAt ?? +new Date(x.startsAt) + 864e5)
const time = (iso) => fmtDate(iso, { hour: 'numeric', minute: '2-digit' })

/* The webinar dates the website's hero shows: the next one first, every later
   one as its own row. A date drops off by itself once its session is over. */
export default function HeroDates() {
  const [dates, setDates] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // {} new, or a date
  const load = () => api('/hero-dates').then(setDates, (e) => setError(e.message))
  useEffect(() => { load() }, [])

  const now = Date.now()
  const nextId = dates?.find((x) => ends(x) > now)?.id

  async function remove(x) {
    if (!await confirmAction({ title: 'Delete this date?', text: `${fmtDate(x.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })} is removed from the website.`, confirmText: 'Delete date' })) return
    try { await api(`/hero-dates/${x.id}`, { method: 'DELETE' }); toast('Date deleted'); load() }
    catch (e) { toast(e.message, 'bad') }
  }

  // A new date: a week after the last one, same times and language (or next Saturday 9 AM to 1 PM, Tamil).
  function suggestion() {
    const last = dates?.[dates.length - 1]
    const shift = (iso) => iso && toIstInput(new Date(+new Date(iso) + 7 * 864e5).toISOString())
    if (last) return { startsAt: shift(last.startsAt), endsAt: shift(last.endsAt) ?? '', language: last.language ?? '' }
    const sat = new Date(); sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7 || 7))
    const day = toIstInput(sat.toISOString()).slice(0, 10)
    return { startsAt: `${day}T09:00`, endsAt: `${day}T13:00`, language: 'Tamil' }
  }

  return (
    <section className="panel panel--flush">
      <div className="panel__head panel__head--pad">
        <div>
          <h2>Hero section dates</h2>
          <span className="muted">The webinar dates at the top of the website. The next one shows first; past dates drop off by themselves.</span>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditing({ isNew: true, ...suggestion() })}>
          <Plus size={14} aria-hidden="true" /> Add date
        </button>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {!dates ? <div className="loading" aria-busy="true">Loading dates…</div> : dates.length === 0 ? (
        <div className="empty"><p>No dates. The website says “New dates announced soon” until you add one.</p></div>
      ) : (
        <ul className="programs hero-dates">
          {dates.map((x) => {
            const past = ends(x) <= now
            return (
              <li key={x.id} className={past ? 'is-hidden' : ''}>
                <div className="programs__name">
                  <strong><CalendarDays size={15} aria-hidden="true" /> {fmtDate(x.startsAt, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  <span>{x.endsAt ? `${time(x.startsAt)} to ${time(x.endsAt)} IST` : 'All day'}{x.language ? `, ${x.language}` : ''}</span>
                </div>
                <div>
                  {past ? <span className="pill pill--neutral">Past</span>
                    : x.id === nextId ? <span className="pill pill--paid">Showing now</span>
                    : <span className="pill pill--registered">Coming up</span>}
                </div>
                <div className="programs__actions">
                  <button type="button" className="btn btn--sm" onClick={() => setEditing({ ...x, startsAt: toIstInput(x.startsAt), endsAt: toIstInput(x.endsAt), language: x.language ?? '' })}>
                    <Pencil size={14} aria-hidden="true" /> Edit
                  </button>
                  <button type="button" className="icon-btn" onClick={() => remove(x)} aria-label="Delete this date" title="Delete"><Trash2 size={16} /></button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <DateForm date={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
    </section>
  )
}

function DateForm({ date, onClose, onSaved }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(date ? { startsAt: date.startsAt, endsAt: date.endsAt, language: date.language } : null); setError('') }, [date])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = { startsAt: fromIstInput(form.startsAt), endsAt: fromIstInput(form.endsAt), language: form.language }
      await api(date.isNew ? '/hero-dates' : `/hero-dates/${date.id}`, { method: date.isNew ? 'POST' : 'PUT', body })
      toast(date.isNew ? 'Date added to the website' : 'Date saved')
      onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <Drawer
      open={!!date && !!form}
      title={date?.isNew ? 'Add webinar date' : 'Edit webinar date'}
      subtitle="India time. Visitors who register now are signed up for the next date."
      onClose={onClose}
      footer={date && form && (
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="date-form" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : date.isNew ? 'Add date' : 'Save date'}</button>
        </>
      )}
    >
      {date && form && (
        <form id="date-form" className="form-grid" onSubmit={save}>
          <Field label="Starts"><input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} required /></Field>
          <Field label="Ends" hint="Leave empty for an all-day date."><input type="datetime-local" value={form.endsAt} min={form.startsAt} onChange={set('endsAt')} /></Field>
          <Field label="Language" wide><input value={form.language} onChange={set('language')} placeholder="Tamil" maxLength={40} /></Field>
          <ErrorNote>{error}</ErrorNote>
        </form>
      )}
    </Drawer>
  )
}
