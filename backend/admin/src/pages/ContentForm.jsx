import { useId } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

/* A form built from a section's field list (backend Application/Website/sections.json). The backend
   checks the same rules on save; these are here so mistakes show while typing. */

const LIMITS = { text: 200, textarea: 2000, link: 500 }
export const maxOf = (f) => f.max ?? LIMITS[f.kind]

// An empty value of a field, for a new list item.
export function blank(fields) {
  return Object.fromEntries(fields.map((f) => [f.key, f.kind === 'list' || f.kind === 'strings' ? [] : f.kind === 'select' ? f.options?.[0] ?? '' : '']))
}

const LINK_HINT = 'A full https:// address, a #section on this page, mailto: or tel:'

export default function ContentForm({ fields, value, onChange }) {
  return (
    <div className="cform">
      {fields.map((f) => (
        <FieldInput key={f.key} field={f} value={value[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} />
      ))}
    </div>
  )
}

function FieldInput({ field: f, value, onChange }) {
  const id = useId()
  if (f.kind === 'list') return <ListInput field={f} value={value ?? []} onChange={onChange} />
  if (f.kind === 'strings') return <StringsInput field={f} value={value ?? []} onChange={onChange} />
  const max = maxOf(f)
  const length = (value ?? '').length
  return (
    <div className={`field${f.kind === 'textarea' ? ' field--wide' : ''} cform__field`}>
      <label className="field__label" htmlFor={id}>{f.label}{f.required && <span aria-hidden="true"> *</span>}</label>
      {f.kind === 'textarea' ? (
        <textarea id={id} rows={4} value={value ?? ''} onChange={(e) => onChange(e.target.value)} maxLength={max} required={f.required} />
      ) : f.kind === 'select' ? (
        <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input id={id} type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))} maxLength={max}
          required={f.required} inputMode={f.kind === 'link' ? 'url' : undefined} placeholder={f.kind === 'link' ? 'https://… or #section' : undefined} />
      )}
      <span className="field__hint cform__hint">
        <span>{f.hint ?? (f.kind === 'link' ? LINK_HINT : '')}</span>
        {max && f.kind !== 'select' && <span className={length > max * 0.9 ? 'cform__count is-near' : 'cform__count'}>{length}/{max}</span>}
      </span>
    </div>
  )
}

// Moves item i of a list by d (-1 up, +1 down).
const moved = (list, i, d) => { const next = [...list]; next.splice(i + d, 0, next.splice(i, 1)[0]); return next }

function CountNote({ field: f, n }) {
  if (f.count) return <span className="cform__note">Needs exactly {f.count}: the animation is built for that many.</span>
  const max = f.max ?? 50
  return <span className="cform__note">{n} of up to {max}{f.min ? `, at least ${f.min}` : ''}</span>
}

function ListInput({ field: f, value, onChange }) {
  const fixed = !!f.count
  const max = f.max ?? 50
  const item = f.itemLabel ?? 'Item'
  return (
    <fieldset className="cform__list field--wide">
      <legend>{f.label}</legend>
      {f.hint && <p className="field__hint">{f.hint}</p>}
      <CountNote field={f} n={value.length} />
      <ol>
        {value.map((v, i) => (
          <li key={i} className="cform__item">
            <div className="cform__item-head">
              <strong>{item} {i + 1}</strong>
              <span className="cform__item-tools">
                <button type="button" className="icon-btn" disabled={i === 0} onClick={() => onChange(moved(value, i, -1))} aria-label={`Move ${item} ${i + 1} up`}><ArrowUp size={15} /></button>
                <button type="button" className="icon-btn" disabled={i === value.length - 1} onClick={() => onChange(moved(value, i, 1))} aria-label={`Move ${item} ${i + 1} down`}><ArrowDown size={15} /></button>
                {!fixed && (
                  <button type="button" className="icon-btn" disabled={value.length <= (f.min ?? 0)} onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${item} ${i + 1}`}><Trash2 size={15} /></button>
                )}
              </span>
            </div>
            <ContentForm fields={f.fields} value={v} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} />
          </li>
        ))}
      </ol>
      {!fixed && value.length < max && (
        <button type="button" className="btn btn--sm" onClick={() => onChange([...value, blank(f.fields)])}><Plus size={14} aria-hidden="true" /> Add {item.toLowerCase()}</button>
      )}
    </fieldset>
  )
}

function StringsInput({ field: f, value, onChange }) {
  const fixed = !!f.count
  const max = f.max ?? 50
  return (
    <fieldset className="cform__list field--wide">
      <legend>{f.label}</legend>
      {f.hint && <p className="field__hint">{f.hint}</p>}
      <CountNote field={f} n={value.length} />
      <ol className="cform__lines">
        {value.map((line, i) => (
          <li key={i}>
            <input type="text" value={line} maxLength={200} aria-label={`${f.label}, line ${i + 1}`} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
            <button type="button" className="icon-btn" disabled={i === 0} onClick={() => onChange(moved(value, i, -1))} aria-label={`Move line ${i + 1} up`}><ArrowUp size={15} /></button>
            <button type="button" className="icon-btn" disabled={i === value.length - 1} onClick={() => onChange(moved(value, i, 1))} aria-label={`Move line ${i + 1} down`}><ArrowDown size={15} /></button>
            {!fixed && <button type="button" className="icon-btn" disabled={value.length <= (f.min ?? 0)} onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove line ${i + 1}`}><Trash2 size={15} /></button>}
          </li>
        ))}
      </ol>
      {!fixed && value.length < max && <button type="button" className="btn btn--sm" onClick={() => onChange([...value, ''])}><Plus size={14} aria-hidden="true" /> Add line</button>}
    </fieldset>
  )
}
