import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ThankYou from './pages/ThankYou.jsx'
import './styles.css'

// The one extra route: the payment page redirects to /thank-you after a
// successful checkout. Everything else is the single-page landing site.
const isThankYou = /^\/thank-you\/?$/.test(window.location.pathname)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isThankYou ? <ThankYou /> : <App />}
  </React.StrictMode>
)
