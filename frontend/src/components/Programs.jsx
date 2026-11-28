import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, MapPin } from 'lucide-react'
import CourseDialog, { rippleClick } from './CourseDialog.jsx'
import { HERO_PRICES } from '../data/content.js'
import { SalePrice } from './ui/SaleBanner.jsx'


/* ── Card headers ────────────────────────────────────────────────────────────
   Each one pictures the format of the program as a small live loop: a formula
   typing into Excel, a video playing through its chapters, a 15-day coaching
   track filling, a pin landing on Chennai. Pure CSS. The loops only run while
   the section is on screen (.programs.is-live); reduced motion shows a still. */

// The card pictures' little bits of text are this section's content (scene* fields).
function ExcelScene({ c }) {
  const bars = [42, 64, 50, 86]
  return (
    <div className="pscene pscene--excel" aria-hidden="true">
      <div className="pscene__formula">
        <span className="pscene__fx">fx</span>
        <span className="pscene__typed">{c.sceneFormula}</span>
        <span className="pscene__caret" />
      </div>
      <div className="pscene__sheet">
        {Array.from({ length: 24 }, (_, n) => (
          <span key={n} className={n % 6 === 3 ? 'is-hit' : ''} style={{ '--r': Math.floor(n / 6) }} />
        ))}
      </div>
      <div className="pscene__bars">
        {bars.map((h, n) => <span key={n} style={{ '--h': `${h}%`, '--b': n }} />)}
      </div>
    </div>
  )
}

function VideoScene({ c }) {
  return (
    <div className="pscene pscene--video" aria-hidden="true">
      <div className="pscene__screen">
        <span className="pscene__play" />
        <span className="pscene__live"><span />{c.sceneStatus}</span>
        <div className="pscene__chapters">
          {c.sceneChapters.map((ch, n) => <span key={n} style={{ '--k': n }}>{ch}</span>)}
        </div>
      </div>
      <div className="pscene__track"><span className="pscene__progress" /><span className="pscene__head" /></div>
    </div>
  )
}

function CoachScene({ c }) {
  return (
    <div className="pscene pscene--coach" aria-hidden="true">
      <div className="pscene__people">
        <span className="pscene__avatar pscene__avatar--you">{c.sceneYou}</span>
        <svg className="pscene__link" viewBox="0 0 100 10" preserveAspectRatio="none">
          <line x1="0" y1="5" x2="100" y2="5" />
        </svg>
        <span className="pscene__avatar pscene__avatar--coach">
          <img src="/assets/fonunder-200.webp" alt="" width="44" height="44" loading="lazy" />
        </span>
      </div>
      <div className="pscene__days">
        {Array.from({ length: 15 }, (_, n) => <span key={n} />)}
      </div>
    </div>
  )
}

function WorkshopScene({ c }) {
  return (
    <div className="pscene pscene--workshop" aria-hidden="true">
      <div className="pscene__cal">
        <span className="pscene__cal-month">{c.sceneMonth}</span>
        <span className="pscene__cal-day">{c.sceneDay}</span>
      </div>
      <div className="pscene__map">
        <svg viewBox="0 0 120 60" preserveAspectRatio="none">
          <path d="M4 50 C 30 46, 34 18, 62 22 S 98 40, 116 10" />
        </svg>
        <span className="pscene__ring" />
        <span className="pscene__pin"><MapPin /></span>
        <span className="pscene__city">{c.sceneCity}</span>
      </div>
    </div>
  )
}

/* Excel's mark, drawn inline so the label needs no extra request. */
function ExcelIcon() {
  return (
    <svg className="pcard__format-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="3" width="15" height="18" rx="2" fill="#21A366" />
      <path d="M14.5 3H20a2 2 0 0 1 2 2v4h-7.5z" fill="#33C481" />
      <path d="M14.5 15H22v4a2 2 0 0 1-2 2h-5.5z" fill="#185C37" />
      <rect x="2" y="6.5" width="11" height="11" rx="1.6" fill="#107C41" />
      <path d="M5 9.2h1.9l1.1 1.9 1.1-1.9H11l-2 3 2 3H9.1L8 13.3l-1.1 1.9H5l2-3z" fill="#FFFFFF" />
    </svg>
  )
}
const FORMAT_ICONS = { excel: ExcelIcon }

const SCENES = { excel: ExcelScene, video: VideoScene, coach: CoachScene, workshop: WorkshopScene }

export default function Programs({ content }) {
  const ref = useRef(null)
  const [openIndex, setOpenIndex] = useState(null)
  // Every program except the main webinar (HERO_PRICES[0], which the hero sells).
  // Read on each render: main.jsx re-renders once the admin API values arrive.
  const PROGRAMS = HERO_PRICES.map((p, i) => ({ ...p, index: i })).filter((p) => p.index > 0 && p.scene && !p.hidden)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // .is-in fires once (card entrance); .is-live follows visibility so the
    // looping scenes stop costing frames once the section scrolls away.
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) el.classList.add('is-in')
        el.classList.toggle('is-live', en.isIntersecting)
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section id="programs" className="section programs" ref={ref}>
      <div className="section-head programs__head">
        <h2 className="h2">{content.heading}</h2>
        <p>{content.intro}</p>
      </div>

      <ul className="programs__grid">
        {PROGRAMS.map((p, i) => {
          const Scene = SCENES[p.scene]
          const FormatIcon = FORMAT_ICONS[p.formatIcon]
          return (
            <li key={p.key} className={`pcard pcard--${p.scene}`} style={{ '--i': i }}>
              <Scene c={content} />
              <div className="pcard__body">
                <span className="pcard__format">
                  {FormatIcon && <FormatIcon />}
                  {p.format}
                </span>
                <h3 className="pcard__title">{p.title}</h3>
                <p className="pcard__summary">{p.summary}</p>
                <ul className="pcard__highlights">
                  {p.highlights.map((h, k) => <li key={k}><Check aria-hidden="true" />{h}</li>)}
                </ul>
                <div className="pcard__foot">
                  <p className="pcard__price">
                    <span className="sr-only">{content.priceLabel} </span><SalePrice price={p.price} originalPrice={p.originalPrice} />
                  </p>
                  <button type="button" className="pcard__details" onClick={() => setOpenIndex(p.index)}>
                    {content.detailsLabel}
                  </button>
                </div>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-primary pcard__cta" onClick={rippleClick}>
                  {content.registerLabel} <ArrowRight aria-hidden="true" />
                  <span className="btn-shine" aria-hidden="true" />
                </a>
              </div>
            </li>
          )
        })}
      </ul>

      <CourseDialog course={openIndex !== null ? HERO_PRICES[openIndex] : null} onClose={() => setOpenIndex(null)} />
    </section>
  )
}
