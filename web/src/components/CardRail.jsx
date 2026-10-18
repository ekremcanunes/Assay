import { useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Mobil: tek kart tam genişlik, yatay kaydırma + noktalar/oklar. md+: kartlar yan yana.
// items: [{ key, label, node }] — detaydan dönüşte state.from === key olan kart ortalanır.
export function CardRail({ items, prevLabel, nextLabel }) {
  const location = useLocation()
  const railRef = useRef(null)
  const [index, setIndex] = useState(0)

  useLayoutEffect(() => {
    const from = location.state?.from
    const rail = railRef.current
    const card = from && rail?.querySelector(`[data-key="${from}"]`)
    if (card) rail.scrollLeft = card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2
  }, [location.state])

  const onScroll = () => {
    const rail = railRef.current
    const mid = rail.scrollLeft + rail.clientWidth / 2
    const cards = [...rail.children]
    const dist = (c) => Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
    setIndex(cards.reduce((b, c, i) => (dist(c) < dist(cards[b]) ? i : b), 0))
  }
  const goTo = (i) => {
    const rail = railRef.current
    const card = rail.children[i]
    rail.scrollTo({ left: card.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
  }

  return (
    <>
      <div
        ref={railRef}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-8 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:grid md:auto-cols-fr md:grid-flow-col md:gap-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it) => (
          <div key={it.key} data-key={it.key} className="w-full shrink-0 snap-center pt-1 md:w-auto">{it.node}</div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1 md:hidden">
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={prevLabel}
          className="press grid h-10 w-10 place-items-center rounded-full border border-border bg-card disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {items.map((it, i) => (
          <button key={it.key} type="button" onClick={() => goTo(i)} aria-label={it.label} aria-current={i === index}
            className="grid h-10 w-6 place-items-center">
            <i className={cn('block h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-foreground' : 'w-1.5 bg-border')} />
          </button>
        ))}
        <button type="button" onClick={() => goTo(index + 1)} disabled={index === items.length - 1} aria-label={nextLabel}
          className="press grid h-10 w-10 place-items-center rounded-full border border-border bg-card disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
