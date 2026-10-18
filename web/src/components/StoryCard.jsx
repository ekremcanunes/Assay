import { AreaSpark } from '@/components/AreaSpark'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

const pctCls = (v) => (v == null ? 'text-muted-foreground' : v >= 0 ? 'text-up' : 'text-down')

// Uzun kart: dokununca detay sayfasına büyür. vt = view-transition-name kökü (StoryHero ile aynı).
// Gölge yok (VOLTAJ): üzerine gelince ink kenarlık + hafif kalkar; basınca içe basma (sayfa hemen değişir).
export function StoryCard({ vt, title, sub, topLeft, value, changePct, values, color, onOpen, ariaLabel, className }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      style={{ viewTransitionName: vt }}
      className={cn(
        'group relative flex flex-col items-center overflow-hidden rounded-lg border border-border bg-card px-4 pt-4 text-center text-foreground',
        'transition-[border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground',
        'active:translate-y-0 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className
      )}
    >
      <span className="flex w-full justify-between text-micro text-muted-foreground">
        <span>{topLeft}</span>
        <span className={pctCls(changePct)}>{formatPct(changePct)}</span>
      </span>
      <span className="mt-6 text-head font-bold tracking-tight" style={{ viewTransitionName: `${vt}-name` }}>{title}</span>
      <span className="text-micro text-muted-foreground">{sub}</span>
      <span className="tabular mt-5 text-head font-semibold tracking-tight md:text-title" style={{ viewTransitionName: `${vt}-val` }}>{value}</span>
      <span className={cn('tabular text-ui', pctCls(changePct))}>{formatPct(changePct)}</span>
      <AreaSpark values={values} color={color} className="absolute inset-x-0 bottom-0 h-[42%] w-full opacity-80 transition-opacity duration-200 group-hover:opacity-100" />
    </button>
  )
}
