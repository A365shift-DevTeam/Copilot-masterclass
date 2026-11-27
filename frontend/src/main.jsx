import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// The one extra route: the payment page redirects to /thank-you after a
// successful checkout. Everything else is the single-page landing site.
const isThankYou = /^\/thank-you\/?$/.test(window.location.pathname)

const render = (Page) =>
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Page />
    </React.StrictMode>
  )

// The thank-you page is its own chunk, so the landing page never downloads its
// confetti and the motion library behind it (~140KB).
if (isThankYou) import('./pages/ThankYou.jsx').then((m) => render(m.default))
else render(App)
