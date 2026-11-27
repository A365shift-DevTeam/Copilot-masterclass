import { Fragment, useEffect, useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { api, fmtDateTime, fromIstInput, METHODS, money, STATUSES, toIstInput } from '../api.js'
import { confirmAction, Drawer, ErrorNote, Field, toast, Pagination } from '../ui.jsx'
import { BulkBar, dateParams, Entity, ListTable, ListToolbar, RowActions, standardFilters, StatusBadge } from '../list.jsx'

// arg comes from the hash: #payments/new opens the form, #payments/edit/12 opens payment 12,
// #payments/unassigned filters to Razorpay payments with no program.
export default function Payments({ arg }) {
  const [courses, setCourses] = useState([])
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(arg === 'unassigned' ? { program: 'none' } : {})
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(arg === 'new' ? {} : null) // null = closed, {} = new, row = edit
  const [viewing, setViewing] = useState(null)
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState(() => new Set()) // ticked payment ids

  useEffect(() => { api('/courses').then(setCourses, (e) => setError(e.message)) }, [])
  useEffect(() => {
    const id = arg?.startsWith('edit/') && +arg.slice(5)
    if (id) api(`/payments/${id}`).then(setEditing, (e) => setError(e.message))
  }, [arg])

  // Dates are picked as IST calendar days; "to" includes the whole day.
  const { status, program, date } = filters
  const query = new URLSearchParams(Object.entries({
    q: q.trim(), status,
    courseId: program === 'none' ? '' : program, unassigned: program === 'none' ? 'true' : '',
    ...dateParams(date),
  }).filter(([, v]) => v)).toString()

  // A new search or filter starts a new selection, so hidden rows are never acted on.
  useEffect(() => setSelected(new Set()), [query])

  useEffect(() => {
    const t = setTimeout(() => {
      api(`/payments?${query}&page=${page}&size=${size}`).then((d) => { setData(d); setError('') }, (e) => setError(e.message))
    }, 200) // let typing in search settle
    return () => clearTimeout(t)
  }, [query, page, size, reload])

  const sections = standardFilters(courses, { unassigned: true })
  // Leave #payments/new or /edit/… so a reload doesn't reopen the form.
  const close = () => { setEditing(null); if (arg === 'new' || arg?.startsWith('edit/')) history.replaceState(null, '', '#payments') }
  const saved = () => { close(); setReload((n) => n + 1) }
  async function bulk(action, status) {
    const n = selected.size
    const ok = action === 'delete'
      ? await confirmAction({ title: `Delete ${n} ${n === 1 ? 'payment' : 'payments'}?`, text: 'This can\u2019t be undone.', confirmText: 'Delete' })
      : await confirmAction({ title: `Mark ${n} ${n === 1 ? 'payment' : 'payments'} as ${status}?`, confirmText: `Mark ${status}`, danger: false })
    if (!ok) return
    try {
      const r = await api('/payments/bulk', { method: 'POST', body: { ids: [...selected], action, status } })
      toast(action === 'delete' ? `${r.count} deleted` : `${r.count} marked ${status}`)
      setSelected(new Set())
      setReload((x) => x + 1)
    } catch (e) { toast(e.message, 'bad') }
  }

  async function remove(p) {
    if (!await confirmAction({ title: 'Delete this payment?', text: `${p.customerName}, ${money(p.amount)}. This can’t be undone.`, confirmText: 'Delete payment' })) return
    try { await api(`/payments/${p.id}`, { method: 'DELETE' }); toast('Payment deleted'); setReload((n) => n + 1) }
    catch (e) { toast(e.message, 'bad') }
  }

  return (
    <>
      <ListToolbar title="Payments" count={data?.total} search={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Search name, email, phone or reference"
        filters={sections} filterValue={filters} onFilters={(v) => { setFilters(v); setPage(1) }} exportHref={`/api/payments/export?${query}`}>
        <button type="button" className="pt-action-btn pt-action-primary" onClick={() => setEditing({})} disabled={!courses.length}>
          <Plus size={15} aria-hidden="true" /> Record payment
        </button>
      </ListToolbar>

      <ErrorNote>{error}</ErrorNote>

      <BulkBar count={selected.size} noun={selected.size === 1 ? 'payment' : 'payments'} onClear={() => setSelected(new Set())}>
        <select className="bulk-bar-select" value="" onChange={(e) => e.target.value && bulk('status', e.target.value)} aria-label="Set status">
          <option value="">Set status…</option>
          {STATUSES.map((st) => <option key={st}>{st}</option>)}
        </select>
        <a className="bulk-bar-btn" href={`/api/payments/export?ids=${[...selected].join(',')}`} download><Download size={14} aria-hidden="true" /> Export</a>
        <button type="button" className="bulk-bar-btn bulk-bar-btn--danger" onClick={() => bulk('delete')}><Trash2 size={14} aria-hidden="true" /> Delete</button>
      </BulkBar>

      <div className="slv-container">
        <ListTable
          selected={selected}
          onSelect={setSelected}
          rows={data?.items ?? []}
          rowKey={(p) => p.id}
          offset={(page - 1) * size}
          onRowClick={setViewing}
          state={!data ? 'Loading payments…' : data.items.length === 0 ? (q || Object.keys(filters).length ? 'No payments match these filters.' : 'No payments yet.') : null}
          columns={[
            { key: 'customer', label: 'Customer', render: (p) => <Entity name={p.customerName} meta={[p.email, p.phone].filter(Boolean).join(', ')} /> },
            { key: 'program', label: 'Program', render: (p) => p.courseName ?? <StatusBadge status="Unassigned" /> },
            { key: 'date', label: 'Date (IST)', render: (p) => fmtDateTime(p.paidAt) },
            { key: 'method', label: 'Method', render: (p) => (
              <span className="contact-cell-primary"><span>{p.fromRazorpay ? 'Razorpay (auto)' : p.method}</span><span className="contact-subtext">{p.reference}</span></span>
            ) },
            { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            { key: 'amount', label: 'Amount', className: 'num', render: (p) => money(p.amount) },
          ]}
          actions={(p) => <RowActions name={p.customerName} onView={() => setViewing(p)} onEdit={() => setEditing(p)} onDelete={() => remove(p)} />}
        />
        {data && <Pagination page={page} size={size} total={data.total} onPage={setPage} onSize={(n) => { setSize(n); setPage(1) }} noun="payments" />}
      </div>

      <PaymentView payment={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null) }} />
      <PaymentForm payment={editing} courses={courses} onClose={close} onSaved={saved} />
    </>
  )
}

/* Read-only view of one payment, with its registration answers. */
function PaymentView({ payment: p, onClose, onEdit }) {
  return (
    <Drawer
      open={!!p}
      title={p?.customerName ?? ''}
      subtitle={p && `${money(p.amount)} for ${p.courseName ?? 'an unassigned program'}`}
      onClose={onClose}
      footer={p && (
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Close</button>
          <button type="button" className="btn btn--primary" onClick={onEdit}>Edit payment</button>
        </>
      )}
    >
      {p && (
        <dl className="kv">
          <dt>Status</dt><dd><StatusBadge status={p.status} /></dd>
          <dt>Paid at</dt><dd>{fmtDateTime(p.paidAt)} IST</dd>
          <dt>Email</dt><dd>{p.email || '—'}</dd>
          <dt>Phone</dt><dd>{p.phone || '—'}</dd>
          <dt>Method</dt><dd>{p.fromRazorpay ? 'Razorpay (recorded automatically)' : p.method || '—'}</dd>
          <dt>Reference</dt><dd>{p.reference || '—'}</dd>
          {p.notes && <><dt>Notes</dt><dd>{p.notes}</dd></>}
          {p.answers?.map((a) => <Fragment key={a.key}><dt>{a.label}</dt><dd>{a.value}</dd></Fragment>)}
        </dl>
      )}
    </Drawer>
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
      : { ...payment, email: payment.email ?? '', phone: payment.phone ?? '', method: payment.method ?? '', reference: payment.reference ?? '', notes: payment.notes ?? '', paidAt: toIstInput(payment.paidAt), answers: payment.answers ?? [] })
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
      const body = { ...form, courseId: +form.courseId, amount: +form.amount, paidAt: fromIstInput(form.paidAt), answers: isNew ? null : form.answers }
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
    if (!await confirmAction({ title: 'Delete this payment?', text: `${payment.customerName}, ${money(payment.amount)}. This can't be undone.`, confirmText: 'Delete payment' })) return
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
          {form.answers?.length > 0 && (
            <fieldset className="field--wide date-set answers-set">
              <legend>Registration form answers</legend>
              {form.answers.map((a, i) => (
                <Field key={a.key} label={a.label} wide={a.value.length > 40}>
                  <input value={a.value} maxLength={2000}
                    onChange={(e) => setForm((f) => ({ ...f, answers: f.answers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) }))} />
                </Field>
              ))}
            </fieldset>
          )}
          <ErrorNote>{error}</ErrorNote>
        </form>
      )}
    </Drawer>
  )
}
