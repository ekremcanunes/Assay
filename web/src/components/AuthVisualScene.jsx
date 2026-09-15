import { useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { APP_NAME } from '../lib/app'

const CELL = 34 // .paper ızgarasıyla aynı
const STEP = 17
const RADIUS = 130
const PULL = 14

const VB_W = 700
const VB_H = 320
const PAD = 16
const COUNT = 36
const MA = 5

// Temsili seri — veri değil; sabit tohumla her yüklemede aynı. Rakam/eksen gösterilmez (DESIGN.md §6).
const CANDLES = (() => {
  let seed = 11
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  let price = 100
  const raw = Array.from({ length: COUNT }, () => {
    const o = price
    const c = o + (rnd() - 0.4) * 6
    const h = Math.max(o, c) + rnd() * 2.5
    const l = Math.min(o, c) - rnd() * 2.5
    price = c
    return { o, h, l, c }
  })
  const min = Math.min(...raw.map((k) => k.l))
  const max = Math.max(...raw.map((k) => k.h))
  const y = (v) => PAD + ((max - v) / (max - min)) * (VB_H - 2 * PAD)
  const step = VB_W / COUNT
  return raw.map((k, i) => ({
    x: step * (i + 0.5),
    w: step * 0.56,
    yo: y(k.o),
    yc: y(k.c),
    yh: y(k.h),
    yl: y(k.l),
    up: k.c >= k.o,
  }))
})()

const MA_PATH = CANDLES.slice(MA - 1)
  .map((k, i) => {
    const avg = CANDLES.slice(i, i + MA).reduce((s, c) => s + c.yc, 0) / MA
    return `${i ? 'L' : 'M'}${k.x.toFixed(1)} ${avg.toFixed(1)}`
  })
  .join(' ')

export default function AuthVisualScene() {
  const { t } = useLanguage()
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const cursorRef = useRef(null)
  const svgRef = useRef(null)
  const candleRefs = useRef([])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const cursor = cursorRef.current
    const svg = svgRef.current
    const candles = candleRefs.current
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const color = `hsl(${getComputedStyle(wrap).getPropertyValue('--border').trim()})`

    let w = 0, h = 0, ox = 0, oy = 0, dpr = 1
    let pointer = null
    const lens = { x: 0, y: 0, s: 0 }
    let raf = 0
    let active = -1

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

    // DOM'a doğrudan yazılır; hover React render'ı tetiklemez.
    const lift = (idx) => {
      if (idx === active) return
      for (let j = active - 1; j <= active + 1; j++) if (candles[j]) candles[j].style.transform = ''
      if (idx >= 0) {
        for (let j = idx - 1; j <= idx + 1; j++) {
          if (candles[j]) candles[j].style.transform = `translateY(${j === idx ? -4 : -2}px)`
        }
      }
      active = idx
    }

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
      } else {
        pointer = null
      }

      const s = svg.getBoundingClientRect()
      const overChart =
        e.clientX >= s.left && e.clientX < s.right && e.clientY >= s.top && e.clientY <= s.bottom
      const idx = overChart ? Math.floor(((e.clientX - s.left) / s.width) * COUNT) : -1
      lift(idx)
      if (idx >= 0) {
        cursor.style.transform = `translate3d(${s.left - r.left + (idx + 0.5) * (s.width / COUNT)}px,0,0)`
      }
      cursor.style.opacity = idx >= 0 ? '1' : '0'
      wake()
    }
    const onLeave = () => {
      pointer = null
      lift(-1)
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
      <div className="absolute inset-0 flex flex-col justify-center px-10">
        <div className="mb-4 flex items-baseline gap-2">
          <span className="label text-foreground">{APP_NAME}</span>
          <span className="text-micro text-muted-foreground">{t('auth.illustrative')}</span>
        </div>
        <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`} className="block h-auto w-full">
          {CANDLES.map((k, i) => (
            <g
              key={i}
              ref={(el) => { candleRefs.current[i] = el }}
              fill={k.up ? 'hsl(var(--up))' : 'hsl(var(--down))'}
              stroke={k.up ? 'hsl(var(--up))' : 'hsl(var(--down))'}
              className="transition-transform duration-[110ms] ease-[cubic-bezier(0,0,.38,.9)] motion-reduce:transition-none"
            >
              <line x1={k.x} x2={k.x} y1={k.yh} y2={k.yl} strokeWidth="1.2" />
              <rect
                x={k.x - k.w / 2}
                y={Math.min(k.yo, k.yc)}
                width={k.w}
                height={Math.max(1.5, Math.abs(k.yc - k.yo))}
                strokeWidth="0"
              />
            </g>
          ))}
          <path
            d={MA_PATH}
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
