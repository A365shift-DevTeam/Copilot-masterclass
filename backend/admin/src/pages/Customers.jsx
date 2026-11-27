import { useEffect, useState } from 'react'
import { api, fmtDate, fmtDateTime, money } from '../api.js'
import { Drawer, ErrorNote, StatusPill, Pagination } from '../ui.jsx'
import { dateParams, Entity, ListTable, ListToolbar, RowActions, standardFilters } from '../list.jsx'


// wa.me needs the country code; a bare 10-digit number is taken as Indian.
const waNumber = (phone) => { const d = phone.replace(/\D/g, ''); return d.length === 10 ? `91${d}` : d }

export default function Customers() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [courses, setCourses] = useState([])
  const [filters, setFilters] = useState({})
  useEffect(() => { api('/courses').then(setCourses, () => {}) }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      const query = new URLSearchParams(Object.entries({ page, size, q: q.trim(), status: filters.status, courseId: filters.program, ...dateParams(filters.date) }).filter(([, v]) => v))
      api(`/customers?${query}`).then((d) => { setData(d); setError('') }, (e) => setError(e.message))
    }, 200)
    return () => clearTimeout(t)
  }, [q, page, size, filters])


  return (
    <>
      <ListToolbar title="Customers" count={data?.total} search={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Search name, email or phone"
        filters={standardFilters(courses)} filterValue={filters} onFilters={(v) => { setFilters(v); setPage(1) }} />

      <ErrorNote>{error}</ErrorNote>

      <div className="slv-container">
        <ListTable
          rows={data?.items ?? []}
          rowKey={(c) => c.key}
          offset={(page - 1) * size}
          onRowClick={setOpen}
          state={!data ? 'Loading customers…' : data.items.length === 0 ? (q ? 'Nobody matches that search.' : 'Customers appear here once payments are recorded.') : null}
          columns={[
            { key: 'name', label: 'Customer', render: (c) => <Entity name={c.name} meta={[c.email, c.phone].filter(Boolean).join(', ')} /> },
            { key: 'programs', label: 'Programs', render: (c) => c.programs.length ? <span className="slv-cell" title={c.programs.join(', ')}>{c.programs.join(', ')}</span> : <span className="text-muted">None paid</span> },
            { key: 'payments', label: 'Payments', render: (c) => c.payments },
            { key: 'last', label: 'Last payment', render: (c) => fmtDate(c.lastPaidAt) },
            { key: 'paid', label: 'Paid in total', className: 'num', render: (c) => money(c.paid) },
          ]}
          actions={(c) => <RowActions name={c.name} onView={() => setOpen(c)} />}
        />
        {data && <Pagination page={page} size={size} total={data.total} onPage={setPage} onSize={(n) => { setSize(n); setPage(1) }} noun="customers" />}
      </div>

      <CustomerDrawer customer={open} onClose={() => setOpen(null)} />
    </>
  )
}

function CustomerDrawer({ customer, onClose }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!customer) return
    setRows(null)
    setError('')
    // Exact email match when we have one; otherwise the phone or name as a search.
    const query = customer.email ? `email=${encodeURIComponent(customer.email)}` : `q=${encodeURIComponent(customer.phone ?? customer.name)}`
    api(`/payments?${query}&size=200`).then((d) => setRows(d.items), (e) => setError(e.message))
  }, [customer])

  return (
    <Drawer
      open={!!customer}
      title={customer?.name ?? ''}
      subtitle={customer && [customer.email, customer.phone].filter(Boolean).join(', ')}
      onClose={onClose}
      footer={customer && (
        <>
          {customer.email && <a className="btn" href={`mailto:${customer.email}`}>Email</a>}
          {customer.phone && <a className="btn" href={`https://wa.me/${waNumber(customer.phone)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </>
      )}
    >
      {customer && (
        <>
          <dl className="kv">
            <dt>Paid in total</dt><dd>{money(customer.paid)}</dd>
            <dt>Payments</dt><dd>{customer.payments}</dd>
            <dt>Last payment</dt><dd>{fmtDateTime(customer.lastPaidAt)}</dd>
          </dl>
          <ErrorNote>{error}</ErrorNote>
          {!rows ? <div className="loading" aria-busy="true">Loading payments…</div> : (
            <table className="table">
              <thead><tr><th>Date</th><th>Program</th><th>Status</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="nowrap">{fmtDate(p.paidAt)}</td>
                    <td>{p.courseName ?? 'Unassigned'}</td>
                    <td><StatusPill status={p.status} /></td>
                    <td className="num">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Drawer>
  )
}
