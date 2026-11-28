/**
 * Participant feedback as a band under the founder, not a section of its own.
 *
 * One row of cards scrolling forever. The track holds two identical halves
 * and travels exactly -50%, so the instant the first half leaves the frame
 * the second stands where it began and the loop has no seam. Each half
 * repeats the list so a half always overflows the container and no gap can
 * open at the end of a pass. Only the first half is read out.
 *
 * The row pauses on hover so a card can be read, and under reduced motion it
 * stops and becomes a normal scrollable strip.
 */
import { fill } from '../data/content.js'

function Stars({ rating, label }) {
  return (
    <div className="testimonial-card__stars" aria-label={fill(label, { n: rating })}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'is-on' : undefined} aria-hidden="true">★</span>
      ))}
    </div>
  )
}

function Card({ t, ratingLabel }) {
  return (
    <figure className="testimonial-card">
      <Stars rating={Number(t.rating)} label={ratingLabel} />
      <blockquote className="testimonial-card__quote">{t.quote}</blockquote>
      <figcaption>
        <span className="testimonial-card__name">{t.name}</span>
        <span className="testimonial-card__role">{t.role}</span>
      </figcaption>
    </figure>
  )
}

/* Part of the Speaker section; the testimonials are its content. */
export default function FeedbackStrip({ label, items, ratingLabel }) {
  if (!items.length) return null
  const half = items.map((t, i) => <Card key={i} t={t} ratingLabel={ratingLabel} />)

  return (
    <div className="feedback-strip">
      <p className="feedback-strip__label">{label}</p>
      <div className="marquee">
        <div className="marquee__track">
          <div className="marquee__half">{half}</div>
          <div className="marquee__half" aria-hidden="true">{half}</div>
        </div>
      </div>
    </div>
  )
}
