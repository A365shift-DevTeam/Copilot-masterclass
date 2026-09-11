/**
 * The bot that flies between the seat buttons as you scroll.
 *
 * Five buttons register themselves as waypoints (Hero, Overview, Copilot
 * Studio, Benefits, Speaker). Whichever one last passed the middle of the
 * viewport holds the bot; scrolling on sends it to the next.
 *
 * It is positioned in *document* coordinates, not fixed to the viewport.
 * That is what keeps the work off the scroll path: parked in a button it
 * simply rides the page like any other element, and nothing recalculates
 * until the waypoint actually changes. A fixed traveller would have to be
 * repositioned every frame, and a CSS transition would then never settle —
 * the bot would lag behind the button the whole way down the page.
 *
 * The curve comes from splitting the two axes across two layers and giving
 * them different easings:
 *   .bot-traveller       translateX   (transition, easing A)
 *   .bot-traveller__y    translateY   (transition, easing B)
 *   .bot-traveller__spin the flourish (keyframes)
 * Moving both axes together on one element can only ever draw a straight
 * line, whatever the easing. Letting X finish ahead of Y bows the path one
 * way, letting Y finish ahead bows it the other, and because both are
 * transitions the bot still lands exactly on its target. Each hop picks a
 * different easing pair, so no two consecutive flights trace the same curve.
 */
import { useEffect, useRef, useState } from 'react'
import { BOT_LOGO } from './ReserveSeatLabel.jsx'

const HOP_STYLES = 4

export default function LogoTraveller() {
  const boxRef = useRef(null)
  const spinRef = useRef(null)
  const [flies, setFlies] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 719px)')
    const sync = () => setFlies(!mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!flies) return
    const box = boxRef.current
    if (!box) return

    let raf = null
    let at = -1
    let lastY = -1

    // Retriggering a finished animation needs the name cleared and a reflow
    // forced in between, or the browser reuses the completed run.
    const replay = (el, name) => {
      if (!el) return
      el.style.animation = 'none'
      void el.offsetWidth
      el.style.animation = ''
      el.dataset.play = name
    }

    /*
     * Where the button sits in the page, measured by walking offsetParents
     * rather than from getBoundingClientRect().
     *
     * The difference matters: sections reveal themselves by animating
     * translateY(20px) -> 0, and a rect read during that animation is up to
     * 20px above where the button actually settles. A parked bot never
     * re-measures, so it would sit wrong for good. offsetTop/offsetLeft are
     * layout values and ignore ancestor transforms entirely.
     */
    const docCentre = (el) => {
      let x = 0
      let y = 0
      for (let n = el; n; n = n.offsetParent) {
        x += n.offsetLeft
        y += n.offsetTop
      }
      return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 }
    }

    // --x and --y are set on the box and inherit down, so the Y layer reads
    // the same pair without being written to separately.
    const place = (slot, animate) => {
      const c = docCentre(slot)
      // First placement, and every re-measure of a parked bot, must not fly
      // in — is-instant kills the transition on both axis layers at once.
      if (!animate) box.classList.add('is-instant')
      box.style.setProperty('--x', `${c.x}px`)
      box.style.setProperty('--y', `${c.y}px`)
      if (!animate) {
        void box.offsetWidth
        box.classList.remove('is-instant')
      }
    }

    const read = () => {
      raf = null
      const slots = document.querySelectorAll('[data-bot-slot]')
      if (!slots.length) return

      /*
       * The hop fires as soon as the next button comes into view, not when it
       * reaches the middle of the screen.
       *
       * Waiting for the centre made the bot late: these buttons sit at the
       * *end* of their sections, so by the time one reached mid-screen the
       * section had been read and was already scrolling away — the bot
       * arrived behind the reader the whole way down. Setting off when the
       * button first appears gives the flight the length of that button's
       * approach to finish, so the bot is waiting in it on arrival.
       */
      const trigger = window.innerHeight * 0.82
      let next = 0
      slots.forEach((s, i) => {
        if (s.getBoundingClientRect().top <= trigger) next = i
      })

      if (next === at) {
        // Same waypoint: only re-measure if the layout could have moved.
        return
      }
      const first = at === -1
      at = next
      box.dataset.hop = String(next % HOP_STYLES)
      place(slots[next], !first)
      if (!first) replay(spinRef.current, 'spin')
      box.style.opacity = '1'
    }

    const onScroll = () => {
      if (window.scrollY === lastY) return
      lastY = window.scrollY
      if (raf === null) raf = requestAnimationFrame(read)
    }

    const onResize = () => {
      // Document coordinates shift when the layout reflows, so the parked
      // bot has to be re-measured — without animating, it has not moved.
      const slots = document.querySelectorAll('[data-bot-slot]')
      if (at >= 0 && slots[at]) place(slots[at], false)
      lastY = -1
      onScroll()
    }

    // The buttons are laid out by the time the first frame paints, but the
    // preloader can delay that, so settle on the next frame.
    raf = requestAnimationFrame(read)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })

    // Document coordinates also go stale when the page reflows without a
    // resize — fonts landing, images decoding, the preloader releasing. This
    // catches those; it fires rarely, and re-placing is a single measurement.
    const ro = new ResizeObserver(onResize)
    ro.observe(document.body)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [flies])

  // Stopped, there is nothing to fly: every button keeps its own solid bot.
  if (!flies) return null

  return (
    <div ref={boxRef} className="bot-traveller" aria-hidden="true">
      <div className="bot-traveller__y">
        <img ref={spinRef} className="bot-traveller__spin" src={BOT_LOGO} alt="" />
      </div>
    </div>
  )
}
