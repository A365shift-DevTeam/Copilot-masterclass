import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Eye, GripVertical, History, Lock, Pencil, Plus, RotateCcw, Send, Trash2 } from 'lucide-react'
import { api, fmtDateTime } from '../api.js'
import { confirmAction, Drawer, ErrorNote, Field, toast } from '../ui.jsx'
import ContentForm from './ContentForm.jsx'

/* The website's sections: which show, in what order. Every change is saved to the draft at once;
   visitors see it only after Publish. Preview opens the website with the draft. */
export default function Website({ me }) {
  const [page, setPage] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [history, setHistory] = useState(null) // null closed, [] open
  const [dragId, setDragId] = useState(null)
  const [editId, setEditId] = useState(null) // the section (or shared block) open in the editor
  const [adding, setAdding] = useState(false)

  const load = () => api('/website').then((p) => { setPage(p); setError('') }, (e) => setError(e.message))
  useEffect(() => { load() }, [])

  // Every save carries the version it was made from; someone else's newer save wins and this screen reloads.
  async function send(path, body, done) {
    setBusy(true)
    try {
      const reply = await api(path, { method: path === '/website/layout' ? 'PUT' : 'POST', body: { version: page.version, ...body } })
      setPage(reply.page ?? reply)
      if (reply.added) setEditId(reply.added)
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

  async function remove(s) {
    if (!await confirmAction({ title: `Remove ${s.label}?`, text: 'It comes off the draft now and off the website when you publish. You can add it back from "Add section".', confirmText: 'Remove section' })) return
    setBusy(true)
    try { setPage(await api(`/website/sections/${encodeURIComponent(s.id)}?version=${page.version}`, { method: 'DELETE' })); toast(`${s.label} removed from the draft`) }
    catch (e) { toast(e.message, 'bad'); load() }
    finally { setBusy(false) }
  }

  const typeOf = (t) => page.types.find((x) => x.type === t)
  const editing = page && [...page.sections, ...page.shared].find((s) => s.id === editId)

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
              {s.editable && <button type="button" className="btn btn--sm" onClick={() => setEditId(s.id)}><Pencil size={14} aria-hidden="true" /> Edit</button>}
              {typeOf(s.type)?.repeatable && <button type="button" className="icon-btn" disabled={busy} onClick={() => send('/website/sections', { type: s.type, after: s.id, copyOf: s.id }, `Copy of ${s.label} added`)} aria-label={`Duplicate ${s.label}`} title="Duplicate"><Copy size={16} /></button>}
              {!s.alwaysOn && <button type="button" className="icon-btn" disabled={busy} onClick={() => remove(s)} aria-label={`Remove ${s.label}`} title="Remove"><Trash2 size={16} /></button>}
              <button type="button" className="icon-btn" onClick={() => move(i, i - 1)} disabled={!canGo(i, -1) || busy} aria-label={`Move ${s.label} up`}><ArrowUp size={16} /></button>
              <button type="button" className="icon-btn" onClick={() => move(i, i + 1)} disabled={!canGo(i, 1) || busy} aria-label={`Move ${s.label} down`}><ArrowDown size={16} /></button>
            </div>
          </li>
        ))}
      </ol>
      <div className="website__add">
        <button type="button" className="btn btn--sm" onClick={() => setAdding(true)} disabled={busy || !page.types.some((t) => t.canAdd)}><Plus size={14} aria-hidden="true" /> Add section</button>
      </div>

      {page.shared.length > 0 && (
        <>
          <div className="panel__head panel__head--pad website__subhead">
            <div>
              <h3>Site-wide content</h3>
              <span className="muted">Used by several sections at once, whether or not those sections are shown.</span>
            </div>
          </div>
          <ul className="programs website website--shared">
            {page.shared.map((s) => (
              <li key={s.id}>
                <span className="website__grip" aria-hidden="true" />
                <div className="programs__name"><strong>{s.label}{s.changed && <span className="website__dot" title="Changed since the last publish" aria-label="changed" />}</strong></div>
                <span />
                <div className="programs__actions"><button type="button" className="btn btn--sm" onClick={() => setEditId(s.id)}><Pencil size={14} aria-hidden="true" /> Edit</button></div>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionEditor section={editing} fields={editing && typeOf(editing.type)?.fields} onClose={() => setEditId(null)}
        onSaved={(state) => setPage(state)} onConflict={load} />

      <Drawer open={adding} title="Add a section" subtitle="It goes in before the footer, shown, with its starting content. Move it where you want it." onClose={() => setAdding(false)}>
        <ul className="website__history">
          {page.types.filter((t) => t.canAdd).map((t) => (
            <li key={t.type}>
              <div><strong>{t.label}</strong>{t.repeatable && <span className="muted">Can appear more than once</span>}</div>
              <button type="button" className="btn btn--sm" disabled={busy} onClick={async () => { if (await send('/website/sections', { type: t.type }, `${t.label} added`)) setAdding(false) }}>Add</button>
            </li>
          ))}
        </ul>
      </Drawer>

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
  const changed = [...page.sections, ...page.shared].filter((s) => s.changed)
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
            {changed.map((s) => <li key={s.id}>{s.label}: {s.visible !== s.live ? (s.visible ? 'shown' : 'hidden') : 'edited or moved'}</li>)}
          </ul>
        </div>
        <Field label="Note for the history (optional)" wide hint="e.g. Hid the FAQ for the Christmas sale.">
          <input value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={200} />
        </Field>
      </form>
    </Drawer>
  )
}

/* One section's content. Saves to the draft by itself a few seconds after you stop typing, one save at
   a time; each save carries the section's revision, so someone else's edit to it is never overwritten. */
function SectionEditor({ section, fields, onClose, onSaved, onConflict }) {
  const [value, setValue] = useState(null)
  const [state, setState] = useState('saved') // saved | dirty | saving | error
  const [error, setError] = useState('')
  const rev = useRef(0)
  const saved = useRef('')
  const inflight = useRef(null)
  const latest = useRef(null)
  latest.current = value

  // A different section opened: start from its content. (Not on every reply, or typing during a save would be lost.)
  useEffect(() => {
    if (!section) { setValue(null); return }
    setValue(section.content); rev.current = section.rev; saved.current = JSON.stringify(section.content)
    setState('saved'); setError('')
  }, [section?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (inflight.current) return inflight.current
    const sending = latest.current
    if (!sending || JSON.stringify(sending) === saved.current) return undefined
    setState('saving')
    inflight.current = (async () => {
      try {
        const page = await api(`/website/sections/${encodeURIComponent(section.id)}`, { method: 'PUT', body: { rev: rev.current, content: sending } })
        const mine = [...page.sections, ...page.shared].find((s) => s.id === section.id)
        rev.current = mine.rev
        saved.current = JSON.stringify(sending)
        onSaved(page)
        setError('')
        setState(JSON.stringify(latest.current) === saved.current ? 'saved' : 'dirty')
      } catch (e) {
        setError(e.message); setState('error')
        if (/someone else changed/i.test(e.message)) onConflict()
      } finally {
        inflight.current = null
      }
    })()
    return inflight.current
  }

  useEffect(() => {
    if (!value || JSON.stringify(value) === saved.current) return undefined
    setState((st) => (st === 'saving' ? st : 'dirty'))
    const t = setTimeout(save, 2500)
    return () => clearTimeout(t)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  async function close() {
    if (JSON.stringify(latest.current) !== saved.current) {
      await save()
      if (JSON.stringify(latest.current) !== saved.current
        && !await confirmAction({ title: 'Close without saving?', text: 'Your last edits could not be saved and will be lost.', confirmText: 'Close anyway' })) return
    }
    onClose()
  }

  const label = { saved: 'All changes saved to the draft', dirty: 'Unsaved changes…', saving: 'Saving…', error: 'Not saved' }[state]
  return (
    <Drawer open={!!section && !!value} title={section ? `Edit ${section.label}` : ''} subtitle="Saved to the draft as you type. Visitors see it after you publish." onClose={close}
      footer={<>
        <span className={`website__save website__save--${state}`} role="status">{label}</span>
        <span className="spacer" />
        <button type="button" className="btn" onClick={save} disabled={state === 'saved' || state === 'saving'}>Save now</button>
        <button type="button" className="btn btn--primary" onClick={close}>Done</button>
      </>}>
      <ErrorNote>{error}</ErrorNote>
      {value && fields && <ContentForm fields={fields} value={value} onChange={setValue} />}
    </Drawer>
  )
}
