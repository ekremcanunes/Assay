import { cn } from '@/lib/utils'

// Her sayfanın iskeleti: tuvale yapışık başlık çubuğu + padding'li gövde.
// Layout main'e padding vermez; onu buradan yönetiyoruz ki başlık kenara yapışabilsin.
export function Page({ eyebrow, title, meta, actions, tabs, children }) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 pt-4 backdrop-blur md:px-8 md:pt-5">
        <div className="flex flex-wrap items-end gap-3 pb-3 md:pb-4">
          <div className="min-w-0">
            {eyebrow && (
              <div className="label text-muted-foreground">{eyebrow}</div>
            )}
            <h1 className="mt-0.5 font-display text-head font-bold tracking-tight text-foreground md:text-title">{title}</h1>
            {meta && <div className="mt-1.5 text-ui text-muted-foreground">{meta}</div>}
          </div>
          {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {/* Sekmeler dar ekranda taşarsa yatay kaydırılır — sayfa gövdesi kaymaz */}
        {tabs && <div className="flex gap-5 overflow-x-auto">{tabs}</div>}
      </header>
      <div className="px-4 py-4 md:px-8 md:py-6">{children}</div>
    </>
  )
}

// Başlık çubuğundaki sekme — altı çizgili, ink değil pirinç
export function PageTab({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        '-mb-px shrink-0 whitespace-nowrap border-b-2 pb-2.5 text-ui',
        active
          ? 'border-brass font-semibold text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// Birincil aksiyon — pirinç dolgu
export function PrimaryAction({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg bg-brass px-3 py-1.5 text-ui font-semibold text-white hover:opacity-90',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// İkincil aksiyon — hairline
export function GhostAction({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-ui text-foreground hover:border-foreground',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
