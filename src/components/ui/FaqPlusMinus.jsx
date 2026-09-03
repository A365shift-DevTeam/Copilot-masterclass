/* ── faq, plus/minus ─────────────────────────────────────────────
 * A disclosure list: one rounded container, hairline dividers, and a
 * plus that becomes a minus as a row opens.
 *
 * The panel animates on `grid-template-rows: 0fr -> 1fr` rather than a
 * `max-height` guess. A max-height has to be a number bigger than any
 * answer will ever be, which either clips a long one or makes every
 * short one ease at the wrong speed; 0fr->1fr is the content's own
 * height, whatever it turns out to be.
 *
 * Written for this project's stack — plain JSX and hand-written CSS,
 * no Tailwind or shadcn primitives.
 * ─────────────────────────────────────────────────────────────── */

import * as React from 'react'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/**
 * @param items         [{ q, a }] — question and answer.
 * @param defaultOpen   Index open on first paint. -1 for all closed.
 * @param allowMultiple Let several rows stay open at once.
 */
export function FaqPlusMinus({ items, defaultOpen = 0, allowMultiple = false, className }) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '')
  const [open, setOpen] = React.useState(() => (defaultOpen >= 0 ? [defaultOpen] : []))

  const toggle = (index) => {
    setOpen((current) => {
      const isOpen = current.includes(index)
      if (allowMultiple) {
        return isOpen ? current.filter((i) => i !== index) : [...current, index]
      }
      return isOpen ? [] : [index]
    })
  }

  return (
    <div className={cx('fpm', className)}>
      {items.map((item, index) => {
        const isOpen = open.includes(index)
        return (
          <div key={item.q} className={cx('fpm__item', isOpen && 'is-open')}>
            <h3 className="fpm__heading">
              <button
                type="button"
                className="fpm__trigger"
                aria-expanded={isOpen}
                aria-controls={`${id}-panel-${index}`}
                id={`${id}-trigger-${index}`}
                onClick={() => toggle(index)}
              >
                <span className="fpm__q">{item.q}</span>
                {/* Two bars: the upright one lies down, so the plus reads as a
                    minus. aria-hidden because aria-expanded already says it. */}
                <span className="fpm__icon" aria-hidden>
                  <i />
                  <i />
                </span>
              </button>
            </h3>
            <div
              className="fpm__panel"
              id={`${id}-panel-${index}`}
              role="region"
              aria-labelledby={`${id}-trigger-${index}`}
              // Hidden from the a11y tree and from find-in-page while collapsed,
              // without display:none, which would kill the height transition.
              inert={isOpen ? undefined : ''}
            >
              <div className="fpm__panel-clip">
                <p className="fpm__a">{item.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FaqPlusMinus
