import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { api, fmtDate, fmtDateTime } from '../api.js'
import { confirmAction, Drawer, ErrorNote, Field, toast } from '../ui.jsx'

export default function Team({ me }) {
  const [admins, setAdmins] = useState(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const load = () => api('/admins').then(setAdmins, (e) => setError(e.message))
  useEffect(() => { load() }, [])

  async function remove(a) {
    if (!await confirmAction({ title: `Remove ${a.name || a.email}?`, text: 'They lose access to the admin and are signed out straight away.', confirmText: 'Remove admin' })) return
    setError('')
    try { await api(`/admins/${a.id}`, { method: 'DELETE' }); toast(`${a.email} removed`); load() }
    catch (e) { setError(e.message) }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Team</h1>
          <p>Everyone here can manage programs, payments and settings.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
          <UserPlus size={16} aria-hidden="true" /> Add admin
        </button>
      </header>
      <ErrorNote>{error}</ErrorNote>
      <section className="panel panel--flush">
        {!admins ? <div className="loading" aria-busy="true">Loading team…</div> : (
          <div className="table-wrap">
            <table className="table table--rows">
              <thead><tr><th>Admin</th><th>Added</th><th>Last sign-in</th><th /></tr></thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.name || a.email}</strong>{a.name && <small>{a.email}</small>}</td>
                    <td className="nowrap">{fmtDate(a.createdAt)}</td>
                    <td className="nowrap">{a.lastLoginAt ? fmtDateTime(a.lastLoginAt) : <span className="muted">Never</span>}</td>
                    <td className="num">
                      {a.id === me.id ? <span className="pill pill--neutral">You</span> : (
                        <button type="button" className="btn btn--sm btn--danger" onClick={() => remove(a)} disabled={admins.length <= 1}>Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <AddAdmin open={adding} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load() }} />
    </>
  )
}

function AddAdmin({ open, onClose, onSaved }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setError('') }, [open])

  async function save(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true); setError('')
    try {
      await api('/admins', { method: 'POST', body: { email: f.get('email'), name: f.get('name'), password: f.get('password') } })
      toast(`${f.get('email')} can now sign in`)
      onSaved()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <Drawer
      open={open}
      title="Add admin"
      subtitle="Share the starting password with them privately; they can change it under My account."
      onClose={onClose}
      footer={(
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="admin-form" className="btn btn--primary" disabled={busy}>{busy ? 'Adding…' : 'Add admin'}</button>
        </>
      )}
    >
      <form id="admin-form" className="form-grid" onSubmit={save} autoComplete="off">
        <Field label="Name" wide><input name="name" maxLength={120} /></Field>
        <Field label="Email" wide><input name="email" type="email" required /></Field>
        <Field label="Starting password" hint="At least 10 characters." wide>
          <input name="password" type="password" minLength={10} required autoComplete="new-password" />
        </Field>
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Drawer>
  )
}
