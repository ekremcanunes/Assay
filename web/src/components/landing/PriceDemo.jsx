import { useEffect, useRef, useState } from 'react'
import { DEMO_SYMBOLS, DEMO_TTL_MIN, demoAnswer } from '@/lib/priceDemo'
import { cn } from '@/lib/utils'

const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Rota çizgisi: istek geçerken soldan sağa dolar
function Wire({ run, ms }) {
  return (
    <div className="relative h-0.5 overflow-hidden rounded-full bg-border">
      {run && (
        <i
          key={run}
          className="absolute inset-0 origin-left bg-voltage"
          style={{ animation: REDUCE ? 'none' : `wire-fill ${ms}ms linear forwards` }}
        />
      )}
    </div>
  )
}

function Node({ label, glyph, tone }) {
  return (
    <div className="flex min-w-[56px] flex-col items-center gap-1 text-micro text-muted-foreground">
      <span className={cn('grid h-9 w-9 place-items-center rounded-lg font-mono text-ui font-semibold transition-colors',
        tone === 'on' ? 'bg-foreground text-background'
        : tone === 'hit' ? 'bg-up text-white'
        : tone === 'miss' ? 'bg-down text-white'
        : 'bg-secondary text-foreground')}
      >
        {glyph}
      </span>
      {label}
    </div>
  )
}

/*
  "Bir fiyat iste, nereden geldiğini gör" — önbelleği anlatmak yerine yaşatır:
  bir sembolün ilk isteği dış kaynağa gider (yavaş), sonrakiler önbellekten döner (anında).
  Canlandırmadır, gerçek istek atmaz — altında açıkça yazar (DESIGN.md veri dürüstlüğü).
*/
export default function PriceDemo() {
  const [cached, setCached] = useState(() => new Set())
  const [phase, setPhase] = useState(null) // null | { symbol, step: 1|2|3, answer }
  const timers = useRef([])
  const seq = useRef(0) // her istek yeni numara: çizgi animasyonu yalnız yeni istekte baştan başlar

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const ask = (symbol) => {
    if (phase && phase.step < 3) return
    const answer = demoAnswer(symbol, cached.has(symbol))
    const leg = answer.hit ? 120 : 600 // çizgi başına canlandırma süresi
    const wait = REDUCE ? 0 : leg
    seq.current += 1
    setPhase({ symbol, step: 1, answer, leg, n: seq.current })
    timers.current.push(
      setTimeout(() => setPhase((p) => ({ ...p, step: 2 })), wait),
      setTimeout(() => {
        setPhase((p) => ({ ...p, step: 3 }))
        setCached((c) => new Set(c).add(symbol))
      }, wait * 2),
    )
  }

  const a = phase?.answer
  const done = phase?.step === 3

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:p-5">
      <div className="text-body font-semibold text-foreground">Bir fiyat iste, nereden geldiğini gör</div>

      <div className="flex gap-1.5">
        {Object.keys(DEMO_SYMBOLS).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            className={cn('press h-10 rounded-full border px-3.5 font-mono text-ui font-semibold text-foreground hover:border-foreground',
              cached.has(s) ? 'border-up' : 'border-border')}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-1.5" aria-hidden="true">
        <Node label="Sen" glyph="☺" tone="on" />
        <Wire run={phase ? `${phase.n}-1` : null} ms={phase?.leg} />
        <Node label="Assay" glyph="A" tone={phase && phase.step >= 2 ? 'on' : null} />
        <Wire run={phase && phase.step >= 2 ? `${phase.n}-2` : null} ms={phase?.leg} />
        <Node
          label={a ? a.source : 'kaynak'}
          glyph={a ? (a.hit ? 'R' : '↗') : '?'}
          tone={done ? (a.hit ? 'hit' : 'miss') : null}
        />
      </div>

      <div className="min-h-[64px] rounded-md bg-secondary px-3 py-2.5 text-ui" aria-live="polite">
        {!phase ? (
          <span className="text-muted-foreground">Bir sembole dokun. İlk istek dış kaynağa gider; ikincisi önbellekten gelir.</span>
        ) : !done ? (
          <span className="text-muted-foreground">{phase.symbol} isteniyor…</span>
        ) : (
          <>
            <b className="tabular font-mono font-semibold text-foreground">{phase.symbol} {a.price}</b>
            <div className={a.hit ? 'text-up' : 'text-down'}>
              {a.hit ? 'Önbellekten' : a.source} · {String(a.ms).replace('.', ',')} ms
            </div>
            <div className="text-micro text-muted-foreground">
              {a.hit ? 'Dış kaynağa hiç gidilmedi.' : `${DEMO_TTL_MIN} dk önbellekte · tekrar dokun`}
            </div>
          </>
        )}
      </div>

      <div className="text-micro text-muted-foreground">Canlandırma · gerçek istek değil, fiyatlar örnek</div>
    </div>
  )
}
