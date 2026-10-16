import { AreaSpark } from '@/components/AreaSpark'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'

// Detay sayfasının üst alanı — kartın büyüdüğü yer (StoryCard ile aynı vt adları)
export function StoryHero({ vt, title, value, changePct, values, color, backLabel, onBack }) {
  return (
    <section
      style={{ viewTransitionName: vt }}
      className="relative mb-4 flex h-[240px] flex-col items-center overflow-hidden rounded-lg border border-border bg-card px-4 pt-2 text-center"
    >
      <button type="button" onClick={onBack} className="press flex h-11 items-center gap-1 self-start rounded-md pr-3 text-ui text-foreground hover:bg-secondary">
        <ChevronLeft className="h-4 w-4" /> {backLabel}
      </button>
      <span className="text-head font-bold tracking-tight" style={{ viewTransitionName: `${vt}-name` }}>{title}</span>
      <span className="tabular mt-2 text-head font-semibold tracking-tight md:text-title" style={{ viewTransitionName: `${vt}-val` }}>{value}</span>
      <span className={cn('tabular text-ui', changePct == null ? 'text-muted-foreground' : changePct >= 0 ? 'text-up' : 'text-down')}>
        {formatPct(changePct)}
      </span>
      <AreaSpark values={values} color={color} className="absolute inset-x-0 bottom-0 h-[38%] w-full" />
    </section>
  )
}
