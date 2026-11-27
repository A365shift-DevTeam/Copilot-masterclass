import { useEffect, useState } from 'react'
import { Copy, PlugZap, RefreshCw } from 'lucide-react'
import { api, fmtDateTime } from '../api.js'
import { confirmAction, ErrorNote, Field, toast } from '../ui.jsx'

const SOURCE = { admin: 'saved here', config: 'from appsettings / server environment' }

export default function Settings() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = () => api('/settings').then(setData, (e) => setError(e.message))
  useEffect(() => { load() }, [])

  if (error && !data) return <ErrorNote>{error}</ErrorNote>
  if (!data) return <div className="loading" aria-busy="true">Loading settings…</div>

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Site links and the Razorpay connection.</p>
        </div>
      </header>
      <div className="split split--even">
        <RazorpayKeys rz={data.razorpay} onSaved={load} />
        <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
          <Webhook rz={data.razorpay} />
          <Sync rz={data.razorpay} />
          <SiteLinks whatsappUrl={data.whatsappUrl} onSaved={load} />
        </div>
      </div>
    </>
  )
}

function RazorpayKeys({ rz, onSaved }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn, done) {
    setBusy(true); setError('')
    try { await fn(); if (done) toast(done) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const save = (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const body = { keyId: f.get('keyId'), keySecret: f.get('keySecret'), webhookSecret: f.get('webhookSecret'), clear: false }
    run(async () => { await api('/settings/razorpay', { method: 'PUT', body }); e.target.reset(); await onSaved() }, 'Razorpay keys saved.')
  }
  const test = () => run(async () => {
    const r = await api('/razorpay/test', { method: 'POST' })
    toast(`Connected to Razorpay in ${r.mode} mode`)
  }, '')
  const clear = async () => {
    if (!await confirmAction({ title: 'Remove the saved Razorpay keys?', text: 'Webhooks and sync stop working unless the keys are also set in appsettings.', confirmText: 'Remove keys' })) return
    run(async () => { await api('/settings/razorpay', { method: 'PUT', body: { clear: true } }); await onSaved() }, 'Saved keys removed.')
  }

  const status = (set, source) => set ? `Set, ${SOURCE[source]}` : 'Not set'

  return (
    <section className="panel">
      <div className="panel__head"><h2>Razorpay API keys</h2></div>
      <p className="muted">From Razorpay Dashboard &gt; Account &amp; Settings &gt; API Keys. Secrets are stored encrypted and are never shown again; leave a field empty to keep what is saved.</p>
      <dl className="kv">
        <dt>Key ID</dt><dd>{rz.keyId ? `${rz.keyId} (${SOURCE[rz.keyIdSource]})` : 'Not set'}</dd>
        <dt>Key Secret</dt><dd>{status(rz.keySecretSet, rz.keySecretSource)}</dd>
        <dt>Webhook Secret</dt><dd>{status(rz.webhookSecretSet, rz.webhookSecretSource)}</dd>
      </dl>
      <form className="form-grid" onSubmit={save} autoComplete="off">
        <Field label="Key ID" hint="Starts with rzp_live_ or rzp_test_." wide>
          <input name="keyId" placeholder={rz.keyId ?? 'rzp_live_…'} pattern="rzp_.*" spellCheck="false" />
        </Field>
        <Field label="Key Secret" wide>
          <input name="keySecret" type="password" placeholder={rz.keySecretSet ? '•••••••• saved' : ''} autoComplete="new-password" />
        </Field>
        <Field label="Webhook Secret" hint="The secret you typed when creating the webhook in Razorpay." wide>
          <input name="webhookSecret" type="password" placeholder={rz.webhookSecretSet ? '•••••••• saved' : ''} autoComplete="new-password" />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="field--wide page-head__actions">
          <button className="btn btn--primary" disabled={busy}>Save keys</button>
          <button type="button" className="btn" onClick={test} disabled={busy || !rz.keyId || !rz.keySecretSet}>
            <PlugZap size={16} aria-hidden="true" /> Test connection
          </button>
          {(rz.keyIdSource === 'admin' || rz.keySecretSource === 'admin' || rz.webhookSecretSource === 'admin') && (
            <button type="button" className="btn btn--danger" onClick={clear} disabled={busy}>Remove saved keys</button>
          )}
        </div>
      </form>
    </section>
  )
}

function Webhook({ rz }) {
  const url = `${window.location.origin}${rz.webhookPath}`
  const [copied, setCopied] = useState(false)
  const copy = () => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Webhook</h2>
        <span className={`pill ${rz.lastWebhookAt ? 'pill--paid' : 'pill--neutral'}`}>
          {rz.lastWebhookAt ? `Last payment ${fmtDateTime(rz.lastWebhookAt)}` : 'No payments received yet'}
        </span>
      </div>
      <ol className="steps">
        <li>In Razorpay, open <strong>Account &amp; Settings &gt; Webhooks</strong> and add a webhook.</li>
        <li>Paste this URL. If this admin is not on the API's public address, use that host instead.</li>
      </ol>
      <div className="copy">
        <input readOnly value={url} aria-label="Webhook URL" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn" onClick={copy}><Copy size={15} aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}</button>
      </div>
      <ol className="steps" start={3}>
        <li>Choose a secret, type it there and save the same value as <strong>Webhook Secret</strong> here.</li>
        <li>Tick <strong>payment.captured</strong>, <strong>payment.failed</strong> and <strong>refund.processed</strong>.</li>
      </ol>
    </section>
  )
}

function Sync({ rz }) {
  const [days, setDays] = useState(7)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async () => {
    setBusy(true); setError('')
    try {
      const r = await api('/razorpay/sync', { method: 'POST', body: { days: +days } })
      toast(`Synced ${r.seen} payments: ${r.created} new, ${r.updated} updated`)
    }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return (
    <section className="panel">
      <h2>Sync from Razorpay</h2>
      <p className="muted">Pulls payments the webhook missed, for example from before it was set up. Running it twice never duplicates a payment.</p>
      <div className="toolbar">
        <select value={days} onChange={(e) => setDays(e.target.value)} aria-label="How far back">
          {[1, 7, 30, 90].map((d) => <option key={d} value={d}>Last {d} {d === 1 ? 'day' : 'days'}</option>)}
        </select>
        <button type="button" className="btn btn--primary" onClick={run} disabled={busy || !rz.keyId || !rz.keySecretSet}>
          <RefreshCw size={16} aria-hidden="true" /> {busy ? 'Syncing…' : 'Sync now'}
        </button>
      </div>
      {!rz.keySecretSet && <p className="muted">Save the Key ID and Key Secret to sync.</p>}
      <ErrorNote>{error}</ErrorNote>
    </section>
  )
}

function SiteLinks({ whatsappUrl, onSaved }) {
  const [value, setValue] = useState(whatsappUrl ?? '')
  const [error, setError] = useState('')
  const save = async (e) => {
    e.preventDefault()
    setError('')
    try { await api('/settings/site', { method: 'PUT', body: { whatsappUrl: value } }); toast('WhatsApp link saved'); onSaved() }
    catch (err) { setError(err.message) }
  }
  return (
    <section className="panel">
      <h2>Site links</h2>
      <form className="form-grid" onSubmit={save}>
        <Field label="WhatsApp community link" hint="Where the thank-you page sends people after they pay. Leave empty to use the link built into the site." wide>
          <input type="url" value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://chat.whatsapp.com/…" pattern="https://.*" />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="field--wide"><button className="btn btn--primary">Save link</button></div>
      </form>
    </section>
  )
}
