import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, GripVertical, History, Lock, RotateCcw, Send } from 'lucide-react'
import { api, fmtDateTime } from '../api.js'
import { confirmAction, Drawer, ErrorNote, Field, toast } from '../ui.jsx'

/* The website's sections: which show, in what order. Every change is saved to the draft at once;
   visitors see it only after Publish. Preview opens the website with the draft. */
export default function Website({ me }) {
  const [page, setPage] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [history, setHistory] = useState(null) // null closed, [] open
  const [dragId, setDragId] = useState(null)

  const load = () => api('/website').then((p) => { setPage(p); setError('') }, (e) => setError(e.message))
  useEffect(() => { load() }, [])

  // Every save carries the version it was made from; someone else's newer save wins and this screen reloads.
  async function send(path, body, done) {
    setBusy(true)
    try {
      setPage(await api(path, { method: path === '/website/layout' ? 'PUT' : 'POST', body: { version: page.version, ...body } }))
      if (done) toast(done)
      return true
    } catch (e) {
      toast(e.message, 'bad')
      load()
      return false
    } finally {
      setBusy(false)
    }
  }

  const saveLayout = (sections) => {
    setPage((p) => ({ ...p, sections })) // show it now; the reply replaces it
    send('/website/layout', { sections: sections.map((s) => ({ id: s.id, visible: s.visible })) })
  }

  const toggle = (s) => saveLayout(page.sections.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)))

  // Pinned sections (navbar, footer) never move, and nothing moves past them.
  const canGo = (i, d) => {
    const j = i + d
    return !page.sections[i].pinned && j >= 0 && j < page.sections.length && !page.sections[j].pinned
  }
  const move = (from, to) => {
    if (from === to || page.sections[to]?.pinned || page.sections[from].pinned) return
    const next = [...page.sections]
    next.splice(to, 0, next.splice(from, 1)[0])
    saveLayout(next)
  }

  async function preview() {
    // Opened before the request, so the browser treats it as a click and doesn't block the tab.
    const tab = window.open('', '_blank')
    try {
      const { token } = await api('/website/preview', { method: 'POST' })
      const url = new URL(me.siteUrl || window.location.origin)
      url.searchParams.set('preview', token)
      if (tab) tab.location.href = url.toString()
      else window.open(url.toString(), '_blank')
    } catch (e) {
      tab?.close()
      toast(e.message, 'bad')
    }
  }

  async function discard() {
    if (!await confirmAction({ title: 'Discard unpublished changes?', text: 'The draft goes back to what the live website shows now.', confirmText: 'Discard changes' })) return
    send('/website/discard', {}, 'Changes discarded')
  }

  async function openHistory() {
    setHistory([])
    try { setHistory(await api('/website/history')) } catch (e) { toast(e.message, 'bad'); setHistory(null) }
  }

  async function restore(h) {
    if (!await confirmAction({ title: 'Load this version as the draft?', text: 'Your unpublished changes are replaced. Nothing goes live until you publish.', confirmText: 'Load as draft', danger: false })) return
    if (await send(`/website/history/${h.id}/restore`, {}, 'Loaded as the draft. Preview it, then publish.')) setHistory(null)
  }

  if (!page) return <section className="panel"><ErrorNote>{error}</ErrorNote>{!error && <div className="loading" aria-busy="true">Loading the website…</div>}</section>

  return (
    <section className="panel panel--flush">
      <div className="panel__head panel__head--pad website__head">
        <div>
          <h2>Website sections</h2>
          <span className="muted">
            Show, hide and reorder the website's sections. Changes are saved as a draft; visitors see them after you publish.
            {page.updatedBy && <> Last saved by {page.updatedBy}, {fmtDateTime(page.updatedAt)}.</>}
          </span>
        </div>
        <div className="website__actions">
          <button type="button" className="btn btn--sm" onClick={openHistory}><History size={14} aria-hidden="true" /> History</button>
          <button type="button" className="btn btn--sm" onClick={preview}><Eye size={14} aria-hidden="true" /> Preview</button>
          <button type="button" className="btn btn--sm" onClick={discard} disabled={!page.hasChanges || busy}><RotateCcw size={14} aria-hidden="true" /> Discard</button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setPublishing(true)} disabled={!page.hasChanges || busy}>
            <Send size={14} aria-hidden="true" /> Publish
          </button>
        </div>
      </div>
      {page.hasChanges && <p className="notice website__draft">You have unpublished changes. Preview them, then Publish to put them live.</p>}

      <ol className="programs website" aria-busy={busy}>
        {page.sections.map((s, i) => (
          <li
            key={s.id}
            className={`${s.visible ? '' : 'is-hidden'}${dragId === s.id ? ' is-dragging' : ''}`}
            draggable={!s.pinned}
            onDragStart={(e) => { setDragId(s.id); e.dataTransfer.effectAllowed = 'move' }}
            onDragOver={(e) => { if (dragId && !s.pinned) e.preventDefault() }}
            onDrop={(e) => { e.preventDefault(); move(page.sections.findIndex((x) => x.id === dragId), i); setDragId(null) }}
            onDragEnd={() => setDragId(null)}
          >
            <span className="website__grip" aria-hidden="true">{s.pinned ? <Lock size={14} /> : <GripVertical size={16} />}</span>
            <div className="programs__name">
              <strong>{s.label}{s.changed && <span className="website__dot" title="Changed since the last publish" aria-label="changed" />}</strong>
              <span>{s.pinned ? 'Always at the ' + (i === 0 ? 'top' : 'bottom') : s.anchor ? `Menu link ${s.anchor}` : 'No menu link'}{s.live ? ' · on the live site' : ' · not on the live site'}</span>
            </div>
            <label className="toggle website__toggle" title={s.alwaysOn ? 'Always shown' : undefined}>
              <input type="checkbox" checked={s.visible} disabled={s.alwaysOn || busy} onChange={() => toggle(s)} />
              <span>{s.visible ? 'Shown' : 'Hidden'}</span>
            </label>
            <div className="programs__actions">
              <button type="button" className="icon-btn" onClick={() => move(i, i - 1)} disabled={!canGo(i, -1) || busy} aria-label={`Move ${s.label} up`}><ArrowUp size={16} /></button>
              <button type="button" className="icon-btn" onClick={() => move(i, i + 1)} disabled={!canGo(i, 1) || busy} aria-label={`Move ${s.label} down`}><ArrowDown size={16} /></button>
            </div>
          </li>
        ))}
      </ol>

      <PublishForm open={publishing} page={page} onClose={() => setPublishing(false)}
        onPublish={async (summary) => { if (await send('/website/publish', { summary }, 'Published. The website shows it on its next load.')) setPublishing(false) }} />

      <Drawer open={history !== null} title="Published versions" subtitle="Load one as the draft to preview it and publish it again." onClose={() => setHistory(null)}>
        {history?.length === 0 ? <p className="muted">Nothing published from here yet.</p> : (
          <ul className="website__history">
            {history?.map((h) => (
              <li key={h.id}>
                <div>
                  <strong>{fmtDateTime(h.publishedAt)}</strong>
                  <span className="muted">{h.publishedBy}{h.summary ? ` · ${h.summary}` : ''}</span>
                </div>
                <button type="button" className="btn btn--sm" onClick={() => restore(h)} disabled={busy}>Load as draft</button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </section>
  )
}

function PublishForm({ open, page, onClose, onPublish }) {
  const [summary, setSummary] = useState('')
  useEffect(() => { if (open) setSummary('') }, [open])
  const changed = page.sections.filter((s) => s.changed)
  return (
    <Drawer open={open} title="Publish the website" subtitle="Visitors see these changes on their next page load." onClose={onClose}
      footer={<>
        <span className="spacer" />
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="submit" form="publish-form" className="btn btn--primary">Publish now</button>
      </>}>
      <form id="publish-form" className="form-grid" onSubmit={(e) => { e.preventDefault(); onPublish(summary) }}>
        <div className="field field--wide">
          <span className="field__label">What changes</span>
          <ul className="website__changes">
            {changed.map((s) => <li key={s.id}>{s.label}: {s.visible === s.live ? 'moved' : s.visible ? 'shown' : 'hidden'}</li>)}
          </ul>
        </div>
        <Field label="Note for the history (optional)" wide hint="e.g. Hid the FAQ for the Christmas sale.">
          <input value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={200} />
        </Field>
      </form>
    </Drawer>
  )
}
