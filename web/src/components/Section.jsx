import { cn } from '@/lib/utils'

// Bir içerik bloğu: başlık + meta + sağda aksiyon, altında gövde. Beyaz kart + hairline + hafif ambient gölge.
export function Section({ title, meta, action, className, bodyClassName, children }) {
  return (
    <section className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-card', className)}>
      {(title || action) && (
        <div className="flex min-h-[44px] items-center gap-3 px-4 pb-2 pt-4">
          {title && <h2 className="font-display text-body font-semibold text-foreground">{title}</h2>}
          {meta && <span className="tabular text-micro font-medium text-muted-foreground">{meta}</span>}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  )
}

// Delta çipi — YALNIZCA kâr/zarar için (yeşil/kırmızı semantiktir)
export function DeltaChip({ value, suffix = '%' }) {
  if (value == null) return null
  const up = value >= 0
  return (
    <span
      className={cn(
        'tabular mt-2 inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-micro font-semibold',
        up ? 'chip-up' : 'chip-down'
      )}
    >
      {up ? '▲' : '▼'} {up ? '+' : ''}{value.toFixed(2)}{suffix}
    </span>
  )
}
