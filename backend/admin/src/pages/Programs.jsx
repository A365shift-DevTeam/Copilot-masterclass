import { useEffect, useState } from 'react'
import { Bot, CalendarCheck, CirclePlay, Download, ExternalLink, FileText, Gem, Image, Layers, MonitorPlay, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, fmtDateTime, money } from '../api.js'
import { confirmAction, Drawer, ErrorNote, Field, toast } from '../ui.jsx'
import FormBuilder from './FormBuilder.jsx'
import HeroDates from './HeroDates.jsx'

// The Pricing section's tabs, in order (PRICE_LADDER in frontend/src/data/content.js).
// name/blurb are the site's own wording, used until a tab is renamed here.
export const TABS = [
  { id: 'once', name: 'One-time access', blurb: 'A single session. Pay once, no commitment.' },
  { id: 'single', name: 'Individual programs', blurb: 'Go deep on one app. 30 days of access each.' },
  { id: 'bundle', name: 'Skill bundles', blurb: 'Several related skills, taught together.' },
  { id: 'master', name: 'Complete packages', blurb: 'Microsoft 365 apps, end to end.' },
]

// Same choices the API accepts (Cards in Program.cs) and the site can draw (PriceLadder.jsx).
const ICONS = [
  ['monitor-play', MonitorPlay, 'Live session'], ['circle-play', CirclePlay, 'Video'], ['image', Image, 'Image'],
  ['calendar-check', CalendarCheck, 'Schedule'], ['bot', Bot, 'Agent'], ['layers', Layers, 'Package'], ['gem', Gem, 'Premium'],
]
const APPS = ['excel', 'word', 'powerpoint', 'outlook', 'teams', 'sharepoint', 'onenote', 'onedrive', 'forms', 'planner']
const appLogo = (a) => `https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/microsoft-365/${a}.svg`


function Row({ c, onEdit, onDelete, onForm, showDate = true }) {
  return (
    <li className={c.isVisible ? '' : 'is-hidden'}>
      <div className="programs__name">
        <strong>{c.cardTitle && !showDate ? c.cardTitle : c.name}</strong>
        <span>{c.isVisible ? 'Shown on site' : 'Hidden from site'}{c.isFeatured && !showDate ? ', Most popular' : ''}</span>
      </div>
      <div className="programs__when"><span>{c.duration}</span></div>
      <div className="programs__price">
        <strong>{money(c.price)}</strong>
        {c.listPrice && <s>{money(c.listPrice)}</s>}
      </div>
      {c.paymentUrl ? (
        <a className="programs__link" href={c.paymentUrl} target="_blank" rel="noopener noreferrer" title={c.paymentUrl}>
          {new URL(c.paymentUrl).host} <ExternalLink size={14} aria-hidden="true" />
        </a>
      ) : (
        // No link: the website takes the registration and payment itself.
        <span className="pill pill--paid" title="Register opens this card's form, then Razorpay">Form + Razorpay</span>
      )}
      <div className="programs__actions">
        {/* Everyone who paid for this program, e.g. to send the joining link. */}
        <a className="btn btn--sm" href={`/api/payments/export?courseId=${c.id}&status=Paid`} download title={`Download everyone who paid for ${c.name}`}>
          <Download size={14} aria-hidden="true" /> Paid list
        </a>
        {onForm && (
          <button type="button" className="btn btn--sm" onClick={() => onForm(c)} aria-label={`Registration form for ${c.name}`}>
            <FileText size={14} aria-hidden="true" /> Form
          </button>
        )}
        <button type="button" className="btn btn--sm" onClick={() => onEdit(c)} aria-label={`Edit ${c.name}`}>
          <Pencil size={14} aria-hidden="true" /> Edit
        </button>
        {onDelete && c.kind === 'ladder' && (
          <button type="button" className="icon-btn" onClick={() => onDelete(c)} aria-label={`Delete ${c.name}`} title="Delete"><Trash2 size={16} /></button>
        )}
      </div>
    </li>
  )
}

export default function Programs() {
  const [courses, setCourses] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [tabs, setTabs] = useState(TABS)
  const [editingTab, setEditingTab] = useState(null)
  const [formFor, setFormFor] = useState(null)
  const [keysSet, setKeysSet] = useState(true) // Razorpay keys saved: cards without a payment link can take payment
  const load = () => api('/courses').then(setCourses, (e) => setError(e.message))
  useEffect(() => { api('/settings').then((s) => setKeysSet(!!s.razorpay.keyId && s.razorpay.keySecretSet), () => {}) }, [])
  const loadTabs = () => api('/pricing-tabs').then((saved) => setTabs(TABS.map((t) => {
    const s = saved.find((x) => x.id === t.id)
    return { ...t, name: s?.name || t.name, blurb: s?.blurb ?? t.blurb }
  })), (e) => setError(e.message))
  useEffect(() => { loadTabs() }, [])
  useEffect(() => { load() }, [])

  async function remove(c) {
    if (!await confirmAction({ title: `Delete "${c.cardTitle || c.name}"?`, text: 'The card is removed from the Pricing section on the website.', confirmText: 'Delete card' })) return
    try { await api(`/courses/${c.id}`, { method: 'DELETE' }); toast(`${c.name} deleted`); load() }
    catch (e) { toast(e.message, 'bad') }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Pricing</h1>
          <p>Every card in the website's Pricing section: names, prices, payment links and the webinar date. The website shows a change on its next load.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing({ kind: 'ladder', isNew: true })}>
          <Plus size={16} aria-hidden="true" /> Add pricing card
        </button>
      </header>
      <ErrorNote>{error}</ErrorNote>
      <HeroDates />
      {!courses ? (
        <div className="loading" aria-busy="true">Loading programs…</div>
      ) : (
        <>
          <section className="panel panel--flush">
            <div className="panel__head panel__head--pad">
              <h2>Pricing section</h2>
              <span className="muted">Grouped by tab, in the order shown on the site.</span>
            </div>
            {tabs.map((t) => {
              const cards = courses.filter((c) => c.category === t.id).sort((a, b) => a.sortOrder - b.sortOrder)
              return (
                <div key={t.id}>
                  <div className="programs__tab">
                    <span>
                      <strong>{t.name} <span className="programs__tab-count">{cards.length} {cards.length === 1 ? 'card' : 'cards'}</span></strong>
                      <small>{t.blurb}</small>
                    </span>
                    <span className="programs__actions">
                      <button type="button" className="btn btn--sm" onClick={() => setEditingTab(t)}>
                        <Pencil size={14} aria-hidden="true" /> Edit tab
                      </button>
                      <button type="button" className="btn btn--sm" onClick={() => setEditing({ kind: 'ladder', isNew: true, category: t.id })}>
                        <Plus size={14} aria-hidden="true" /> Add card
                      </button>
                    </span>
                  </div>
                  {cards.length === 0 ? <p className="programs__none">No cards; this tab is hidden on the site.</p> : (
                    <ul className="programs">
                      {cards.map((c) => <Row key={c.id} c={c} onEdit={setEditing} onDelete={remove} onForm={setFormFor} showDate={false} />)}
                    </ul>
                  )}
                </div>
              )
            })}
          </section>
        </>
      )}
      <FormBuilder course={formFor} onClose={() => { setFormFor(null); load() }} />
      <TabForm tab={editingTab} onClose={() => setEditingTab(null)} onSaved={() => { setEditingTab(null); loadTabs() }} />
      <CourseForm keysSet={keysSet} tabs={tabs} course={editing} courses={courses ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
    </>
  )
}

function TabForm({ tab, onClose, onSaved }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { if (tab) { setForm({ name: tab.name, blurb: tab.blurb ?? '' }); setError('') } }, [tab])

  async function save(e) {
    e.preventDefault()
    try {
      await api(`/pricing-tabs/${tab.id}`, { method: 'PUT', body: form })
      toast(`Tab renamed to ${form.name}`)
      onSaved()
    } catch (err) { setError(err.message) }
  }

  return (
    <Drawer
      open={!!tab && !!form}
      title="Edit tab"
      subtitle="The tab's name and the line shown under the tabs when it's selected."
      onClose={onClose}
      footer={tab && form && (
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="tab-form" className="btn btn--primary">Save tab</button>
        </>
      )}
    >
      {tab && form && (
        <form id="tab-form" className="form-grid" onSubmit={save}>
          <Field label="Tab name" wide><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={40} /></Field>
          <Field label="Line under the tabs" wide><input value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} maxLength={160} /></Field>
          <ErrorNote>{error}</ErrorNote>
        </form>
      )}
    </Drawer>
  )
}

function CourseForm({ keysSet, tabs, course, courses, onClose, onSaved }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isNew = !!course?.isNew

  useEffect(() => {
    if (!course) return
    setForm({
      ...course,
      name: course.name ?? '', price: course.price ?? '', paymentUrl: course.paymentUrl ?? '', formFirst: course.formFirst ?? false,
      isVisible: course.isVisible ?? true,
      listPrice: course.listPrice ?? '', language: course.language ?? '', razorpayId: course.razorpayId ?? '',
      description: course.description ?? '', duration: course.duration ?? (isNew ? '30 days access' : ''),
      category: course.category ?? (isNew ? 'single' : ''), cardTitle: course.cardTitle ?? '', cta: course.cta ?? (isNew ? 'Enrol' : ''),
      icon: course.icon ?? (isNew ? 'bot' : ''), isFeatured: course.isFeatured ?? false, position: '',
    })
    setError('')
  }, [course]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const isWebinar = course?.key === 'webinar'
  const isLadder = course?.kind === 'ladder'
  const onPricing = form && (isLadder || form.category)
  const apps = form?.icon?.startsWith('app:') ? form.icon.slice(4).split(',').filter(Boolean) : []
  const toggleApp = (a) => {
    const next = apps.includes(a) ? apps.filter((x) => x !== a) : [...apps, a].slice(-2) // up to two logos side by side
    setForm((f) => ({ ...f, icon: next.length ? `app:${next.join(',')}` : 'bot' }))
  }
  // Put the card right after another one in its tab.
  const tabCards = form ? courses.filter((c) => c.category === form.category && c.id !== course?.id).sort((a, b) => a.sortOrder - b.sortOrder) : []

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = {
        name: form.name, price: +form.price, listPrice: form.listPrice === '' ? null : +form.listPrice,
        paymentUrl: form.paymentUrl, formFirst: form.formFirst, razorpayId: form.razorpayId, isVisible: form.isVisible,
        description: form.description, duration: form.duration,
        card: {
          category: form.category || null, cardTitle: form.cardTitle, cta: form.cta, icon: form.icon || null,
          isFeatured: form.isFeatured, position: form.position === '' ? null : +form.position,
        },
      }
      await api(isNew ? '/courses' : `/courses/${course.id}`, { method: isNew ? 'POST' : 'PUT', body })
      toast(isNew ? `${form.name} added to the Pricing section` : `${form.name} saved. The website shows it on its next load.`)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={!!course && !!form}
      title={isNew ? 'Add pricing card' : `Edit ${course?.name ?? ''}`}
      subtitle={course && (isNew ? 'It appears in the chosen tab of the Pricing section.' : `Last changed ${fmtDateTime(course.updatedAt)}`)}
      onClose={onClose}
      footer={course && form && (
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" form="course-form" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Add card' : 'Save changes'}</button>
        </>
      )}
    >
      {course && form && (
        <form id="course-form" className="form-grid" onSubmit={save}>
          <Field label={isLadder ? 'Name' : 'Name on the site'} wide><input value={form.name} onChange={set('name')} required maxLength={120} /></Field>
          <Field label="Price (₹)"><input type="number" min="0" step="1" value={form.price} onChange={set('price')} required /></Field>
          {course.kind === 'coaching' && (
            <Field label="Package price (₹)" hint="Shown struck through, with the saving worked out.">
              <input type="number" min="0" step="1" value={form.listPrice} onChange={set('listPrice')} />
            </Field>
          )}
          <Field label="Payment link (optional)" wide
            hint={form.paymentUrl.trim()
              ? (form.formFirst
                ? 'The card\u2019s button opens its registration form (Form button), then this link.'
                : 'The card\u2019s button opens this link. Clear it to take registration and payment on the website instead.')
              : 'Empty: the button opens this card\u2019s registration form (Form button), then Razorpay.'}>
            <input type="url" value={form.paymentUrl} onChange={set('paymentUrl')} pattern="https://.*" placeholder="https://… or leave empty" />
          </Field>
          {form.paymentUrl.trim() && (
            <label className="toggle field--wide">
              <input type="checkbox" checked={form.formFirst} onChange={set('formFirst')} />
              <span>Show form, then go to payment link<small>Visitors fill in the form on the website, then go to the payment link. Their details show in Registrations.</small></span>
            </label>
          )}
          {!form.paymentUrl.trim() && !keysSet && (
            <p className="notice field--wide">With no payment link, this card takes payment through Razorpay, but no Razorpay keys are saved yet. Add them in Settings, or the button won’t work.</p>
          )}


          {(isLadder || course.kind === 'course') && (
            <fieldset className="field--wide date-set card-set">
              <legend>Pricing section card</legend>
              <Field label="Tab">
                <select value={form.category} onChange={set('category')} required={isLadder}>
                  {!isLadder && <option value="">Not in the Pricing section</option>}
                  {tabs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              {onPricing && (
                <>
                  <Field label="Position">
                    <select value={form.position} onChange={set('position')}>
                      <option value="">{isNew ? 'At the end' : 'Keep where it is'}</option>
                      {tabCards.map((c) => <option key={c.id} value={c.sortOrder + 0.5}>After {c.cardTitle || c.name}</option>)}
                      {tabCards[0] && <option value={tabCards[0].sortOrder - 1}>First in the tab</option>}
                    </select>
                  </Field>
                  {!isLadder && <Field label="Title on the card" hint="Leave empty to use the name."><input value={form.cardTitle} onChange={set('cardTitle')} maxLength={120} /></Field>}
                  <Field label="Button label"><input value={form.cta} onChange={set('cta')} maxLength={40} placeholder="Enrol" /></Field>
                  <Field label="What's included" wide><textarea rows={2} value={form.description} onChange={set('description')} maxLength={300} /></Field>
                  <Field label="Access line" hint="Under the price, e.g. 30 days access."><input value={form.duration} onChange={set('duration')} maxLength={60} /></Field>
                  <div className="field field--wide">
                    <span className="field__label">Icon</span>
                    <div className="icon-pick">
                      {ICONS.map(([id, Icon, label]) => (
                        <button key={id} type="button" aria-pressed={form.icon === id} onClick={() => setForm((f) => ({ ...f, icon: id }))} title={label}>
                          <Icon size={20} aria-hidden="true" /><span className="sr-only">{label}</span>
                        </button>
                      ))}
                    </div>
                    <span className="field__hint">Or Microsoft app logos (pick up to two):</span>
                    <div className="icon-pick">
                      {APPS.map((a) => (
                        <button key={a} type="button" aria-pressed={apps.includes(a)} onClick={() => toggleApp(a)} title={a}>
                          <img src={appLogo(a)} alt={a} width="22" height="22" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="toggle field--wide">
                    <input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} />
                    <span>Most popular<small>Highlights this card with a tag.</small></span>
                  </label>
                </>
              )}
            </fieldset>
          )}

          <Field label="Razorpay page or link ID" hint="Optional, e.g. pl_N7xyz. Razorpay webhook payments carrying this ID are filed under this program; without it they match by price." wide>
            <input value={form.razorpayId} onChange={set('razorpayId')} placeholder="pl_…" />
          </Field>
          <label className="toggle field--wide">
            <input type="checkbox" checked={form.isVisible} onChange={set('isVisible')} disabled={isWebinar} />
            <span>
              Show on the site
              {isWebinar && <small>The main webinar is always shown; the hero sells it.</small>}
            </span>
          </label>
          <ErrorNote>{error}</ErrorNote>
        </form>
      )}
    </Drawer>
  )
}

