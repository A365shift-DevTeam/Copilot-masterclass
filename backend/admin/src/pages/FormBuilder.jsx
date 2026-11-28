import { useEffect, useState } from 'react'
import {
  AlignLeft, ArrowDown, ArrowUp, Calendar, CheckSquare, ChevronDownSquare, CircleDot, Hash, Lock, Mail, Phone, Plus, Trash2, Type,
} from 'lucide-react'
import { api } from '../api.js'
import { Drawer, ErrorNote, toast } from '../ui.jsx'

// Same types the API accepts (Checkout.Types).
const TYPES = [
  { id: 'text', label: 'Short text', icon: Type },
  { id: 'textarea', label: 'Long text', icon: AlignLeft },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'number', label: 'Number', icon: Hash },
  { id: 'date', label: 'Date', icon: Calendar },
  { id: 'select', label: 'Dropdown', icon: ChevronDownSquare },
  { id: 'radio', label: 'Single choice', icon: CircleDot },
  { id: 'checkbox', label: 'Multiple choice', icon: CheckSquare },
]
const typeOf = (id) => TYPES.find((t) => t.id === id) ?? TYPES[0]
const hasOptions = (type) => ['select', 'radio', 'checkbox'].includes(type)
// Name and email fill the payment's customer; they always stay, and stay required.
const LOCKED = ['name', 'email']
// A field's key is made once and never changes, so its answers stay together if it's renamed.
const newKey = () => `f_${Math.random().toString(36).slice(2, 8)}`

export default function FormBuilder({ course, onClose }) {
  const [fields, setFields] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!course) return setFields(null)
    setError('')
    api(`/courses/${course.id}/form`).then((f) => {
      // Choices are edited as one per line.
      setFields(f.fields.map((x) => ({ ...x, placeholder: x.placeholder ?? '', optionsText: (x.options ?? []).join('\n') })))
    }, (e) => setError(e.message))
  }, [course])

  const update = (i, patch) => setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const move = (i, d) => setFields((fs) => { const n = [...fs]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n })
  const remove = (i) => setFields((fs) => fs.filter((_, j) => j !== i))
  const add = (type) => setFields((fs) => [...fs, {
    key: newKey(), label: typeOf(type).label, type, required: false, placeholder: '',
    optionsText: hasOptions(type) ? 'Option 1\nOption 2' : '',
  }])

  async function save() {
    setBusy(true)
    setError('')
    try {
      const body = {
        fields: fields.map(({ optionsText, ...f }) => ({
          ...f, placeholder: f.placeholder || null,
          options: hasOptions(f.type) ? optionsText.split('\n').map((o) => o.trim()).filter(Boolean) : null,
        })),
      }
      await api(`/courses/${course.id}/form`, { method: 'PUT', body })
      toast(`Registration form saved for ${course.cardTitle || course.name}`)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={!!course && !!fields}
      title={`Registration form: ${course?.cardTitle || course?.name || ''}`}
      subtitle="What visitors fill in before paying. Every answer is saved with their payment."
      onClose={onClose}
      footer={fields && (
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save form'}</button>
        </>
      )}
    >
      {fields && (
        <div className="fb">
          <p className={course?.paymentUrl && !course.formFirst ? 'notice' : 'muted'}>
            {!course?.paymentUrl
              ? 'Register opens this form, then Razorpay. Every answer is saved with the payment.'
              : course.formFirst
                ? 'Register opens this form, then the card\u2019s payment link. Answers show in Registrations.'
                : 'This card has a payment link, so its button opens that link and this form isn\u2019t shown. Turn on \u201cShow form, then go to payment link\u201d (Edit) to use it.'}
          </p>

          <ol className="fb__list">
            {fields.map((f, i) => {
              const T = typeOf(f.type)
              const locked = LOCKED.includes(f.key)
              const builtIn = locked || f.key === 'phone'
              return (
                <li key={f.key} className="fb__field">
                  <div className="fb__head">
                    <span className="fb__type"><T.icon size={15} aria-hidden="true" />{T.label}{builtIn && <Lock size={12} aria-label="Built-in field" />}</span>
                    <span className="programs__actions">
                      <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${f.label} up`}><ArrowUp size={16} /></button>
                      <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label={`Move ${f.label} down`}><ArrowDown size={16} /></button>
                      <button type="button" className="icon-btn" onClick={() => remove(i)} disabled={locked} aria-label={`Remove ${f.label}`} title={locked ? 'Name and email are always asked' : 'Remove'}><Trash2 size={16} /></button>
                    </span>
                  </div>
                  <div className="fb__grid">
                    <label className="field">
                      <span className="field__label">Question</span>
                      <input value={f.label} onChange={(e) => update(i, { label: e.target.value })} maxLength={120} required />
                    </label>
                    <label className="field">
                      <span className="field__label">Type</span>
                      <select value={f.type} onChange={(e) => update(i, { type: e.target.value, optionsText: hasOptions(e.target.value) && !f.optionsText ? 'Option 1\nOption 2' : f.optionsText })} disabled={builtIn}>
                        {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </label>
                    {hasOptions(f.type) ? (
                      <label className="field field--wide">
                        <span className="field__label">Choices, one per line</span>
                        <textarea rows={Math.min(8, Math.max(3, f.optionsText.split('\n').length))} value={f.optionsText} onChange={(e) => update(i, { optionsText: e.target.value })} />
                      </label>
                    ) : (
                      <label className="field field--wide">
                        <span className="field__label">Hint inside the box (optional)</span>
                        <input value={f.placeholder} onChange={(e) => update(i, { placeholder: e.target.value })} maxLength={120} />
                      </label>
                    )}
                    <label className="toggle field--wide">
                      <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} disabled={locked} />
                      <span>Required</span>
                    </label>
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="fb__add">
            <span className="field__label">Add a question</span>
            <div className="chips">
              {TYPES.map((t) => (
                <button key={t.id} type="button" className="chip" onClick={() => add(t.id)}><Plus size={13} aria-hidden="true" /> {t.label}</button>
              ))}
            </div>
          </div>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Drawer>
  )
}
