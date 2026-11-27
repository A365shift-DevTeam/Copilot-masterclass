import { useEffect, useState } from 'react'
import {
  Activity as ActivityIcon, BadgePercent, ClipboardList, CalendarClock, ExternalLink, KeyRound, LayoutDashboard, LogOut, Menu, Moon, ReceiptIndianRupee,
  Settings as SettingsIcon, Sun, UserRound, UsersRound,
} from 'lucide-react'
import { api } from './api.js'
import { ErrorNote, Toaster } from './ui.jsx'
import Overview from './pages/Overview.jsx'
import Payments from './pages/Payments.jsx'
import Customers from './pages/Customers.jsx'
import Registrations from './pages/Registrations.jsx'
import Programs from './pages/Programs.jsx'
import Offers from './pages/Offers.jsx'
import Settings from './pages/Settings.jsx'
import Team from './pages/Team.jsx'
import Activity from './pages/Activity.jsx'
import Account from './pages/Account.jsx'

const NAV = [
  { heading: 'Sales', pages: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, Page: Overview },
    { id: 'payments', label: 'Payments', icon: ReceiptIndianRupee, Page: Payments },
    { id: 'registrations', label: 'Registrations', icon: ClipboardList, Page: Registrations },
    { id: 'customers', label: 'Customers', icon: UserRound, Page: Customers },
  ] },
  { heading: 'Website', pages: [
    { id: 'programs', label: 'Pricing & dates', icon: CalendarClock, Page: Programs },
    { id: 'offers', label: 'Special offers', icon: BadgePercent, Page: Offers },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, Page: Settings },
  ] },
  { heading: 'Admin', pages: [
    { id: 'team', label: 'Team', icon: UsersRound, Page: Team },
    { id: 'activity', label: 'Activity', icon: ActivityIcon, Page: Activity },
    { id: 'account', label: 'My account', icon: KeyRound, Page: Account },
  ] },
]
const PAGES = NAV.flatMap((g) => g.pages)

/* The hash is "#page" or "#page/arg" (e.g. #payments/new opens the form), so
   reload and the back button keep your place. */
function route() {
  const [id, ...rest] = window.location.hash.slice(1).split('/')
  return PAGES.some((p) => p.id === id) ? { id, arg: decodeURIComponent(rest.join('/')) } : { id: 'overview', arg: '' }
}

// Same key and default as the landing site's toggle (frontend/src/components/Navbar.jsx).
function initialTheme() {
  try {
    const saved = localStorage.getItem('theme-pref')
    if (saved === 'dark' || saved === 'light') return saved
  } catch { /* storage unavailable */ }
  return 'light'
}

export default function App() {
  const [me, setMe] = useState(undefined) // undefined = checking, null = signed out
  const [{ id, arg }, setRoute] = useState(route)
  const [theme, setTheme] = useState(initialTheme)
  // Hamburger: on a desktop it folds the sidebar to icons (remembered); on a phone it slides the sidebar in.
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('rail-collapsed') === '1' } catch { return false } })
  const [navOpen, setNavOpen] = useState(false)
  useEffect(() => { try { localStorage.setItem('rail-collapsed', collapsed ? '1' : '0') } catch { /* storage unavailable */ } }, [collapsed])
  useEffect(() => setNavOpen(false), [id, arg]) // picking a page closes the phone menu
  const toggleNav = () => (window.matchMedia('(max-width: 820px)').matches ? setNavOpen((o) => !o) : setCollapsed((c) => !c))

  useEffect(() => {
    // The design system flips its tokens on html.dark.
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem('theme-pref', theme) } catch { /* storage unavailable */ }
  }, [theme])

  useEffect(() => {
    api('/auth/me').then(setMe, () => setMe(null))
    const out = () => setMe(null)
    const nav = () => setRoute(route())
    window.addEventListener('admin:signed-out', out)
    window.addEventListener('hashchange', nav)
    return () => {
      window.removeEventListener('admin:signed-out', out)
      window.removeEventListener('hashchange', nav)
    }
  }, [])

  const toggle = (
    <button type="button" className="rail__link" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
    </button>
  )

  if (me === undefined) return <div className="boot" aria-busy="true" />
  if (me === null) return <SignIn onSignedIn={setMe} />

  const { Page, label } = PAGES.find((p) => p.id === id)
  const signOut = () => api('/auth/logout', { method: 'POST' }).finally(() => setMe(null))

  return (
    <div className={`shell${collapsed ? ' shell--collapsed' : ''}`}>
      {navOpen && <div className="ds-sidebar-backdrop" onClick={() => setNavOpen(false)} />}
      <aside className={`rail${navOpen ? ' is-open' : ''}`} aria-label="Sidebar">
        <div className="brand">
          <img src="/logo-icon.webp" alt="" width="36" height="36" />
          <div>
            <strong>AmBot365</strong>
            <span>Copilot Masterclass admin</span>
          </div>
        </div>
        {NAV.map((g) => (
          <nav key={g.heading} className="rail__group" aria-label={g.heading}>
            <span className="rail__heading">{g.heading}</span>
            {g.pages.map(({ id: pid, label, icon: Icon }) => (
              <a key={pid} href={`#${pid}`} className="rail__link" aria-current={pid === id ? 'page' : undefined} title={label}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}
          </nav>
        ))}
        {me.siteUrl && (
          <a className="rail__link" href={me.siteUrl} target="_blank" rel="noopener noreferrer" title="View website">
            <ExternalLink size={18} aria-hidden="true" />
            <span>View website</span>
          </a>
        )}
        <div className="rail__foot">
          <div className="rail__who">
            <strong>{me.name || me.email}</strong>
            {me.name && <span>{me.email}</span>}
          </div>
          {toggle}
          <button type="button" className="rail__link" onClick={signOut} title="Sign out">
            <LogOut size={18} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button type="button" className="ds-topbar-btn" onClick={toggleNav} aria-label="Toggle menu" aria-expanded={navOpen || !collapsed}>
            <Menu size={18} aria-hidden="true" />
          </button>
          <span className="topbar__title">{label}</span>
        </header>
        <main className="main" aria-label={label}>
          <Page key={`${id}/${arg}`} arg={arg} me={me} />
        </main>
      </div>
      <Toaster />
    </div>
  )
}

function SignIn({ onSignedIn }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      onSignedIn(await api('/auth/login', { method: 'POST', body: { email: form.get('email'), password: form.get('password') } }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="signin ds-force-light">
      <form className="signin__card" onSubmit={submit}>
        <img src="/logo-icon.webp" alt="AmBot365" width="44" height="44" />
        <h1>Sign in</h1>
        <label className="field">
          <span className="field__label">Email</span>
          <input name="email" type="email" autoComplete="username" required autoFocus />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
