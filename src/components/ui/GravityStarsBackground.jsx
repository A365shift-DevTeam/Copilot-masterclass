import { useEffect, useRef } from 'react'

/**
 * Gravity stars background.
 *
 * A port of Animate UI's <GravityStarsBackground /> (credit: Skyleen, after
 * Brett Jackson's Framer component) to plain JS + canvas, since this project
 * has no Tailwind/TypeScript/shadcn toolchain. The prop names, types and
 * defaults match the documented API one for one.
 *
 * Stars drift slowly and are pulled toward (or pushed away from) the pointer
 * when it comes within `mouseInfluence` pixels, glowing as they react.
 */
export default function GravityStarsBackground({
  starsCount = 75,
  starsSize = 2,
  starsOpacity = 0.75,
  glowIntensity = 15,
  glowAnimation = 'ease',
  movementSpeed = 0.3,
  mouseInfluence = 100,
  mouseGravity = 'attract',
  gravityStrength = 75,
  starsInteraction = false,
  starsInteractionType = 'bounce',
  className = '',
  ...props
}) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  // Live prop mirror, so tweaking a prop never tears down the running field
  const optsRef = useRef(null)
  optsRef.current = {
    starsCount,
    starsSize,
    starsOpacity,
    glowIntensity,
    glowAnimation,
    movementSpeed,
    mouseInfluence,
    mouseGravity,
    gravityStrength,
    starsInteraction,
    starsInteractionType,
  }

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cssW = 0
    let cssH = 0
    let dpr = 1
    let stars = []
    let glowSprite = null
    let glowSpriteRadius = 0
    const pointer = { x: -1e4, y: -1e4, active: false }

    // A glow drawn once into an offscreen canvas and blitted per star. Canvas
    // shadowBlur would be the obvious route and is far too slow to run on 75
    // stars every frame alongside the scroll scrubber on this page.
    const buildGlowSprite = () => {
      const { starsSize: size, glowIntensity: glow } = optsRef.current
      const radius = Math.max(1, (size + glow) * 2)
      const d = Math.ceil(radius * 2)
      const off = document.createElement('canvas')
      off.width = d
      off.height = d
      const octx = off.getContext('2d')
      const g = octx.createRadialGradient(radius, radius, 0, radius, radius, radius)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.25, 'rgba(255,255,255,0.45)')
      g.addColorStop(0.6, 'rgba(255,255,255,0.12)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      octx.fillStyle = g
      octx.beginPath()
      octx.arc(radius, radius, radius, 0, Math.PI * 2)
      octx.fill()
      glowSprite = off
      glowSpriteRadius = radius
    }

    const spawn = () => {
      const { starsCount: count, starsSize: size, movementSpeed: speed } = optsRef.current
      stars = new Array(count)
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        // A little size spread reads as depth rather than a flat grid of dots
        const scale = 0.55 + Math.random() * 0.9
        stars[i] = {
          x: Math.random() * cssW,
          y: Math.random() * cssH,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: size * scale,
          mass: scale * scale,
          glow: 0,
          glowV: 0,
          twinkle: Math.random() * Math.PI * 2,
        }
      }
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      // 1x deliberately: nothing here resolves detail at 2x (2px dots and a
      // blurred glow sprite), and this sits behind a frame canvas that is
      // itself capped at 1x. A 2x buffer would mean clearing and 'lighter'-
      // blending ~7M pixels a frame for no visible gain.
      dpr = 1
      cssW = rect.width
      cssH = rect.height
      // Integer backing store: canvas.width truncates, so a fractional value
      // would never compare equal and would reallocate the buffer every frame
      const bw = Math.round(cssW * dpr)
      const bh = Math.round(cssH * dpr)
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw
        canvas.height = bh
      }
      if (stars.length === 0) spawn()
      else {
        for (const s of stars) {
          s.x = Math.min(s.x, cssW)
          s.y = Math.min(s.y, cssH)
        }
      }
    }

    const onPointerMove = (e) => {
      const rect = host.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      pointer.active =
        pointer.x >= 0 && pointer.x <= rect.width && pointer.y >= 0 && pointer.y <= rect.height
    }
    const onPointerLeave = () => {
      pointer.active = false
      pointer.x = -1e4
      pointer.y = -1e4
    }

    const stepGlow = (s, target, mode) => {
      if (mode === 'instant') {
        s.glow = target
        return
      }
      if (mode === 'spring') {
        // Critically-damped-ish spring; overshoots a touch, which is the point
        s.glowV += (target - s.glow) * 0.18
        s.glowV *= 0.72
        s.glow += s.glowV
        s.glow = Math.max(0, Math.min(1.35, s.glow))
        return
      }
      s.glow += (target - s.glow) * 0.12
    }

    const collide = (type) => {
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i]
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const minD = a.r + b.r
          const d2 = dx * dx + dy * dy
          if (d2 > minD * minD || d2 === 0) continue
          const d = Math.sqrt(d2)

          if (type === 'merge') {
            // Bigger absorbs smaller; the smaller respawns so the count holds
            const big = a.r >= b.r ? a : b
            const small = big === a ? b : a
            big.r = Math.min(big.r * 1.18, optsRef.current.starsSize * 3)
            big.mass += small.mass
            small.x = Math.random() * cssW
            small.y = Math.random() * cssH
            small.r = optsRef.current.starsSize * (0.55 + Math.random() * 0.9)
            small.mass = 1
            continue
          }

          // Elastic bounce along the collision normal
          const nx = dx / d
          const ny = dy / d
          const rvx = b.vx - a.vx
          const rvy = b.vy - a.vy
          const sep = rvx * nx + rvy * ny
          if (sep > 0) continue
          const imp = (2 * sep) / (a.mass + b.mass)
          a.vx += imp * b.mass * nx
          a.vy += imp * b.mass * ny
          b.vx -= imp * a.mass * nx
          b.vy -= imp * a.mass * ny
          // Push apart so they don't stick together on the next frame
          const overlap = (minD - d) / 2
          a.x -= nx * overlap
          a.y -= ny * overlap
          b.x += nx * overlap
          b.y += ny * overlap
        }
      }
    }

    const draw = () => {
      const o = optsRef.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)
      ctx.globalCompositeOperation = 'lighter'

      for (const s of stars) {
        const alpha = o.starsOpacity * (0.75 + 0.25 * Math.sin(s.twinkle))

        if (s.glow > 0.01 && glowSprite) {
          const size = glowSpriteRadius * 2 * (0.6 + s.glow * 0.9)
          ctx.globalAlpha = Math.min(1, alpha * s.glow)
          ctx.drawImage(glowSprite, s.x - size / 2, s.y - size / 2, size, size)
        }

        ctx.globalAlpha = Math.min(1, alpha)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    const update = () => {
      const o = optsRef.current
      const influence = o.mouseInfluence
      const pull = o.mouseGravity === 'repel' ? -1 : 1
      // gravityStrength is documented on a 0-100-ish scale; normalise it into
      // an acceleration that stays sane at the default of 75
      const strength = (o.gravityStrength / 75) * 0.35

      for (const s of stars) {
        s.twinkle += 0.02

        let target = 0
        if (pointer.active && influence > 0) {
          const dx = pointer.x - s.x
          const dy = pointer.y - s.y
          const d = Math.hypot(dx, dy)
          if (d < influence && d > 0.001) {
            const falloff = 1 - d / influence
            target = falloff
            const a = strength * falloff * falloff * pull
            s.vx += (dx / d) * a
            s.vy += (dy / d) * a
          }
        }
        stepGlow(s, target, o.glowAnimation)


        s.x += s.vx
        s.y += s.vy

        // Drag, then renormalise back toward the drift speed so the field never
        // slowly heats up or dies out after repeated gravity passes
        s.vx *= 0.985
        s.vy *= 0.985
        const speed = Math.hypot(s.vx, s.vy)
        if (speed > 0.0001) {
          const desired = o.movementSpeed
          const k = speed > desired * 4 ? 0.06 : 0.012
          const f = (desired - speed) * k
          s.vx += (s.vx / speed) * f
          s.vy += (s.vy / speed) * f
        }

        // Wrap around the edges
        const pad = s.r + 2
        if (s.x < -pad) s.x = cssW + pad
        else if (s.x > cssW + pad) s.x = -pad
        if (s.y < -pad) s.y = cssH + pad
        else if (s.y > cssH + pad) s.y = -pad

      }

      if (o.starsInteraction) collide(o.starsInteractionType)
    }

    let rafId = 0
    let running = false
    const tick = () => {
      if (!running) return
      rafId = requestAnimationFrame(tick)
      update()
      draw()
    }
    const start = () => {
      if (running || cssW === 0) return
      running = true
      rafId = requestAnimationFrame(tick)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(rafId)
    }

    // Only animate while the background is on screen and the tab is foregrounded
    let inView = false
    const sync = () => {
      if (inView && !document.hidden) start()
      else stop()
    }

    buildGlowSprite()
    resize()

    const ro = new ResizeObserver(() => {
      resize()
      buildGlowSprite()
      // start() bails while the element still measures zero, so re-sync here:
      // if the section was already in view at mount, this is the only thing
      // that gets the loop going.
      if (reduceMotion) draw()
      else sync()
    })
    ro.observe(host)

    if (reduceMotion) {
      // Honour the preference: place the field once and leave it still
      draw()
      return () => ro.disconnect()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        sync()
      },
      { rootMargin: '100px 0px' }
    )
    observer.observe(host)

    const onVisibility = sync

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer.disconnect()
      ro.disconnect()
      stop()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div ref={hostRef} className={`gravity-stars${className ? ` ${className}` : ''}`} {...props}>
      <canvas ref={canvasRef} className="gravity-stars__canvas" aria-hidden="true" />
    </div>
  )
}
