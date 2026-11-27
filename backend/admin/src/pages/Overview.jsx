import { useEffect, useState } from 'react'
import { api, fmtDate, fmtDateTime, money } from '../api.js'
import { ErrorNote, StatusPill } from '../ui.jsx'
import { Countdown } from './Offers.jsx'

export default function Overview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api('/dashboard').then(setData, (e) => setError(e.message)) }, [])

  if (error) return <ErrorNote>{error}</ErrorNote>
  if (!data) return <div className="loading" aria-busy="true">Loading overview…</div>

  const stat = (s) => data.byStatus.find((x) => x.status === s) ?? { count: 0, amount: 0 }
  const paid = stat('Paid')
  const nameOf = { null: 'Unassigned (from Razorpay)', ...Object.fromEntries(data.courses.map((c) => [c.id, c.name])) }
  const byCourse = [...data.byCourse].sort((a, b) => b.amount - a.amount)
  const topCourse = byCourse[0]?.amount || 1

  return (
    <>
      <header className="page-head">
        <h1>Overview</h1>
        <div className="page-head__actions">
          <a className="btn" href="#programs">Change a date or price</a>
          <a className="btn" href="#offers/new">Start an offer</a>
          <a className="btn btn--primary" href="#payments/new">Record a payment</a>
        </div>
      </header>

      {data.unassigned > 0 && (
        <p className="notice" role="status">
          <span>{data.unassigned} Razorpay {data.unassigned === 1 ? "payment needs" : "payments need"} a program.</span>
          <a href="#payments/unassigned">Assign them</a>
        </p>
      )}

      {(data.offers ?? []).map((o) => {
        const live = new Date(o.startsAt) <= new Date()
        return (
          <div key={o.id} className="offer-live">
            <span>
              <span className={`pill ${live ? "pill--paid" : "pill--neutral"}`}>{live ? "Offer live" : "Next offer"}</span>
              <strong>{o.name}</strong>{" "}
              <span className="muted">
                on {o.programs} {o.programs === 1 ? "program" : "programs"}, {live ? <Countdown to={o.endsAt} /> : `starts ${fmtDateTime(o.startsAt)}`}
              </span>
            </span>
            <a href="#offers">Manage offers</a>
          </div>
        )
      })}

      {/* Every upcoming date (a webinar can have several), as the clock's sessions. */}
      <SessionClock courses={data.sessions ? data.sessions.map((x, i) => ({ ...x, id: x.courseId, key: i })) : data.courses} byCourse={data.byCourse} />

      <section className="figures" aria-label="Payment totals">
        <Figure label="Collected" value={money(paid.amount)} note={`${paid.count} paid`} />
        <Figure label="Pending" value={money(stat('Pending').amount)} note={`${stat('Pending').count} waiting`} tone="pending" />
        <Figure label="Refunded" value={money(stat('Refunded').amount)} note={`${stat('Refunded').count} refunds`} tone="refunded" />
        <Figure label="Average ticket" value={money(paid.count ? paid.amount / paid.count : 0)} note="per paid entry" />
      </section>

      <div className="split">
        <section className="panel">
          <h2>Collected, last 30 days</h2>
          <Bars daily={data.daily} />
        </section>
        <section className="panel">
          <h2>By program</h2>
          {byCourse.length === 0 && <p className="muted">Paid entries will be totalled here by program.</p>}
          <ul className="by-program">
            {byCourse.map((c) => (
              <li key={c.courseId}>
                <div><span>{nameOf[c.courseId]}</span><strong>{money(c.amount)}</strong></div>
                <div className="bar" aria-hidden="true"><span style={{ "--w": c.amount / topCourse }} /></div>
                <small>{c.count} paid</small>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2>Latest payments</h2>
          <a href="#payments">Open the ledger</a>
        </div>
        {data.recent.length === 0 ? (
          <p className="muted">No payments yet. Record the first one from the Payments page.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Program</th><th>Date</th><th>Status</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {data.recent.map((p) => (
                <tr key={p.id}>
                  <td>{p.customerName}</td>
                  <td>{p.courseName ?? 'Unassigned'}</td>
                  <td>{fmtDateTime(p.paidAt)}</td>
                  <td><StatusPill status={p.status} /></td>
                  <td className="num">{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}

const Figure = ({ label, value, note, tone }) => (
  <div className={`figure${tone ? ` figure--${tone}` : ''}`}>
    <span className="figure__label">{label}</span>
    <strong className="figure__value">{value}</strong>
    <span className="figure__note">{note}</span>
  </div>
)

function Bars({ daily }) {
  const max = Math.max(...daily.map((d) => d.amount), 1)
  const total = daily.reduce((s, d) => s + d.amount, 0)
  return (
    <figure className="bars">
      <div className="bars__plot" role="img" aria-label={`${money(total)} collected in the last 30 days`}>
        {daily.map((d) => (
          <span key={d.date} style={{ '--h': d.amount / max }} title={`${fmtDate(d.date)}: ${money(d.amount)}`} />
        ))}
      </div>
      <figcaption>
        <span>{fmtDate(daily[0].date, { day: 'numeric', month: 'short' })}</span>
        <strong>{money(total)}</strong>
        <span>Today</span>
      </figcaption>
    </figure>
  )
}

/* The one loud element: a live countdown to the next dated session, and a
   track from today to the furthest scheduled date with every session on it. */
function SessionClock({ courses, byCourse }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const dated = courses.filter((c) => c.startsAt).map((c) => ({ ...c, start: +new Date(c.startsAt), end: +new Date(c.endsAt ?? c.startsAt) }))
  const next = dated.filter((c) => c.end >= now).sort((a, b) => a.start - b.start)[0]

  if (!next) {
    return (
      <section className="clock clock--idle">
        <p>No upcoming session has a date.</p>
        <a className="btn btn--light" href="#programs">Set the next session date</a>
      </section>
    )
  }

  const live = next.start <= now
  const left = Math.max(0, next.start - now)
  const parts = [
    [Math.floor(left / 864e5), 'days'],
    [Math.floor(left / 36e5) % 24, 'hours'],
    [Math.floor(left / 6e4) % 60, 'minutes'],
    [Math.floor(left / 1e3) % 60, 'seconds'],
  ]
  const seats = byCourse.find((c) => c.courseId === next.id)?.count ?? 0
  const upcoming = dated.filter((c) => c.end >= now)
  const horizon = Math.max(...upcoming.map((c) => c.start), now + 864e5)
  const at = (t) => `${Math.min(100, Math.max(0, ((t - now) / (horizon - now)) * 100))}%`

  return (
    <section className="clock" aria-label="Next session">
      <div className="clock__info">
        <span className="clock__kicker">{live ? 'Happening now' : 'Next session'}</span>
        <h2>{next.name}</h2>
        <p>
          {fmtDate(next.startsAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {next.endsAt && `, ${fmtDate(next.startsAt, { hour: 'numeric', minute: '2-digit' })} to ${fmtDate(next.endsAt, { hour: 'numeric', minute: '2-digit' })} IST`}
          {next.language && ` in ${next.language}`}
        </p>
        <p className="clock__seats"><strong>{seats}</strong> paid {seats === 1 ? 'seat' : 'seats'} so far</p>
      </div>
      <div className="clock__count" aria-live="off">
        {live ? (
          <span className="clock__live">Live</span>
        ) : (
          parts.map(([n, unit]) => (
            <div key={unit}>
              <strong>{String(n).padStart(2, '0')}</strong>
              <span>{unit}</span>
            </div>
          ))
        )}
      </div>
      <div className="clock__track" aria-hidden="true">
        <span className="clock__today" style={{ left: 0 }}>Today</span>
        {upcoming.map((c) => (
          <span key={`${c.id}-${c.startsAt}`} className={`clock__mark${c === next ? ' is-next' : ''}`} style={{ left: at(c.start) }}>
            <i />
            <em>{fmtDate(c.startsAt, { day: 'numeric', month: 'short' })}</em>
          </span>
        ))}
      </div>
    </section>
  )
}
