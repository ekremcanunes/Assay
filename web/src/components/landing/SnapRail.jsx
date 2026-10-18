import { Children, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/*
  Mobil kart rayı: ekranda tek kart, kaydırınca bir sonraki gelir (yanındakinin kenarı görünmez).
  Ray sayfa kenarına kadar uzanır (-mx-5) ama kartlar kenar boşluğunda hizalı durur (px-5 + scroll-px-5);
  aradaki boşluk (gap-5) kenar boşluğuyla aynı olduğu için komşu kart ekrana sızmaz.
*/
export default function SnapRail({ children, className, label }) {
  const ref = useRef(null)
  const [index, setIndex] = useState(0)
  const items = Children.toArray(children)

  const onScroll = () => {
    const el = ref.current
    if (!el?.firstElementChild) return
    const step = el.firstElementChild.offsetWidth + 20 // kart + gap-5
    setIndex(Math.round(el.scrollLeft / step))
  }

  const go = (i) => {
    const el = ref.current
    const card = el?.children[i]
    if (card) el.scrollTo({ left: card.offsetLeft - 20, behavior: 'smooth' })
  }

  return (
    <div className={className}>
      <div
        ref={ref}
        onScroll={onScroll}
        aria-label={label}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <div key={i} className="w-full shrink-0 snap-start snap-always">{child}</div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`${i + 1} / ${items.length}`}
            aria-current={i === index ? 'true' : undefined}
            className="grid h-6 place-items-center px-0.5"
          >
            <i className={cn('block h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-foreground' : 'w-1.5 bg-border')} />
          </button>
        ))}
      </div>
    </div>
  )
}
