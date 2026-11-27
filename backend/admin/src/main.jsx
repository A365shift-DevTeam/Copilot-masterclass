import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './design-system.css' // Ambot365 Design System: tokens and ds-* components
import './styles.css'
import './ds-skin.css' // this app's components on the design system
import './list-design.css' // list pages: toolbar, filter drawer, table, pagination (copied from the design system)

// A bug in one screen shows this instead of a blank page.
class Crash extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="empty" role="alert" style={{ minHeight: '100vh', alignContent: 'center' }}>
        <h1 className="page-head">Something went wrong on this screen</h1>
        <p>Your last save, if any, was sent before this happened. Reload to carry on.</p>
        <p className="muted">{String(this.state.error.message ?? this.state.error)}</p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>Reload</button>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Crash>
      <App />
    </Crash>
  </React.StrictMode>
)
