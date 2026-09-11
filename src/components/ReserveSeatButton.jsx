import ReserveSeatLabel from './ReserveSeatLabel.jsx'

/**
 * The seat CTA as it repeats down the page, once at the end of each section
 * that makes a case for attending. Hero, the ticket reveal and the seat
 * reveal each build their own pill with its own reveal mechanics; this is the
 * plain one, so the wording, gradient and ripple stay identical to theirs.
 */
export default function ReserveSeatButton({ className = '' }) {
  const handleClick = (e) => {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    const ripple = document.createElement('span')
    ripple.className = 'btn-ripple'
    ripple.style.left = `${e.clientX - rect.left}px`
    ripple.style.top = `${e.clientY - rect.top}px`
    btn.appendChild(ripple)
    setTimeout(() => ripple.remove(), 700)
  }

  return (
    <div className={`section-cta ${className}`.trim()}>
      <a href="#register" className="btn-primary" onClick={handleClick}>
        <ReserveSeatLabel />
        <span className="btn-shine" />
      </a>
    </div>
  )
}
