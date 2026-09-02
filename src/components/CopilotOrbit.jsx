import { useEffect, useRef } from 'react'

const CDN = 'https://cdn.jsdelivr.net/gh/DamoBird365/microsoft-cloud-icons@master/icons/'

const RINGS = [
  { R: 150, ax: 62, az: -8, dur: 20, dir: 1 },
  { R: 215, ax: 67, az: 14, dur: 29, dir: -1 },
  { R: 280, ax: 55, az: -18, dur: 38, dir: 1 },
]

const APPS = [
  { id: 'excel', name: 'Excel', mono: 'X', file: 'microsoft-365/excel.svg', ring: 0, mRing: 0, tip: 'Analyse • Calculate • Automate' },
  { id: 'word', name: 'Word', mono: 'W', file: 'microsoft-365/word.svg', ring: 0, mRing: 0, tip: 'Write • Summarise • Create' },
  { id: 'powerpoint', name: 'PowerPoint', mono: 'P', file: 'microsoft-365/powerpoint.svg', ring: 0, mRing: 0, tip: 'Create • Design • Present' },
  { id: 'outlook', name: 'Outlook', mono: 'O', file: 'microsoft-365/outlook.svg', ring: 0, mRing: 1, tip: 'Draft • Summarise • Prioritise' },
  { id: 'teams', name: 'Teams', mono: 'T', file: 'microsoft-365/teams.svg', ring: 1, mRing: 1, tip: 'Meet • Collaborate • Summarise' },
  { id: 'onedrive', name: 'OneDrive', mono: 'D', file: 'microsoft-365/onedrive.svg', ring: 1, mRing: -1, tip: 'Store • Access • Share' },
  { id: 'sharepoint', name: 'SharePoint', mono: 'S', file: 'microsoft-365/sharepoint.svg', ring: 1, mRing: -1, tip: 'Knowledge • Content • Collaboration' },
  { id: 'forms', name: 'Forms', mono: 'F', file: 'microsoft-365/forms.svg', ring: 1, mRing: -1, tip: 'Collect • Analyse • Respond' },
  { id: 'powerbi', name: 'Power BI', mono: 'B', file: 'power-platform/power-bi.svg', ring: 2, mRing: 1, tip: 'Analyse • Visualise • Discover' },
  { id: 'powerapps', name: 'Power Apps', mono: 'A', file: 'power-platform/power-apps.svg', ring: 2, mRing: -1, tip: 'Build • Connect • Transform' },
  { id: 'powerautomate', name: 'Power Automate', mono: 'U', file: 'power-platform/power-automate.svg', ring: 2, mRing: -1, tip: 'Automate • Trigger • Execute' },
  { id: 'copilotstudio', name: 'Copilot Studio', mono: 'C', file: 'power-platform/copilot-studio.svg', ring: 2, mRing: -1, tip: 'Build • Customize • Deploy Agents' },
]

const LINKS = [
  { id: 'excel', text: 'Analyse Data' },
  { id: 'outlook', text: 'Draft Email' },
  { id: 'teams', text: 'Summarise Meeting' },
  { id: 'powerpoint', text: 'Create Presentation' },
  { id: 'powerautomate', text: 'Automate Workflow' },
]

const RAD = Math.PI / 180
const RING_GRADS = [
  { id: 'orbGradA', x1: 0, y1: 0, x2: 1, y2: 1, stops: [['0%', '#A4D4E3', 0.3], ['45%', '#6AB8D2', 0.07], ['100%', '#C3E093', 0.28]], pulse: '#C3E093', pulseOp: 0.65, dash: '4 96', anim: 'orb-ringpulse 7s linear infinite' },
  { id: 'orbGradB', x1: 1, y1: 0, x2: 0, y2: 1, stops: [['0%', '#6AB8D2', 0.26], ['50%', '#128CA8', 0.06], ['100%', '#A4D4E3', 0.24]], pulse: '#6AB8D2', pulseOp: 0.6, dash: '3 97', anim: 'orb-ringpulse 11s linear infinite reverse' },
  { id: 'orbGradC', x1: 0, y1: 1, x2: 1, y2: 0, stops: [['0%', '#C3E093', 0.22], ['55%', '#75B734', 0.05], ['100%', '#6AB8D2', 0.22]], pulse: '#8BBF2F', pulseOp: 0.5, dash: '3 97', anim: 'orb-ringpulse 15s linear infinite' },
]

class OrbitEngine {
  constructor(root) {
    this.root = root
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // One shared rotation per ring plus a fixed, evenly-spaced offset per app.
    // Advancing apps individually let their spacing drift (hover slowdown,
    // compact/desktop switches) until icons overlapped.
    this.ringAngles = [0, 0, 0]
    this.offsets = {}
    this.els = {}
    this.pos = {}
    this.hover = null
    this.mouse = { x: 0, y: 0 }
    this.tilt = { x: 0, y: 0 }
    this.visible = true
    this.init()
  }

  q(sel) { return this.root.querySelector(sel) }

  loadIcon(img, file, onFail) {
    img.addEventListener('error', () => {
      img.style.display = 'none'
      if (onFail) onFail()
    })
    img.src = CDN + file
  }

  init() {
    this.stage = this.q('[data-stage]')
    this.tip = this.q('[data-tip]')
    this.beamLine = this.q('[data-beam-line]')
    this.beamLabel = this.q('[data-beam-label]')
    this.beamDots = [0, 1, 2].map((i) => this.q(`[data-beam-dot="${i}"]`))

    const coreIcon = this.q('[data-core-icon]')
    if (coreIcon) this.loadIcon(coreIcon, 'copilot/copilot-365.svg')

    APPS.forEach((app) => {
      const el = this.q(`[data-app="${app.id}"]`)
      if (!el) return
      this.els[app.id] = el
      const img = el.querySelector('[data-app-icon]')
      const fb = el.querySelector('[data-app-fallback]')
      if (img) this.loadIcon(img, app.file, () => { if (fb) fb.style.display = 'flex' })
      const hit = el.querySelector('[data-app-hit]')
      const show = () => this.showTip(app)
      const hide = () => { this.hover = null; if (this.tip) this.tip.style.opacity = '0' }
      hit.addEventListener('mouseenter', show)
      hit.addEventListener('mouseleave', hide)
      hit.addEventListener('focus', show)
      hit.addEventListener('blur', hide)
      hit.addEventListener('click', (e) => { e.preventDefault(); this.hover === app.id ? hide() : show() })
    })

    this.layout()
    this.ro = new ResizeObserver(() => {
      clearTimeout(this.roT)
      this.roT = setTimeout(() => this.layout(), 90)
    })
    this.ro.observe(this.root)

    // The ResizeObserver misses viewport changes when the oversized stage is
    // what holds the root's width, so track the window directly too.
    this.onWinResize = () => {
      clearTimeout(this.roT)
      this.roT = setTimeout(() => this.layout(), 90)
    }
    window.addEventListener('resize', this.onWinResize, { passive: true })

    this.onMove = (e) => {
      const r = this.root.getBoundingClientRect()
      this.mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2
      this.mouse.y = ((e.clientY - r.top) / r.height - 0.5) * 2
    }
    window.addEventListener('mousemove', this.onMove, { passive: true })

    this.io = new IntersectionObserver((en) => {
      this.visible = en[0].isIntersecting || en[0].intersectionRatio > 0
      if (this.visible) this.resume()
    }, { threshold: 0, rootMargin: '120px' })
    this.io.observe(this.root)

    this.t0 = performance.now()
    this.last = this.t0
    if (this.reduced) { this.frame(0); return }
    this.tick()
    this.introTimer = setTimeout(() => this.scheduleLink(), 1400)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    clearInterval(this.timer)
    clearTimeout(this.linkTimer)
    clearTimeout(this.introTimer)
    clearTimeout(this.roT)
    if (this.io) this.io.disconnect()
    if (this.ro) this.ro.disconnect()
    if (this.onMove) window.removeEventListener('mousemove', this.onMove)
    if (this.onWinResize) window.removeEventListener('resize', this.onWinResize)
  }

  ringTransform(i, scale) {
    const r = RINGS[i]
    return `rotateZ(${r.az}deg) rotateX(${r.ax}deg) scale(${scale})`
  }

  layout() {
    if (!this.stage) return
    const root = this.root
    const parent = root.parentElement
    const w = Math.min(root.clientWidth || Infinity, parent ? parent.clientWidth || Infinity : Infinity, window.innerWidth) || window.innerWidth
    const h = Math.max(root.clientHeight || 0, 360)
    const vh = window.innerHeight
    this.compact = window.innerWidth < 760
    // Compact screens get a larger share of the viewport so the composition
    // reads at phone size instead of shrinking with the desktop clamps.
    const size = this.compact
      ? Math.max(300, Math.min(520, w, vh * 0.62))
      : Math.max(260, Math.min(660, w, h * 1.05, vh * 0.74))
    this.radii = this.compact ? [0.34 * size, 0.44 * size, 0] : [0.30 * size, 0.393 * size, 0.478 * size]
    this.stage.style.width = size + 'px'
    this.stage.style.height = size + 'px'

    ;[0, 1, 2].forEach((i) => {
      const ring = this.q(`[data-ring="${i}"]`)
      if (!ring) return
      const hidden = this.compact && i === 2
      ring.style.display = hidden ? 'none' : 'block'
      const d = this.radii[i] * 2
      ring.style.width = d + 'px'
      ring.style.height = d + 'px'
      ring.style.margin = `${-d / 2}px 0 0 ${-d / 2}px`
      ring.style.transform = this.ringTransform(i, 1)
    })

    const core = this.q('[data-core]')
    if (core) {
      const cs = Math.max(86, 0.17 * size)
      core.style.width = cs + 'px'
      core.style.height = cs + 'px'
      const ci = core.querySelector('[data-core-icon]')
      if (ci) { ci.style.width = cs * 0.34 + 'px'; ci.style.height = cs * 0.34 + 'px' }
      const cl = core.querySelectorAll('[data-core-label] div')
      if (cl[0]) cl[0].style.fontSize = Math.max(7, cs * 0.062) + 'px'
      if (cl[1]) cl[1].style.fontSize = Math.max(9, cs * 0.082) + 'px'
    }

    const compactChanged = this.prevCompact !== this.compact
    this.prevCompact = this.compact
    APPS.forEach((app) => {
      const el = this.els[app.id]
      if (!el) return
      const ringIdx = this.compact ? app.mRing : app.ring
      el.style.display = ringIdx < 0 ? 'none' : 'block'
      if (ringIdx >= 0 && (compactChanged || this.offsets[app.id] === undefined)) {
        const peers = APPS.filter((a) => (this.compact ? a.mRing : a.ring) === ringIdx)
        this.offsets[app.id] = (peers.indexOf(app) / peers.length) * Math.PI * 2 + ringIdx * 0.5
      }
      const img = el.querySelector('[data-app-icon]')
      const fb = el.querySelector('[data-app-fallback]')
      const isz = Math.max(28, Math.min(46, 0.062 * size))
      if (img) { img.style.width = isz + 'px'; img.style.height = isz + 'px' }
      if (fb) { fb.style.width = isz + 'px'; fb.style.height = isz + 'px' }
    })
    this.frame(0)
    this.resume()
  }

  project(app, ringIdx) {
    const r = RINGS[ringIdx]
    const R = (this.radii && this.radii[ringIdx]) || r.R
    const t = this.ringAngles[ringIdx] + (this.offsets[app.id] || 0)
    const ax = r.ax * RAD
    const az = r.az * RAD
    const x0 = Math.cos(t) * R
    const y0 = Math.sin(t) * R * Math.cos(ax)
    const z = Math.sin(t) * R * Math.sin(ax)
    const x = x0 * Math.cos(az) - y0 * Math.sin(az)
    const y = x0 * Math.sin(az) + y0 * Math.cos(az)
    const zn = z / (R * Math.sin(ax) || 1)
    return { x, y, z, zn }
  }

  ramp(delay, dur) {
    if (this.reduced) return 1
    if (!this.t0) this.t0 = performance.now()
    const t = (performance.now() - this.t0 - delay) / dur
    return Math.max(0, Math.min(1, t))
  }

  frame(dt) {
    const damp = 0.055
    const stageIn = this.ramp(60, 620)
    this.tilt.x += (this.mouse.y * -3.6 - this.tilt.x) * damp
    this.tilt.y += (this.mouse.x * 4 - this.tilt.y) * damp
    if (this.stage) {
      const sc = 0.9 + 0.1 * stageIn
      this.stage.style.opacity = stageIn.toFixed(3)
      this.stage.style.transform = `rotateX(${this.tilt.x.toFixed(2)}deg) rotateY(${this.tilt.y.toFixed(2)}deg) scale(${sc.toFixed(3)})`
    }
    ;[0, 1, 2].forEach((i) => {
      const ring = this.q(`[data-ring="${i}"]`)
      if (!ring || ring.style.display === 'none') return
      const r = this.ramp(240 + i * 170, 640)
      ring.style.opacity = r.toFixed(3)
      ring.style.transform = this.ringTransform(i, 0.6 + 0.4 * r)
    })
    if (dt) {
      // Hovering pauses the whole ring, not one icon, so spacing stays even.
      let hoverRing = -1
      if (this.hover) {
        const ha = APPS.find((a) => a.id === this.hover)
        if (ha) hoverRing = this.compact ? ha.mRing : ha.ring
      }
      ;[0, 1, 2].forEach((i) => {
        const slow = hoverRing === i ? 0.22 : 1
        this.ringAngles[i] += RINGS[i].dir * slow * ((Math.PI * 2) / RINGS[i].dur) * dt
      })
    }
    let n = 0
    APPS.forEach((app) => {
      const el = this.els[app.id]
      if (!el || el.style.display === 'none') return
      const ringIdx = this.compact ? app.mRing : app.ring
      const p = this.project(app, ringIdx)
      this.pos[app.id] = p
      const depth = (p.zn + 1) / 2
      const base = 0.76 + depth * 0.42
      const s = base * (this.hover === app.id ? 1.15 : 1)
      el.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) scale(${s.toFixed(3)})`
      el.style.zIndex = String(Math.round(10 + depth * 40))
      const appIn = this.ramp(700 + n * 70, 520)
      n += 1
      el.style.opacity = ((0.58 + depth * 0.42) * appIn).toFixed(3)
      el.style.filter = p.zn < 0 ? `blur(${(Math.abs(p.zn) * 0.9).toFixed(2)}px)` : 'none'
      if (this.hover === app.id) this.placeTip(p)
    })
  }

  resume() {
    if (this.reduced) return
    this.last = performance.now()
    if (!this.raf) this.tick()
    // rAF is starved while the document is hidden (previews, background tabs);
    // a low-rate timer keeps the composition advancing either way.
    if (!this.timer) this.timer = setInterval(() => { if (this.visible) this.step() }, 40)
  }

  step() {
    const now = performance.now()
    const dt = Math.min(0.05, Math.max(0, (now - (this.last || now)) / 1000))
    this.last = now
    this.frame(dt)
  }

  tick = () => {
    if (!this.visible) { this.raf = null; return }
    this.step()
    this.raf = requestAnimationFrame(this.tick)
  }

  showTip(app) {
    this.hover = app.id
    if (!this.tip) return
    const t = this.q('[data-tip-title]')
    const s = this.q('[data-tip-sub]')
    if (t) t.textContent = app.name.toUpperCase()
    if (s) s.textContent = app.tip
    this.tip.style.opacity = '1'
    const p = this.pos[app.id]
    if (p) this.placeTip(p)
  }

  placeTip(p) {
    if (!this.tip) return
    this.tip.style.left = `calc(50% + ${p.x.toFixed(1)}px)`
    this.tip.style.top = `calc(50% + ${(p.y - 40).toFixed(1)}px)`
  }

  scheduleLink() {
    if (this.reduced) return
    this.linkTimer = setTimeout(() => { this.fireLink(); this.scheduleLink() }, 4200 + Math.random() * 2400)
  }

  fireLink() {
    if (!this.visible || !this.beamLine) return
    const pool = LINKS.filter((l) => this.els[l.id] && this.els[l.id].style.display !== 'none')
    if (!pool.length) return
    this.linkIdx = ((this.linkIdx || 0) + 1) % pool.length
    const link = pool[this.linkIdx]
    const p = this.pos[link.id]
    if (!p) return
    const dist = Math.hypot(p.x, p.y)
    const ang = (Math.atan2(p.y, p.x) * 180) / Math.PI
    const line = this.beamLine
    line.style.transition = 'none'
    line.style.width = '0px'
    line.style.transform = `rotate(${ang.toFixed(2)}deg)`
    line.style.opacity = '1'
    requestAnimationFrame(() => {
      line.style.transition = 'width 620ms cubic-bezier(.4,0,.2,1), opacity 400ms'
      line.style.width = dist.toFixed(1) + 'px'
    })
    this.beamDots.forEach((dot, i) => {
      if (!dot) return
      dot.style.transition = 'none'
      dot.style.transform = 'translate(0,0)'
      dot.style.opacity = '0'
      setTimeout(() => {
        dot.style.transition = 'transform 900ms cubic-bezier(.4,0,.2,1), opacity 300ms'
        dot.style.opacity = '1'
        dot.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`
        setTimeout(() => { dot.style.opacity = '0' }, 780)
      }, 90 + i * 190)
    })
    if (this.beamLabel) {
      this.beamLabel.textContent = link.text
      this.beamLabel.style.left = (p.x * 0.52).toFixed(1) + 'px'
      this.beamLabel.style.top = (p.y * 0.52 - 14).toFixed(1) + 'px'
      this.beamLabel.style.opacity = '1'
    }
    setTimeout(() => {
      line.style.opacity = '0'
      if (this.beamLabel) this.beamLabel.style.opacity = '0'
    }, 1750)
  }
}

export default function CopilotOrbit() {
  const rootRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => {
      if (rootRef.current) rootRef.current._engine = new OrbitEngine(rootRef.current)
    }, 50)
    return () => {
      clearTimeout(t)
      if (rootRef.current && rootRef.current._engine) rootRef.current._engine.destroy()
    }
  }, [])

  return (
    <div ref={rootRef} className="orbit-root">
      <div className="orbit-stage" data-stage="1">
        <div className="orbit-halo" />
        <div className="orbit-floor" />
        <div className="orbit-floor-ring" />

        {RING_GRADS.map((g, i) => {
          const sizes = [300, 430, 560]
          const d = sizes[i]
          return (
            <div key={g.id} className="orbit-ring" data-ring={i} style={{ width: d, height: d, margin: `${-d / 2}px 0 0 ${-d / 2}px` }}>
              <svg viewBox="0 0 200 200">
                <defs>
                  <linearGradient id={g.id} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
                    {g.stops.map(([off, color, op]) => (
                      <stop key={off} offset={off} stopColor={color} stopOpacity={op} />
                    ))}
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="99" fill="none" stroke={`url(#${g.id})`} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <circle
                  cx="100" cy="100" r="99" pathLength="100" fill="none"
                  stroke={g.pulse} strokeOpacity={g.pulseOp} strokeWidth="1.4" strokeLinecap="round"
                  vectorEffect="non-scaling-stroke" strokeDasharray={g.dash}
                  style={{ animation: g.anim }}
                />
              </svg>
            </div>
          )
        })}

        <div className="orbit-beams">
          <div className="orbit-beam-line" data-beam-line="1" />
          <div className="orbit-beam-dot" data-beam-dot="0" style={{ width: 4, height: 4, margin: '-2px 0 0 -2px', background: '#D8EEB5', boxShadow: '0 0 10px rgba(216,238,181,0.9)' }} />
          <div className="orbit-beam-dot" data-beam-dot="1" style={{ width: 3, height: 3, margin: '-1.5px 0 0 -1.5px', background: '#A4D4E3', boxShadow: '0 0 8px rgba(164,212,227,0.9)' }} />
          <div className="orbit-beam-dot" data-beam-dot="2" style={{ width: 3, height: 3, margin: '-1.5px 0 0 -1.5px', background: '#8BBF2F', boxShadow: '0 0 8px rgba(139,191,47,0.9)' }} />
          <div className="orbit-beam-label" data-beam-label="1">Analyse Data</div>
        </div>

        <div className="orbit-core" data-core="1">
          <div className="orbit-core__breathe" />
          <div className="orbit-core__energy" />
          <div className="orbit-core__sweep" />
          <div className="orbit-core__ball">
            <img data-core-icon="1" alt="Microsoft 365 Copilot" />
          </div>
          <div className="orbit-core__label" data-core-label="1">
            <div className="orbit-core__label-sub">MICROSOFT 365</div>
            <div className="orbit-core__label-main">COPILOT</div>
          </div>
        </div>

        <div style={{ position: 'absolute', inset: 0 }}>
          {APPS.map((app) => (
            <div key={app.id} className="orbit-app" data-app={app.id}>
              <div className="orbit-app__hit" data-app-hit={app.id} role="button" tabIndex={0} aria-label={app.name}>
                <img data-app-icon={app.id} alt={app.name} />
                <span className="orbit-app__fallback" data-app-fallback={app.id}>{app.mono}</span>
                <span className="orbit-app__name">{app.name}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="orbit-tip" data-tip="1">
          <div className="orbit-tip__title" data-tip-title="1">EXCEL</div>
          <div className="orbit-tip__sub" data-tip-sub="1">Analyse • Calculate • Automate</div>
        </div>

        <div className="orbit-dust">
          <span style={{ left: '18%', top: '80%', background: '#A4D4E3', animation: 'orb-drift 12s linear infinite' }} />
          <span style={{ left: '42%', top: '88%', background: '#C3E093', animation: 'orb-drift 15s linear 3s infinite' }} />
          <span style={{ left: '68%', top: '84%', background: '#6AB8D2', animation: 'orb-drift 13s linear 6.5s infinite' }} />
          <span style={{ left: '84%', top: '78%', background: '#8BBF2F', animation: 'orb-drift 16s linear 9s infinite' }} />
        </div>
      </div>
    </div>
  )
}
