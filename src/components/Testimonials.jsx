import { useRef, useState } from 'react'
import useReveal from '../hooks/useReveal.js'
import { TESTIMONIALS } from '../data/content.js'

export default function Testimonials() {
  const headRef = useReveal()
  const trackRef = useRef(null)
  const [slide, setSlide] = useState(0)

  const move = (n) => {
    setSlide(n)
    const track = trackRef.current
    if (!track) return
    const card = track.children[0]
    const w = card ? card.getBoundingClientRect().width + 18 : 378
    track.style.transform = `translateX(${-n * w}px)`
  }

  return (
    <section className="section">
      <div ref={headRef} className="testimonials__head">
        <div>
          <div className="eyebrow eyebrow--teal" style={{ marginBottom: 10 }}>FEEDBACK</div>
          <h2 className="h2 testimonials__title">What Participants Say</h2>
        </div>
        <div className="testimonials__nav">
          <button aria-label="Previous testimonial" onClick={() => move(Math.max(0, slide - 1))}>‹</button>
          <button aria-label="Next testimonial" onClick={() => move(Math.min(TESTIMONIALS.length - 1, slide + 1))}>›</button>
        </div>
      </div>
      <div className="testimonials__viewport">
        <div ref={trackRef} className="testimonials__track">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="testimonial-card">
              <div className="testimonial-card__stars">★★★★★</div>
              <p className="testimonial-card__quote">{t.quote}</p>
              <div className="testimonial-card__name">{t.name}</div>
              <div className="testimonial-card__role">{t.role}</div>
              <div className="testimonial-card__note">PLACEHOLDER — AWAITING VERIFIED TESTIMONIAL</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
