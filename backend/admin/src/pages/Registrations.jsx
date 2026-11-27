import { Fragment, useEffect, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { api, fmtDateTime, money, STATUSES } from '../api.js'
import { confirmAction, Drawer, ErrorNote, Pagination, toast } from '../ui.jsx'
import { BulkBar, Entity, ListTable, ListToolbar, RowActions, STATUS_OPTIONS, StatusBadge } from '../list.jsx'

const BUILT_IN = ['name', 'email', 'phone']
// wa.me needs the country code; a bare 10-digit number is taken as Indian.
const waNumber = (phone) => { const d = phone.replace(/\D/g, ''); return d.length === 10 ? `91${d}` : d }

/* One program's registrations: payers, and people who filled in the form but never
   paid ("Registered"), with a column per form field, filterable by any of them. */
export default function Registrations({ arg }) {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState(arg ? +arg : '')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({}) // status, and "f.<fieldKey>" per question
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState(() => new Set()) // ticked row ids: "P12" payments, "R7" unpaid registrations

  useEffect(() => {
    api('/courses').then((cs) => {
      const list = cs.filter((c) => c.category).sort((a, b) => a.sortOrder - b.sortOrder)
      setCourses(list)
      if (!courseId && list[0]) setCourseId(list[0].id)
    }, (e) => setError(e.message))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const query = new URLSearchParams({ courseId, ...(q.trim() && { q: q.trim() }) })
  for (const [k, v] of Object.entries(filters)) if (v && String(v).trim()) query.set(k, String(v).trim())

  // A new program, search or filter starts a new selection.
  useEffect(() => setSelected(new Set()), [query.toString()]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!courseId) return
    const t = setTimeout(() => {
      api(`/registrations?${query}&page=${page}&size=${size}`).then((d) => { setData(d); setError('') }, (e) => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [query.toString(), page, size, reload]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns = data?.columns ?? []
  const extra = columns.filter((c) => !BUILT_IN.includes(c.key))
  const answer = (row, key) => row.answers.find((a) => a.key === key)?.value ?? ''
  const reset = () => setPage(1)
  const sections = [
    { key: 'status', title: 'Status', type: 'pills', options: [{ value: 'Registered', label: 'Registered (not paid)', dot: '#2563eb' }, ...STATUS_OPTIONS] },
    ...columns.map((c) => c.options?.length
      ? { key: `f.${c.key}`, title: c.label, type: 'pills', options: c.options.map((o) => ({ value: o, label: o })) }
      : { key: `f.${c.key}`, title: c.label, type: 'text' }),
  ]

  async function remove(r) {
    const unpaid = r.status === 'Registered'
    if (!await confirmAction({
      title: unpaid ? 'Delete this registration?' : 'Delete this payment?',
      text: unpaid ? `${r.customerName} filled in the form but didn’t pay. Their details will be removed.` : `${r.customerName}, ${money(r.amount)}. This can’t be undone.`,
      confirmText: unpaid ? 'Delete registration' : 'Delete payment',
    })) return
    try {
      await api(unpaid ? `/registrations/attempt/${r.id.slice(1)}` : `/payments/${r.paymentId}`, { method: 'DELETE' })
      toast(unpaid ? 'Registration deleted' : 'Payment deleted')
      setOpen(null)
      setReload((n) => n + 1)
    } catch (e) { toast(e.message, 'bad') }
  }
  async function bulk(action, status) {
    const n = selected.size
    const unpaid = [...selected].filter((id) => id.startsWith('R')).length
    const ok = action === 'delete'
      ? await confirmAction({ title: `Delete ${n} ${n === 1 ? 'row' : 'rows'}?`, text: 'Payments and unpaid registrations among them are removed. This can\u2019t be undone.', confirmText: 'Delete' })
      : await confirmAction({ title: `Mark the selected payments as ${status}?`, text: unpaid ? `${unpaid} unpaid ${unpaid === 1 ? 'registration has' : 'registrations have'} no payment and will be left as they are.` : '', confirmText: `Mark ${status}`, danger: false })
    if (!ok) return
    try {
      const r = await api('/registrations/bulk', { method: 'POST', body: { ids: [...selected], action, status } })
      toast(action === 'delete' ? `${r.count} deleted` : `${r.count} marked ${status}`)
      setSelected(new Set())
      setReload((x) => x + 1)
    } catch (e) { toast(e.message, 'bad') }
  }

  const edit = (r) => { window.location.hash = `#payments/edit/${r.paymentId}` }

  return (
    <>
      <ListToolbar title="Registrations" count={data?.total} search={q} onSearch={(v) => { setQ(v); reset() }} placeholder="Search name, email, phone or ID"
        filters={sections} filterValue={filters} onFilters={(v) => { setFilters(v); reset() }}
        exportHref={courseId ? `/api/registrations/export?${query}` : undefined}>
        <select value={courseId} onChange={(e) => { setCourseId(+e.target.value); setFilters({}); reset(); setData(null) }} aria-label="Program" className="toolbar__program">
          {courses.map((c) => <option key={c.id} value={c.id}>{c.cardTitle || c.name}</option>)}
        </select>
      </ListToolbar>

      <ErrorNote>{error}</ErrorNote>

      <BulkBar count={selected.size} noun={selected.size === 1 ? 'row' : 'rows'} onClear={() => setSelected(new Set())}>
        <select className="bulk-bar-select" value="" onChange={(e) => e.target.value && bulk('status', e.target.value)} aria-label="Set status">
          <option value="">Set status…</option>
          {STATUSES.map((st) => <option key={st}>{st}</option>)}
        </select>
        <a className="bulk-bar-btn" href={`/api/registrations/export?${query}&ids=${[...selected].join(',')}`} download><Download size={14} aria-hidden="true" /> Export</a>
        <button type="button" className="bulk-bar-btn bulk-bar-btn--danger" onClick={() => bulk('delete')}><Trash2 size={14} aria-hidden="true" /> Delete</button>
      </BulkBar>

      <div className="slv-container">
        <ListTable
          selected={selected}
          onSelect={setSelected}
          rows={data?.rows ?? []}
          rowKey={(r) => r.id}
          offset={(page - 1) * size}
          onRowClick={setOpen}
          state={!data ? 'Loading registrations…' : data.rows.length === 0 ? (q || Object.keys(filters).length ? 'Nobody matches these filters.' : 'No registrations for this program yet.') : null}
          columns={[
            { key: 'name', label: 'Name', render: (r) => <Entity name={r.customerName} meta={r.email} /> },
            { key: 'phone', label: 'Phone', render: (r) => r.phone },
            ...extra.map((c) => ({ key: c.key, label: c.label, render: (r) => <span className="slv-cell" title={answer(r, c.key)}>{answer(r, c.key)}</span> })),
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'amount', label: 'Amount', className: 'num', render: (r) => money(r.amount) },
            { key: 'at', label: 'Date (IST)', render: (r) => fmtDateTime(r.at) },
          ]}
          actions={(r) => <RowActions name={r.customerName} onView={() => setOpen(r)} onEdit={r.paymentId ? () => edit(r) : undefined} onDelete={() => remove(r)} />}
        />
        {data && <Pagination page={page} size={size} total={data.total} onPage={setPage} onSize={(n) => { setSize(n); reset() }} noun="registrations" />}
      </div>

      <Drawer
        open={!!open}
        title={open?.customerName ?? ''}
        subtitle={open && (open.status === 'Registered'
          ? `Registered ${fmtDateTime(open.at)} for ${money(open.amount)}, not paid yet`
          : `${money(open.amount)}, ${open.status}, ${fmtDateTime(open.at)}`)}
        onClose={() => setOpen(null)}
        footer={open && (
          <>
            {open.email && <a className="btn" href={`mailto:${open.email}`}>Email</a>}
            {open.phone && <a className="btn" href={`https://wa.me/${waNumber(open.phone)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            <span className="spacer" />
            <button type="button" className="btn btn--danger" onClick={() => remove(open)}>Delete</button>
            {open.paymentId && <button type="button" className="btn btn--primary" onClick={() => edit(open)}>Edit payment</button>}
          </>
        )}
      >
        {open && (
          <dl className="kv">
            <dt>Status</dt><dd><StatusBadge status={open.status} /></dd>
            <dt>Email</dt><dd>{open.email}</dd>
            <dt>Phone</dt><dd>{open.phone}</dd>
            {extra.map((c) => (
              <Fragment key={c.key}><dt>{c.label}</dt><dd>{answer(open, c.key) || <span className="muted">Not answered</span>}</dd></Fragment>
            ))}
          </dl>
        )}
      </Drawer>
    </>
  )
}
