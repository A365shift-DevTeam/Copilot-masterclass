import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { api, fmtDate, fmtDateTime, money } from '../api.js'
import { Drawer, ErrorNote, StatusPill } from '../ui.jsx'

const SIZE = 25

// wa.me needs the country code; a bare 10-digit number is taken as Indian.
const waNumber = (phone) => { const d = phone.replace(/\D/g, ''); return d.length === 10 ? `91${d}` : d }

export default function Customers() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      const query = new URLSearchParams({ page, size: SIZE, ...(q.trim() && { q: q.trim() }) })
      api(`/customers?${query}`).then((d) => { setData(d); setError('') }, (e) => setError(e.message))
    }, 200)
    return () => clearTimeout(t)
  }, [q, page])

  const pages = data ? Math.max(1, Math.ceil(data.total / SIZE)) : 1

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Customers</h1>
          {data && <p>{data.total} people, {data.repeat} of them bought more than once</p>}
        </div>
      </header>

      <div className="toolbar" role="search">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Search name, email or phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Search customers" />
        </label>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <section className="panel panel--flush">
        {!data ? (
          <div className="loading" aria-busy="true">Loading customers…</div>
        ) : data.items.length === 0 ? (
          <div className="empty"><p>{q ? 'Nobody matches that search.' : 'Customers appear here once payments are recorded.'}</p></div>
        ) : (
          <div className="table-wrap">
            <table className="table table--rows table--click">
              <thead><tr><th>Customer</th><th>Programs</th><th>Payments</th><th>Last payment</th><th className="num">Paid in total</th></tr></thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.key} tabIndex={0} onClick={() => setOpen(c)} onKeyDown={(e) => e.key === 'Enter' && setOpen(c)}>
                    <td><strong>{c.name}</strong><small>{[c.email, c.phone].filter(Boolean).join(', ')}</small></td>
                    <td>{c.programs.length ? c.programs.map((p) => <span key={p} className="tag">{p}</span>) : <span className="muted">Unassigned</span>}</td>
                    <td>{c.payments}</td>
                    <td className="nowrap">{fmtDate(c.lastPaidAt)}</td>
                    <td className="num">{money(c.paid)}</td>
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
