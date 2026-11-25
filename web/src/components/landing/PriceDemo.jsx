import { useEffect, useRef, useState } from 'react'
import { Info, User } from 'lucide-react'
import { DEMO_SYMBOLS, DEMO_TTL_MIN, demoAnswer } from '@/lib/priceDemo'
import { cn } from '@/lib/utils'

const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Rota çizgisi: istek geçerken soldan sağa dolar
function Wire({ run, ms, caption }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="h-4 font-mono text-micro text-muted-foreground">{caption}</span>
      <div className="relative h-0.5 w-full overflow-hidden rounded-full bg-input">
        {run && (
          <i
            key={run}
            className="absolute inset-0 origin-left bg-primary"
            style={{ animation: REDUCE ? 'none' : `wire-fill ${ms}ms linear forwards` }}
          />
        )}
      </div>
      <span className="h-4" />
    </div>
  )
}

function Node({ label, sub, glyph, tone }) {
  return (
    <div className="flex min-w-[64px] flex-col items-center gap-1 text-micro">
      <span className={cn('grid h-10 w-10 place-items-center rounded-lg border font-mono text-ui font-semibold transition-colors',
        tone === 'on' ? 'border-transparent bg-primary text-primary-foreground'
        : tone === 'hit' ? 'border-transparent bg-up text-card'
        : tone === 'miss' ? 'border-transparent bg-down text-card'
        : 'border-border bg-card text-foreground')}
      >
        {glyph}
      </span>
      <span className="font-semibold text-foreground">{label}</span>
      <span className="text-muted-foreground">{sub}</span>
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
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <i className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span className="label text-foreground">Bir fiyat iste, nereden geldiğini gör</span>
        </div>
        <span className="shrink-0 rounded-sm bg-secondary px-2 py-0.5 text-micro font-medium text-muted-foreground">Simülatör</span>
      </div>

      <div className="grid grid-cols-3 gap-0.5 rounded-[10px] bg-secondary p-1" role="group" aria-label="Sembol">
        {Object.keys(DEMO_SYMBOLS).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            aria-pressed={phase?.symbol === s}
            className={cn('press flex h-10 items-center justify-center gap-1.5 rounded-lg border font-mono text-ui',
              phase?.symbol === s
                ? 'border-border bg-card font-bold text-foreground shadow-card'
                : 'border-transparent font-semibold text-muted-foreground hover:text-foreground')}
          >
            {s}
            {cached.has(s) && <i className="h-1.5 w-1.5 rounded-full bg-up" aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 rounded-lg bg-secondary px-3 py-5 md:px-5" aria-hidden="true">
        <Node label="Sen" sub="Web istemci" glyph={<User className="h-4 w-4" />} tone="on" />
        <Wire run={phase ? `${phase.n}-1` : null} ms={phase?.leg} caption="GET /api" />
        <Node label="Assay" sub="market-service" glyph="A" tone={phase && phase.step >= 2 ? 'on' : null} />
        <Wire run={phase && phase.step >= 2 ? `${phase.n}-2` : null} ms={phase?.leg} />
        <Node
          label={a ? a.source : 'Kaynak'}
          sub={a ? (a.hit ? 'Redis' : 'Dış kaynak') : 'Redis / dış'}
          glyph={a ? (a.hit ? 'R' : '↗') : '?'}
          tone={done ? (a.hit ? 'hit' : 'miss') : null}
        />
      </div>

      <div className="flex min-h-[64px] items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 text-ui" aria-live="polite">
        {!phase ? (
          <>
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">Bir sembole dokun. İlk istek dış kaynağa gider; ikincisi {DEMO_TTL_MIN} dakikalık önbellekten (Redis) gelir.</span>
          </>
        ) : !done ? (
          <span className="text-muted-foreground">{phase.symbol} isteniyor…</span>
        ) : (
          <div>
            <b className="tabular font-mono font-semibold text-foreground">{phase.symbol} {a.price}</b>
            <div className={a.hit ? 'text-up' : 'text-down'}>
              {a.hit ? 'Önbellekten' : a.source} · {String(a.ms).replace('.', ',')} ms
            </div>
            <div className="text-micro text-muted-foreground">
              {a.hit ? 'Dış kaynağa hiç gidilmedi.' : `${DEMO_TTL_MIN} dk önbellekte · tekrar dokun`}
            </div>
          </div>
        )}
      </div>

      <div className="text-micro text-muted-foreground">Canlandırma · gerçek istek değil, fiyatlar örnek</div>
    </div>
  )
}
