import { useEffect, useRef } from 'react'

const CELL = 34 // .paper ızgarasıyla aynı
const STEP = 17
const RADIUS = 130
const PULL = 14

// Süs eğrisi — veri değil; rakam/eksen yok (DESIGN.md §6).
const CURVE =
  'M0 290 C 50 284, 80 246, 130 256 S 220 196, 270 210 S 360 150, 410 168 S 490 96, 550 112 S 640 58, 700 36'

export default function AuthVisualScene() {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const cursorRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const cursor = cursorRef.current
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const color = `hsl(${getComputedStyle(wrap).getPropertyValue('--border').trim()})`

    let w = 0, h = 0, ox = 0, oy = 0, dpr = 1
    let pointer = null
    const lens = { x: 0, y: 0, s: 0 }
    let raf = 0

    const bend = (x, y) => {
      if (lens.s === 0) return [x, y]
      const dx = lens.x - x
      const dy = lens.y - y
      const d = Math.hypot(dx, dy)
      if (d === 0 || d >= RADIUS) return [x, y]
      const k = Math.min(d, (1 - d / RADIUS) ** 2 * PULL * lens.s) / d
      return [x + dx * k, y + dy * k]
    }

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      // Çizgileri ebeveyndeki .paper ızgarasının orijinine hizala.
      for (let x = (CELL - (ox % CELL)) % CELL + 0.5; x <= w; x += CELL) {
        for (let y = 0; y < h + STEP; y += STEP) {
          const [px, py] = bend(x, Math.min(y, h))
          if (y === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
      }
      for (let y = (CELL - (oy % CELL)) % CELL + 0.5; y <= h; y += CELL) {
        for (let x = 0; x < w + STEP; x += STEP) {
          const [px, py] = bend(Math.min(x, w), y)
          if (x === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
      }
      ctx.stroke()
    }

    // Döngü yalnızca mercek hareket halindeyken döner; durunca CPU harcamaz.
    const tick = () => {
      const goal = pointer ? 1 : 0
      lens.s += (goal - lens.s) * 0.18
      if (pointer) {
        lens.x += (pointer.x - lens.x) * 0.3
        lens.y += (pointer.y - lens.y) * 0.3
      }
      const settled =
        Math.abs(goal - lens.s) < 0.01 &&
        (!pointer || Math.hypot(pointer.x - lens.x, pointer.y - lens.y) < 0.5)
      if (settled) {
        lens.s = goal
        raf = 0
      } else {
        raf = requestAnimationFrame(tick)
      }
      draw()
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick) }

    const resize = () => {
      const r = wrap.getBoundingClientRect()
      const p = wrap.parentElement.getBoundingClientRect()
      w = r.width
      h = r.height
      ox = r.left - p.left
      oy = r.top - p.top
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      draw()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    if (reduced) return () => ro.disconnect()

    const onMove = (e) => {
      const r = wrap.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height
      if (inside) {
        if (!pointer && lens.s === 0) { lens.x = x; lens.y = y }
        pointer = { x, y }
        cursor.style.transform = `translate3d(${x}px,0,0)`
      } else {
        pointer = null
      }
      cursor.style.opacity = inside ? '1' : '0'
      wake()
    }
    const onLeave = () => {
      pointer = null
      cursor.style.opacity = '0'
      wake()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div ref={wrapRef} aria-hidden="true" className="pointer-events-none relative ml-12 flex-1 self-stretch">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{
          maskImage: 'radial-gradient(closest-side, #000 60%, transparent)',
          WebkitMaskImage: 'radial-gradient(closest-side, #000 60%, transparent)',
        }}
      />
      <div
        ref={cursorRef}
        className="absolute inset-y-0 left-0 w-px bg-foreground/20 opacity-0 transition-opacity duration-150"
      />
      <div className="absolute inset-0 flex items-center px-10">
        <svg viewBox="0 0 700 320" className="block h-auto w-full text-foreground">
          <path d={CURVE} fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".75" />
          <path
            d={CURVE}
            fill="none"
            stroke="hsl(var(--voltage))"
            strokeWidth="1.7"
            strokeDasharray="5 7"
            className="[animation:flow_1.5s_linear_infinite] motion-reduce:[animation:none]"
          />
        </svg>
      </div>
    </div>
  )
}
