import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowUpRight, MapPin, X } from 'lucide-react'
import { PAYMENT_URL, HERO_PRICES, SHARED, fill, label } from '../data/content.js'
import { startCheckout } from './CheckoutDialog.jsx'
import useTypewriter from '../hooks/useTypewriter.js'
import { LinkedinIcon } from './ui/SocialIcons.jsx'
import FounderVoice from './ui/FounderVoice.jsx'
import './trainer-profile.css'

const BOT_AVATAR = '/assets/ambot-bot.webp'
// The photo stays a file until images come from the admin.
const PHOTO = '/assets/fonunder-200.webp'

// Site-wide content > Trainer profile, read when the profile renders.
const trainer = () => SHARED.trainer ?? { name: '', bio: [], typed: [''], path: [], expertise: [], services: [] }

/*
 * The reply is one orchestrated sequence, gated by stage:
 * 0 question types · 1 assistant thinks · 2 bio streams · 3 career path
 * draws · 4 figures count up · 5 services drop in · 6 suggestions, done.
 * Each section mounts when its stage arrives and animates itself in CSS.
 */
const STAGE_HOLD = { 1: 380, 3: 550, 4: 650, 5: 350 }
// The bio streams this many words per tick, so a 110-word reply lands in under a second.
const WORDS_PER_TICK = 4
const TICK_MS = 28
const CHAR_MS = 16
const DONE = 6

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

/** "1,200+" counts 0 → 1,200 then gets its suffix back; words stay as they are. */
function CountUp({ value, run }) {
  const m = /^([\d,]+)(.*)$/.exec(value)
  const target = m ? Number(m[1].replace(/,/g, '')) : 0
  const [n, setN] = useState(run ? 0 : target)

  useEffect(() => {
    if (!m || !run) { setN(target); return }
    let raf
    const start = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 700)
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!m) return value
  return <>{n.toLocaleString('en-IN')}{m[2]}</>
}

function ProfileThread({ reduced }) {
  const T = trainer()
  const QUESTION = fill(T.question, { name: T.name })
  // The bio streams word by word, paragraph breaks kept.
  const BIO_WORDS = T.bio.map((p) => p.text.split(' '))
  const TOTAL_WORDS = BIO_WORDS.reduce((n, p) => n + p.length, 0)
  const [stage, setStage] = useState(reduced ? DONE : 0)
  const [chars, setChars] = useState(reduced ? QUESTION.length : 0)
  const [words, setWords] = useState(reduced ? TOTAL_WORDS : 0)
  const threadRef = useRef(null)
  const userScrolled = useRef(false)

  // Drive the sequence.
  useEffect(() => {
    if (stage >= DONE) return
    let t
    if (stage === 0) {
      if (chars < QUESTION.length) t = setTimeout(() => setChars((c) => c + 1), CHAR_MS)
      else t = setTimeout(() => setStage(1), 150)
    } else if (stage === 2) {
      if (words < TOTAL_WORDS) t = setTimeout(() => setWords((w) => Math.min(TOTAL_WORDS, w + WORDS_PER_TICK)), TICK_MS)
      else t = setTimeout(() => setStage(3), 120)
    } else {
      t = setTimeout(() => setStage((s) => s + 1), STAGE_HOLD[stage])
    }
    return () => clearTimeout(t)
  }, [stage, chars, words]) // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the reply down as it grows, until the reader scrolls themselves.
  useEffect(() => {
    const el = threadRef.current
    if (!el || userScrolled.current || stage >= DONE) return
    el.scrollTo({ top: el.scrollHeight, behavior: stage === 2 ? 'auto' : 'smooth' })
  }, [stage, words])

  const skip = () => {
    setChars(QUESTION.length)
    setWords(TOTAL_WORDS)
    setStage(DONE)
  }

  // Render the bio up to the streamed word count.
  let left = words
  const shown = BIO_WORDS.map((p) => {
    const take = Math.max(0, Math.min(p.length, left))
    left -= take
    return take
  })
  const lastShown = shown.reduce((last, take, i) => (take ? i : last), -1)
  const bio = BIO_WORDS.map((p, i) => {
    if (!shown[i]) return null
    return (
      <p key={i} className={i === 0 ? 'tp-lead' : undefined}>
        {p.slice(0, shown[i]).join(' ')}
        {stage === 2 && i === lastShown && <span className="tp-caret" aria-hidden="true" />}
      </p>
    )
  })

  return (
    <>
      <div
        ref={threadRef}
        className="tp-thread"
        data-lenis-prevent
        aria-busy={stage < DONE}
        onWheel={() => { userScrolled.current = true }}
        onTouchMove={() => { userScrolled.current = true }}
      >
        <div className="tp-ask">
          <p className="tp-ask__bubble">
            {QUESTION.slice(0, chars)}
            {stage === 0 && <span className="tp-caret" aria-hidden="true" />}
          </p>
        </div>

        {stage >= 1 && (
          <div className="tp-reply">
            <img className="tp-reply__bot" src={BOT_AVATAR} alt="" width="36" height="36" />
            <div className="tp-reply__body">
              {stage === 1 ? (
                <span className="tp-thinking" role="status" aria-label={T.writingLabel}>
                  <i /><i /><i />
                </span>
              ) : (
                <>
                  <div className="tp-block tp-bio">
                    {bio}
                  </div>

                  {stage >= 3 && (
                    <div className="tp-block">
                      <h3>{T.pathTitle}</h3>
                      <ol className="tp-path">
                        {T.path.map((x, i) => (
                          <li key={i} style={{ '--i': i }}>
                            <span className="tp-path__step" aria-hidden="true">{i + 1}</span>
                            <div>
                              <p className="tp-path__org">{x.org}</p>
                              <p className="tp-path__role">{x.role}</p>
                              <p className="tp-path__note">{x.note}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {stage >= 4 && (
                    <div className="tp-block">
                      <h3>{T.statsTitle}</h3>
                      <ul className="tp-stats">
                        {T.expertise.map((e, i) => (
                          <li key={i} style={{ '--i': i }}>
                            <b><CountUp value={e.value} run={!reduced} /></b>
                            <span>{e.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {stage >= 5 && (
                    <div className="tp-block">
                      <h3>{T.servicesTitle}</h3>
                      <ul className="tp-tags">
                        {T.services.map((s, i) => <li key={i} style={{ '--i': i }}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="tp-suggest">
        {stage < DONE ? (
          <button type="button" className="tp-skip" onClick={skip}>{T.showAll}</button>
        ) : (
          <>
            <FounderVoice className="tp-chip tp-chip--voice" label={T.voiceLabel} />
            {T.linkedin && (
              <a className="tp-chip tp-chip--li" href={T.linkedin} target="_blank" rel="noopener noreferrer">
                <LinkedinIcon size={15} /> {T.linkedinLabel}
              </a>
            )}
            <a className="tp-chip tp-chip--cta" href={PAYMENT_URL} onClick={(e) => startCheckout(e, 'webinar')}>
              {T.reserveLabel} ₹{(HERO_PRICES[0].price ?? 0).toLocaleString('en-IN')} <ArrowUpRight aria-hidden="true" />
            </a>
          </>
        )}
      </footer>
    </>
  )
}

/**
 * Hero chip: the trainer's photo in a turning brand ring, with a line beside
 * it that types out who he is. Clicking it opens his profile as an assistant
 * conversation, which suits a Copilot class.
 */
export default function TrainerProfile() {
  const T = trainer()
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const { displayedText } = useTypewriter({
    text: T.typed,
    typingSpeed: 38,
    deletingSpeed: 18,
    pauseDuration: 1500,
    deletePauseDuration: 200,
    loop: true,
  })
  const line = reduced ? T.typed[0] : displayedText

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="trainer-chip" aria-label={fill(T.chipLabel, { name: T.name })}>
        <span className="trainer-chip__avatar" aria-hidden="true">
          <img src={PHOTO} alt="" width="56" height="56" decoding="async" />
        </span>
        <span className="trainer-chip__text" aria-hidden="true">
          <span className="trainer-chip__lead">{T.chipLead}</span>
          <span className="trainer-chip__typed">
            {line || '​'}
            {!reduced && <span className="trainer-chip__cursor" />}
          </span>
        </span>
        <span className="trainer-chip__cta" aria-hidden="true">{T.chipCta}</span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="legal-dialog__overlay" />
        <Dialog.Content className="legal-dialog course-dialog tp" aria-describedby={undefined}>
          <header className="tp-head">
            <span className="tp-head__aurora" aria-hidden="true"><i /><i /><i /></span>
            <span className="tp-head__ring">
              <img src={PHOTO} alt={T.name} width="76" height="76" />
            </span>
            <div className="tp-head__text">
              <Dialog.Title className="tp-head__name">{T.name}</Dialog.Title>
              <p className="tp-head__role">{T.role}</p>
              <p className="tp-head__place"><MapPin aria-hidden="true" />{T.location}</p>
            </div>
            <Dialog.Close className="tp-close" aria-label={label('close')}>
              <X size={18} aria-hidden />
            </Dialog.Close>
          </header>

          {/* Mounted only while open, so the conversation replays on each opening. */}
          {open && <ProfileThread reduced={reduced} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
