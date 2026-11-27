import { useState } from 'react'
import { api } from '../api.js'
import { ErrorNote, Field, toast } from '../ui.jsx'

export default function Account() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setError('')
    if (f.get('next') !== f.get('confirm')) return setError('The two new passwords are different.')
    setBusy(true)
    try {
      await api('/auth/password', { method: 'POST', body: { current: f.get('current'), next: f.get('next') } })
      e.target.reset()
      toast('Password changed. Your other sessions are signed out.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="page-head"><h1>Account</h1></header>
      <section className="panel panel--narrow">
        <h2>Change password</h2>
        <form className="form-grid" onSubmit={save}>
          <Field label="Current password" wide><input name="current" type="password" autoComplete="current-password" required /></Field>
          <Field label="New password" hint="At least 10 characters." wide><input name="next" type="password" autoComplete="new-password" minLength={10} required /></Field>
          <Field label="Repeat new password" wide><input name="confirm" type="password" autoComplete="new-password" minLength={10} required /></Field>
          <ErrorNote>{error}</ErrorNote>
          <div className="field--wide"><button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button></div>
        </form>
      </section>
    </>
  )
}
