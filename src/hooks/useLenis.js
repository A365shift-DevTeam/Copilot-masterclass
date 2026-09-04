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
 * Smoothly scrolls to a selector or pixel offset using Lenis.
 */
export function scrollToTarget(target, offset = 0) {
  if (globalLenis) {
    globalLenis.scrollTo(target, { offset, duration: 1.4 })
  } else {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }
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

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      if (globalLenis === lenis) {
        globalLenis = null
      }
    }
  }, [])

  return lenisRef
}
