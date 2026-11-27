import { useEffect, useState } from 'react'
import { CalendarClock, KeyRound, ReceiptIndianRupee, RefreshCw, Settings, UsersRound, Zap } from 'lucide-react'
import { api, fmtDateTime } from '../api.js'
import { ErrorNote, Pagination } from '../ui.jsx'

const AREAS = [
  { id: '', label: 'Everything' },
  { id: 'payment', label: 'Payments' },
  { id: 'program', label: 'Programs' },
  { id: 'settings', label: 'Settings' },
  { id: 'admin', label: 'Team' },
  { id: 'auth', label: 'Sign-ins' },
]
const ICONS = { payment: ReceiptIndianRupee, program: CalendarClock, settings: Settings, admin: UsersRound, auth: KeyRound, razorpay: RefreshCw }

export default function Activity() {
  const [area, setArea] = useState('')
  const [actor, setActor] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(50)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const query = new URLSearchParams({ page, size, ...(area && { area }), ...(actor && { actor }) })
    api(`/activity?${query}`).then((d) => { setData(d); setError('') }, (e) => setError(e.message))
  }, [area, actor, page, size])


  return (
    <>
      <header className="page-head">
        <div>
          <h1>Activity</h1>
          <p>Every change made in the admin, and every payment Razorpay sent.</p>
        </div>
      </header>

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Area">
          {AREAS.map((a) => (
            <button key={a.id || 'all'} type="button" aria-pressed={area === a.id} onClick={() => { setArea(a.id); setPage(1) }}>{a.label}</button>
          ))}
        </div>
        <select value={actor} onChange={(e) => { setActor(e.target.value); setPage(1) }} aria-label="Who">
          <option value="">Anyone</option>
          {data?.actors.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <section className="panel panel--flush">
        {!data ? <div className="loading" aria-busy="true">Loading activity…</div> : data.items.length === 0 ? (
          <div className="empty"><p>Nothing recorded for this filter yet.</p></div>
        ) : (
          <ol className="timeline">
            {data.items.map((a) => {
              const fromRazorpay = a.actor.startsWith('Razorpay')
              const Icon = fromRazorpay ? Zap : ICONS[a.action.split('.')[0]] ?? Settings
              return (
                <li key={a.id}>
                  <time dateTime={a.at}>{fmtDateTime(a.at)}</time>
                  <span className={`timeline__dot${fromRazorpay ? ' timeline__dot--razorpay' : ''}`} aria-hidden="true"><Icon size={14} /></span>
                  <div>
                    <p>{a.summary}</p>
                    <small>{a.actor}</small>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        {data && <Pagination page={page} size={size} total={data.total} onPage={setPage} onSize={(n) => { setSize(n); setPage(1) }} noun="entries" />}
      </section>
    </>
  )
}
