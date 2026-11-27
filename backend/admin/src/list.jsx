import { useEffect, useState } from 'react'
import { Download, Eye, Pencil, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'

/* List-page building blocks on the design system's own classes (list-design.css,
   copied from contacts-list-design-system.html): toolbar, filter drawer and chips,
   table with row actions, status badge. */

/* ── Filters ──────────────────────────────────────────────────────────────────
   A filter `section` is { key, title, type, options }:
     type 'pills'  one choice from options [{ value, label, dot? }]
     type 'text'   free text ("contains")
     type 'dates'  { from, to } as yyyy-mm-dd, with Today / This week / This month presets
   `value` maps section key -> its value; empty values are "not set". */

const isSet = (v) => (v && typeof v === 'object' ? !!(v.from || v.to) : !!v)
export const activeCount = (value) => Object.values(value).filter(isSet).length

function label(section, v) {
  if (section.type === 'pills') return section.options.find((o) => o.value === v)?.label ?? v
  if (section.type === 'dates') return v.from && v.to ? `${v.from} to ${v.to}` : v.from ? `from ${v.from}` : `until ${v.to}`
  return v
}

const iso = (d) => d.toISOString().slice(0, 10)
function preset(name) {
  const now = new Date()
  const start = new Date(now)
  if (name === 'week') start.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  if (name === 'month') start.setDate(1)
  return { from: iso(start), to: iso(now) }
}

export function FilterDrawer({ open, onClose, sections, value, onApply }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (open) setDraft(value) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])
  if (!open) return null
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const count = activeCount(draft)

  return (
    <div className="lf-root">
      <div className="lf-backdrop" onClick={onClose} />
      <aside className="lf-drawer" role="dialog" aria-modal="true" aria-label="Filters">
        <header className="lf-header">
          <div className="lf-header-left"><h2 className="lf-title">Filters</h2>{count > 0 && <span className="pop-count">{count}</span>}</div>
          <div className="lf-header-right">
            <button type="button" className="pop-link" onClick={() => setDraft({})}>Reset</button>
            <button type="button" className="lf-close" aria-label="Close" onClick={onClose}><X size={15} /></button>
          </div>
        </header>
        <div className="lf-body">
          {sections.map((s) => {
            const v = draft[s.key]
            return (
              <section key={s.key} className={`lf-section${isSet(v) ? ' lf-section--on' : ''}`}>
                <div className="lf-section-head">
                  <h3 className="lf-section-title">{s.title}</h3>
                  {isSet(v) && <button type="button" className="lf-section-clear" onClick={() => set(s.key, undefined)}>Clear</button>}
                </div>
                {s.type === 'pills' && (
                  <div className="lf-pills">
                    {s.options.map((o) => (
                      <button key={o.value} type="button" className={`lf-pill${v === o.value ? ' lf-pill--on' : ''}`} aria-pressed={v === o.value}
                        onClick={() => set(s.key, v === o.value ? undefined : o.value)}>
                        {o.dot && <span className="lf-pill-dot" style={{ background: o.dot }} />}{o.label}
                      </button>
                    ))}
                  </div>
                )}
                {s.type === 'text' && (
                  <input className="lf-input" value={v ?? ''} onChange={(e) => set(s.key, e.target.value)} placeholder="Contains…" />
                )}
                {s.type === 'dates' && (
                  <>
                    <div className="lf-pills" style={{ marginBottom: 8 }}>
                      {[['today', 'Today'], ['week', 'This week'], ['month', 'This month']].map(([k, l]) => (
                        <button key={k} type="button" className="lf-pill" onClick={() => set(s.key, preset(k))}>{l}</button>
                      ))}
                    </div>
                    <div className="lf-range">
                      <label className="lf-range-field"><span>From</span>
                        <input className="lf-input" type="date" value={v?.from ?? ''} onChange={(e) => set(s.key, { ...v, from: e.target.value })} />
                      </label>
                      <label className="lf-range-field"><span>To</span>
                        <input className="lf-input" type="date" value={v?.to ?? ''} onChange={(e) => set(s.key, { ...v, to: e.target.value })} />
                      </label>
                    </div>
                  </>
                )}
              </section>
            )
          })}
        </div>
        <footer className="lf-footer">
          <button type="button" className="lf-btn lf-btn--ghost" onClick={() => { onApply({}); onClose() }}>Clear all</button>
          <div className="lf-footer-right">
            <button type="button" className="lf-btn lf-btn--secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="lf-btn lf-btn--primary" onClick={() => { onApply(draft); onClose() }}>Apply filters</button>
          </div>
        </footer>
      </aside>
    </div>
  )
}

export function FilterChips({ sections, value, onChange, onOpen }) {
  const on = sections.filter((s) => isSet(value[s.key]))
  if (!on.length) return null
  return (
    <div className="page-toolbar-chips">
      <div className="lf-chips" aria-label="Applied filters">
        <button type="button" className="lf-chips-pill" onClick={onOpen} title="Edit filters">
          <SlidersHorizontal size={12} aria-hidden="true" />Filters<span className="lf-chips-pill-count">{on.length}</span>
        </button>
        {on.map((s) => (
          <span key={s.key} className="lf-chip">
            <button type="button" className="lf-chip-body" onClick={onOpen}>
              <span className="lf-chip-label">{s.title}:</span><span className="lf-chip-value">{label(s, value[s.key])}</span>
            </button>
            <button type="button" className="lf-chip-x" aria-label={`Remove ${s.title} filter`} onClick={() => onChange({ ...value, [s.key]: undefined })}><X size={11} /></button>
          </span>
        ))}
        <button type="button" className="lf-chips-clear" onClick={() => onChange({})}>Clear all</button>
      </div>
    </div>
  )
}

/* ── Toolbar (.page-toolbar) ─────────────────────────────────────────────── */

export function ListToolbar({ title, count, search, onSearch, placeholder, filters, filterValue, onFilters, exportHref, children }) {
  const [open, setOpen] = useState(false)
  const n = filters ? activeCount(filterValue) : 0
  return (
    <div className="page-toolbar">
      <div className="page-toolbar-left">
        <h3 className="page-toolbar-title">{title}</h3>
        {count != null && <span className="page-toolbar-count">{count.toLocaleString('en-IN')}</span>}
        {onSearch && (
          <div className="page-toolbar-search">
            <Search size={15} className="page-toolbar-search-icon" aria-hidden="true" />
            <input className="page-toolbar-search-input" type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
          </div>
        )}
      </div>
      <div className="page-toolbar-right">
        <div className="page-toolbar-icons">
          {filters && (
            <button type="button" className={`pt-icon-btn${n ? ' active' : ''}`} onClick={() => setOpen(true)} title="Filter" aria-label="Filter">
              <SlidersHorizontal size={15} /><span className="pt-btn-label">Filter</span>
              {n > 0 && <span className="pt-menu-badge">{n}</span>}
            </button>
          )}
          {exportHref && (
            <a className="pt-icon-btn" href={exportHref} download title="Export CSV" aria-label="Export CSV">
              <Download size={15} /><span className="pt-btn-label">Export</span>
            </a>
          )}
        </div>
        {children && <><div className="page-toolbar-divider" />{children}</>}
      </div>
      {filters && (
        <>
          <FilterChips sections={filters} value={filterValue} onChange={onFilters} onOpen={() => setOpen(true)} />
          <FilterDrawer open={open} onClose={() => setOpen(false)} sections={filters} value={filterValue} onApply={onFilters} />
        </>
      )}
    </div>
  )
}

/* ── Table (.slv-*) ──────────────────────────────────────────────────────────
   columns: [{ key, label, render(row), className }]; the first column is the sticky "name". */

// selected: a Set of row keys; onSelect(newSet). Leave both out for a table without checkboxes.
export function ListTable({ columns, rows, rowKey, offset = 0, onRowClick, actions, state, selected, onSelect }) {
  const selectable = !!onSelect
  const keys = rows.map(rowKey)
  const onPage = keys.filter((k) => selected?.has(k)).length
  const toggleAll = () => {
    const next = new Set(selected)
    if (onPage === keys.length) keys.forEach((k) => next.delete(k)); else keys.forEach((k) => next.add(k))
    onSelect(next)
  }
  const toggle = (k) => { const next = new Set(selected); if (next.has(k)) next.delete(k); else next.add(k); onSelect(next) }
  const span = columns.length + 1 + (selectable ? 1 : 0) + (actions ? 1 : 0)
  return (
    <div className="slv-table-wrapper">
      <div className="slv-scroll-container">
        <table className="slv-table">
          <thead>
            <tr>
              {selectable && (
                <th className="slv-select-cell">
                  <input type="checkbox" className="slv-checkbox" aria-label="Select all on this page" disabled={!keys.length}
                    checked={keys.length > 0 && onPage === keys.length} ref={(el) => { if (el) el.indeterminate = onPage > 0 && onPage < keys.length }}
                    onChange={toggleAll} />
                </th>
              )}
              <th className="slv-serial-cell">S.No</th>
              {columns.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}
              {actions && <th style={{ textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {state ? (
              <tr><td className="slv-state" colSpan={span}>{state}</td></tr>
            ) : rows.map((r, i) => (
              <tr key={rowKey(r)} className={`slv-row${selected?.has(rowKey(r)) ? ' slv-row-selected' : ''}`} tabIndex={0} onClick={() => onRowClick?.(r)} onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && onRowClick?.(r)}>
                {selectable && (
                  <td className="slv-select-cell" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="slv-checkbox" checked={selected.has(rowKey(r))} onChange={() => toggle(rowKey(r))} aria-label={`Select row ${offset + i + 1}`} />
                  </td>
                )}
                <td className="slv-serial-cell">{offset + i + 1}</td>
                {columns.map((c) => <td key={c.key} className={c.className}>{c.render(r)}</td>)}
                {actions && <td className="slv-actions-cell" onClick={(e) => e.stopPropagation()}>{actions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Name cell: initials avatar, name, muted second line. */
export function Entity({ name, meta }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  return (
    <div className="slv-entity">
      <span className="slv-avatar" aria-hidden="true">{initials}</span>
      <span className="slv-primary">
        <span className="slv-primary-title">{name}</span>
        {meta && <span className="slv-primary-meta">{meta}</span>}
      </span>
    </div>
  )
}

/** View / Edit / Delete icons; pass only the ones a row supports. */
export function RowActions({ name, onView, onEdit, onDelete }) {
  return (
    <div className="slv-actions">
      {onView && <button type="button" className="slv-action-icon tone-info" onClick={onView} title="View" aria-label={`View ${name}`}><Eye size={15} /></button>}
      {onEdit && <button type="button" className="slv-action-icon tone-primary" onClick={onEdit} title="Edit" aria-label={`Edit ${name}`}><Pencil size={15} /></button>}
      {onDelete && <button type="button" className="slv-action-icon tone-danger" onClick={onDelete} title="Delete" aria-label={`Delete ${name}`}><Trash2 size={15} /></button>}
    </div>
  )
}

const TONES = { Paid: 'green', Pending: 'amber', Refunded: 'violet', Failed: 'red', Registered: 'blue' }
export const StatusBadge = ({ status }) => <span className={`status-badge status-badge--${TONES[status] ?? 'gray'}`}>{status}</span>

// Pill dots for status filters, matching the badge colours above.
export const STATUS_OPTIONS = [
  { value: 'Paid', label: 'Paid', dot: '#059669' },
  { value: 'Pending', label: 'Pending', dot: '#d97706' },
  { value: 'Refunded', label: 'Refunded', dot: '#7c3aed' },
  { value: 'Failed', label: 'Failed', dot: '#dc2626' },
]

/* ── Bulk action bar (.bulk-bar), shown while rows are ticked ────────────── */
export function BulkBar({ count, noun, onClear, children }) {
  if (!count) return null
  return (
    <div className="bulk-bar" role="region" aria-label="Bulk actions">
      <span className="bulk-bar-count" aria-live="polite"><strong>{count}</strong> {noun} selected</span>
      <div className="bulk-bar-actions">{children}</div>
      <button type="button" className="bulk-bar-clear" onClick={onClear} aria-label="Clear selection" title="Clear selection"><X size={15} /></button>
    </div>
  )
}

/* ── The same filters on every list: Status, Program, Date ───────────────── */
export function standardFilters(courses, { registered = false, unassigned = false } = {}) {
  return [
    { key: 'status', title: 'Status', type: 'pills', options: [
      ...(registered ? [{ value: 'Registered', label: 'Registered (not paid)', dot: '#2563eb' }] : []),
      ...STATUS_OPTIONS,
    ] },
    { key: 'program', title: 'Program', type: 'pills', options: [
      ...courses.filter((c) => c.category).map((c) => ({ value: String(c.id), label: c.cardTitle || c.name })),
      ...(unassigned ? [{ value: 'none', label: 'Unassigned (from Razorpay)' }] : []),
    ] },
    { key: 'date', title: 'Date', type: 'dates' },
  ]
}

// A date filter as API params: whole IST calendar days, "to" included.
export const dateParams = (date) => ({
  from: date?.from ? `${date.from}T00:00:00+05:30` : '',
  to: date?.to ? new Date(+new Date(`${date.to}T00:00:00+05:30`) + 864e5).toISOString() : '',
})
