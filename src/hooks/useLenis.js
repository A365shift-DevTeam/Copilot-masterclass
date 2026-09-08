import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

let globalLenis = null

/**
 * Returns the active global Lenis instance.
 */
export function getLenis() {
  return globalLenis
}

/**
 * How far above a target to stop so the fixed navbar does not cover it.
 *
 * Measured rather than hard-coded: the bar is 80px tall at the top of the page
 * and 68px once it goes solid, and it tightens again on phones. Returns a
 * negative number, which is the direction Lenis offsets in.
 */
function navOffset() {
  const nav = document.querySelector('.nav')
  const h = nav ? nav.getBoundingClientRect().height : 80
  return -(h + 12)
}

/**
 * Smoothly scrolls to a selector, element, or absolute pixel position.
 *
 * Selector and element targets clear the fixed navbar automatically; a numeric
 * target is an absolute scroll position the scroll stages work out themselves,
 * and shifting that by the navbar height would land them in the wrong frame.
 * `extra` is applied on top of whichever applies.
 */
export function scrollToTarget(target, extra = 0) {
  const offset = typeof target === 'number' ? extra : navOffset() + extra
  if (globalLenis) {
    globalLenis.scrollTo(target, { offset, duration: 1.4 })
    return
  }
  // No Lenis yet: scroll natively, still clearing the bar.
  if (typeof target === 'number') {
    window.scrollTo({ top: target + offset, behavior: 'smooth' })
    return
  }
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY + offset
  window.scrollTo({ top, behavior: 'smooth' })
}

/**
 * React hook to mount and run Lenis smooth scrolling.
 */
export default function useLenis() {
  const lenisRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.5,
    })

    globalLenis = lenis
    lenisRef.current = lenis

    let rafId
    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    /*
     * In-page links are plain <a href="#..."> in the navbar, the mobile drawer
     * and the footer, which the browser jumps to natively -- landing the target
     * flush with the viewport top, under the fixed bar. Handled once here
     * rather than wiring an onClick onto every one of them.
     *
     * Skipped when the event is already handled (the CTAs that call
     * scrollToTarget themselves preventDefault first) and when a modifier is
     * held, so open-in-new-tab and friends still work.
     */
    const onAnchorClick = (e) => {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = e.target.closest && e.target.closest('a[href^="#"]')
      if (!link) return
      const href = link.getAttribute('href')
      if (!href || href === '#') return
      let el = null
      try {
        el = document.querySelector(href)
      } catch {
        return // not a usable selector
      }
      if (!el) return
      e.preventDefault()
      scrollToTarget(el)
      // Keep the URL in step, without the jump history.pushState would avoid
      // but replaceState does not trigger.
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', href)
      }
    }
    document.addEventListener('click', onAnchorClick)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('click', onAnchorClick)
      lenis.destroy()
      if (globalLenis === lenis) {
        globalLenis = null
      }
    }
  }, [])

  return lenisRef
}
