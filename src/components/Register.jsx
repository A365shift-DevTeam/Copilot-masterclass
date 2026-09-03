import { useState } from 'react'
import useReveal from '../hooks/useReveal.js'
import { INCLUDED } from '../data/content.js'
import BorderBeam from './ui/BorderBeam.jsx'

export default function Register() {
  const priceRef = useReveal()
  const formRef = useReveal()
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="register" className="section--subtle" style={{ padding: 'var(--section-pad)' }}>
      <div className="register-grid">
        <div ref={priceRef} className="pricing-card">
          <BorderBeam duration={8} />
          <div className="pricing-card__eyebrow">SPECIAL WEBINAR ACCESS</div>
          <div className="pricing-card__price-row">
            <span className="pricing-card__price">₹499</span>
            {/* <span className="pricing-card__strike">₹[VALUE]</span> */}
          </div>
          <div className="pricing-card__note">Or configure as a free webinar with limited registration.</div>
          <div className="pricing-card__list">
            {INCLUDED.map((i) => (
              <div key={i} className="pricing-card__list-item"><span style={{ color: '#6BD194', fontWeight: 700 }}>✓</span>{i}</div>
            ))}
          </div>
          <div className="pricing-card__banner">Limited seats available — registration closes when the room is full.</div>
        </div>

        <div ref={formRef} className="register-card">
          {submitted ? (
            <div className="register-success">
              <div>
                <div className="register-success__icon">✓</div>
                <h3>Your seat is reserved</h3>
                <p>We have sent the joining details to your email. Add the session to your calendar so you do not miss it.</p>
                <button onClick={() => setSubmitted(false)}>Register another person</button>
              </div>
            </div>
          ) : (
            <div>
              <h3>Reserve your seat</h3>
              <p className="register-card__sub">Takes under a minute. Confirmation is sent by email.</p>
              <form className="register-form" onSubmit={handleSubmit}>
                <label className="full">
                  <span className="field-label">Full name</span>
                  <input required name="name" placeholder="Your full name" />
                </label>
                <label>
                  <span className="field-label">Business email</span>
                  <input required type="email" name="email" placeholder="name@company.com" />
                </label>
                <label>
                  <span className="field-label">Phone / WhatsApp</span>
                  <input required name="phone" placeholder="+91" />
                </label>
                <label>
                  <span className="field-label">Company / institution</span>
                  <input name="company" placeholder="Organisation name" />
                </label>
                <label>
                  <span className="field-label">Job role</span>
                  <input name="role" placeholder="e.g. Operations Manager" />
                </label>
                <label>
                  <span className="field-label">City</span>
                  <input name="city" placeholder="City" />
                </label>
                <label>
                  <span className="field-label">Microsoft 365 user?</span>
                  <select name="m365" defaultValue="Yes">
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </label>
                <label className="consent">
                  <input required type="checkbox" />
                  <span>I agree to receive webinar communications from AmBot365.</span>
                </label>
                <button type="submit">Reserve My Seat</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
