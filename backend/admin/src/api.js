// Every call goes to the same origin; the session cookie rides along.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && path !== '/auth/login') {
    window.dispatchEvent(new Event('admin:signed-out'))
    throw new Error('Your session ended. Sign in again.')
  }
  if (!res.ok) {
    const problem = await res.json().catch(() => null)
    throw new Error(problem?.detail || problem?.title || `The server answered ${res.status}. Try again.`)
  }
  return res.status === 204 ? null : res.json()
}

/* ── Formatting, all in India time and rupees ─────────────────────────────── */

const TZ = 'Asia/Kolkata'
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const money = (n) => inr.format(n ?? 0)
export const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  iso ? new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...opts }).format(new Date(iso)) : ''
export const fmtDateTime = (iso) =>
  fmtDate(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

// <input type="datetime-local"> holds a wall-clock time with no zone; ours is always IST.
export function toIstInput(iso) {
  if (!iso) return ''
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}
export const fromIstInput = (v) => (v ? `${v}:00+05:30` : null)

export const STATUSES = ['Paid', 'Pending', 'Refunded', 'Failed']
export const METHODS = ['Razorpay', 'Trym', 'UPI', 'Bank transfer', 'Cash', 'Other']
