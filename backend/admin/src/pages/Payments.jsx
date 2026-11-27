import { useEffect, useState } from 'react'
import { Download, Plus, Search } from 'lucide-react'
import { api, fmtDateTime, fromIstInput, METHODS, money, STATUSES, toIstInput } from '../api.js'
import { Drawer, ErrorNote, Field, StatusPill, toast } from '../ui.jsx'

const SIZE = 25

const NO_FILTERS = { q: '', status: '', courseId: '', from: '', to: '' }

// arg comes from the hash: #payments/new opens the form, #payments/unassigned filters to Razorpay payments with no program.
export default function Payments({ arg }) {
  const [courses, setCourses] = useState([])
  const [filters, setFilters] = useState(arg === 'unassigned' ? { ...NO_FILTERS, courseId: 'none' } : NO_FILTERS)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(arg === 'new' ? {} : null) // null = closed, {} = new, row = edit
  const [reload, setReload] = useState(0)

  useEffect(() => { api('/courses').then(setCourses, (e) => setError(e.message)) }, [])

  // Dates are picked as IST calendar days; "to" includes the whole day.
  const query = new URLSearchParams(Object.entries({
    q: filters.q.trim(), status: filters.status,
    courseId: filters.courseId === 'none' ? '' : filters.courseId, unassigned: filters.courseId === 'none' ? 'true' : '',
    from: filters.from && `${filters.from}T00:00:00+05:30`,
    to: filters.to && new Date(+new Date(`${filters.to}T00:00:00+05:30`) + 864e5).toISOString(),
  }).filter(([, v]) => v)).toString()

  useEffect(() => {
    const t = setTimeout(() => {
      api(`/payments?${query}&page=${page}&size=${SIZE}`).then((d) => { setData(d); setError('') }, (e) => setError(e.message))
    }, 200) // let typing in search settle
    return () => clearTimeout(t)
  }, [query, page, reload])

  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1) }
  const pages = data ? Math.max(1, Math.ceil(data.total / SIZE)) : 1
  // Leave #payments/new so a reload doesn't reopen the form.
  const close = () => { setEditing(null); if (arg === 'new') history.replaceState(null, '', '#payments') }
  const saved = () => { close(); setReload((n) => n + 1) }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Payments</h1>
          {data && <p className="muted">{data.total} entries, {money(data.paidSum)} collected in this view</p>}
        </div>
        <div className="page-head__actions">
          <a className="btn" href={`/api/payments/export?${query}`} download>
            <Download size={16} aria-hidden="true" /> Export CSV
          </a>
          <button type="button" className="btn btn--primary" onClick={() => setEditing({})} disabled={!courses.length}>
            <Plus size={16} aria-hidden="true" /> Record payment
          </button>
        </div>
      </header>

      <div className="toolbar" role="search">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Search name, email, phone or reference" value={filters.q} onChange={set('q')} aria-label="Search payments" />
        </label>
        <div className="segmented" role="group" aria-label="Status">
          {['', ...STATUSES].map((s) => (
            <button key={s || 'all'} type="button" aria-pressed={filters.status === s} onClick={() => set('status')({ target: { value: s } })}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <select value={filters.courseId} onChange={set('courseId')} aria-label="Program">
          <option value="">All programs</option>
          <option value="none">Unassigned (from Razorpay)</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="date-range">
          <span className="sr-only">From</span>
          <input type="date" value={filters.from} onChange={set('from')} aria-label="From date" />
          <span aria-hidden="true">to</span>
          <input type="date" value={filters.to} onChange={set('to')} aria-label="To date" />
        </label>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <section className="panel panel--flush">
        {!data ? (
          <div className="loading" aria-busy="true">Loading payments…</div>
        ) : data.items.length === 0 ? (
          <div className="empty">
            <p>{query ? 'No payments match these filters.' : 'The ledger is empty.'}</p>
            {query ? (
              <button type="button" className="btn" onClick={() => { setFilters(NO_FILTERS); setPage(1) }}>Clear filters</button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={() => setEditing({})} disabled={!courses.length}>Record the first payment</button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table table--rows table--click">
              <thead>
                <tr><th>Date (IST)</th><th>Customer</th><th>Program</th><th>Method</th><th>Status</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} tabIndex={0} onClick={() => setEditing(p)} onKeyDown={(e) => e.key === 'Enter' && setEditing(p)}>
                    <td className="nowrap">{fmtDateTime(p.paidAt)}</td>
                    <td>
                      <strong>{p.customerName}</strong>
                      <small>{[p.email, p.phone].filter(Boolean).join(', ')}</small>
                    </td>
                    <td>{p.courseName ?? <span className="pill pill--pending">Unassigned</span>}</td>
                    <td>{p.fromRazorpay ? <span className="pill pill--neutral">Razorpay, auto</span> : p.method}<small>{p.reference}</small></td>
                    <td><StatusPill status={p.status} /></td>
                    <td className="num">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && pages > 1 && (
          <nav className="pager" aria-label="Pages">
            <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} of {pages}</span>
            <button type="button" className="btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        )}
      </section>

      <PaymentForm payment={editing} courses={courses} onClose={close} onSaved={saved} />
    </>
  )
}

function PaymentForm({ payment, courses, onClose, onSaved }) {
  const isNew = payment && !payment.id
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!payment) return
    const first = courses[0]
    setForm(isNew
      ? { courseId: first?.id ?? '', customerName: '', email: '', phone: '', amount: first?.price ?? 0, status: 'Paid', method: 'Razorpay', reference: '', paidAt: toIstInput(new Date().toISOString()), notes: '' }
      : { ...payment, email: payment.email ?? '', phone: payment.phone ?? '', method: payment.method ?? '', reference: payment.reference ?? '', notes: payment.notes ?? '', paidAt: toIstInput(payment.paidAt) })
    setError('')
  }, [payment, courses.length]) // eslint-disable-line react-hooks/exhaustive-deps -- refill once programs load (#payments/new)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  // Picking a program on a new entry fills in its current price.
  const pickCourse = (e) => {
    const c = courses.find((x) => x.id === +e.target.value)
    setForm((f) => ({ ...f, courseId: +e.target.value, amount: isNew && c ? c.price : f.amount }))
  }

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = { ...form, courseId: +form.courseId, amount: +form.amount, paidAt: fromIstInput(form.paidAt) }
      await api(isNew ? '/payments' : `/payments/${payment.id}`, { method: isNew ? 'POST' : 'PUT', body })
      toast(isNew ? `Payment from ${form.customerName} recorded` : 'Changes saved')
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the payment from ${payment.customerName}? This can't be undone.`)) return
    setBusy(true)
    try {
      await api(`/payments/${payment.id}`, { method: 'DELETE' })
      toast('Payment deleted')
      onSaved()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={!!payment && !!form}
      title={isNew ? 'Record payment' : 'Edit payment'}
      subtitle={isNew ? 'Add a payment received through Trym, Razorpay or by hand.' : `Entry #${payment?.id}`}
      onClose={onClose}
      footer={payment && form && (
        <>
          {!isNew && <button type="button" className="btn btn--danger" onClick={remove} disabled={busy}>Delete</button>}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="payment-form" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Record payment' : 'Save changes'}</button>
        </>
      )}
    >
      {payment && form && (
        <form id="payment-form" className="form-grid" onSubmit={save}>
          <Field label="Customer name" wide><input value={form.customerName} onChange={set('customerName')} required maxLength={160} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={set('email')} /></Field>
          <Field label="Phone"><input type="tel" value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Program" wide>
            <select value={form.courseId ?? ''} onChange={pickCourse} required>
              <option value="" disabled>Choose a program</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Amount (₹)" hint="What this person paid. Changing a program's price later won't change it.">
            <input type="number" min="0" step="1" value={form.amount} onChange={set('amount')} required />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <Field label="Method">
            <select value={form.method} onChange={set('method')}>
              <option value="">Not set</option>
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Reference" hint="Payment or order ID from the gateway.">
            <input value={form.reference} onChange={set('reference')} />
          </Field>
          <Field label="Paid at (IST)" wide><input type="datetime-local" value={form.paidAt} onChange={set('paidAt')} required /></Field>
          <Field label="Notes" wide><textarea rows={3} value={form.notes} onChange={set('notes')} /></Field>
          <ErrorNote>{error}</ErrorNote>
        </form>
      )}
    </Drawer>
  )
}
