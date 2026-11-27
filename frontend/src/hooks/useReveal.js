import { useEffect, useRef } from 'react'

// Adds the .in class the first time the element scrolls into view.
// Stagger is derived from the element's order among all reveal targets,
// matching the original page's (index % 4) * 70ms delay pattern.
let revealCount = 0

export default function useReveal() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const order = revealCount++
    el.classList.add('reveal')
    el.style.transition =
      `opacity 600ms cubic-bezier(.4,0,.2,1) ${(order % 4) * 70}ms, ` +
      `transform 600ms cubic-bezier(.4,0,.2,1) ${(order % 4) * 70}ms`
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in')
            io.unobserve(en.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return ref
}
