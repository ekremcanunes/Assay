import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

// Her sayfanın iskeleti: tuvale yapışık başlık çubuğu + padding'li gövde.
// Layout main'e padding vermez; onu buradan yönetiyoruz ki başlık kenara yapışabilsin.
// back: { label, onClick } — başlığın solunda geri oku
export function Page({ eyebrow, title, meta, actions, tabs, band, back, children }) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 pt-4 backdrop-blur md:px-8 md:pt-5">
        <div className="flex items-end gap-3 pb-3 md:flex-wrap md:pb-4">
          {back && (
            <button
              type="button"
              onClick={back.onClick}
              aria-label={back.label}
              className="press -ml-2 grid h-11 w-11 shrink-0 place-items-center self-center rounded-lg text-foreground hover:bg-secondary"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="label text-muted-foreground">{eyebrow}</div>
            )}
            <h1 className="mt-0.5 truncate font-display text-head font-bold text-foreground md:text-title">{title}</h1>
            {meta && <div className="mt-1.5 text-ui text-muted-foreground">{meta}</div>}
          </div>
          {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {/* Başlığa yapışık ek şerit (ör. Portföy toplamı) — başlıkla birlikte kaydırmada üstte kalır */}
        {band && <div className="pb-3 md:pb-4">{band}</div>}
        {/* Sekmeler dar ekranda taşarsa yatay kaydırılır — sayfa gövdesi kaymaz */}
        {tabs && <div className="flex gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{tabs}</div>}
      </header>
      <div className="px-4 py-4 md:px-8 md:py-6">{children}</div>
    </>
  )
}

// Başlık çubuğundaki sekme — altı çizgili, aktifte kobalt
export function PageTab({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        '-mb-px shrink-0 whitespace-nowrap border-b-2 pb-2.5 text-ui',
        active
          ? 'border-primary font-semibold text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// Birincil aksiyon — kobalt dolgu
export function PrimaryAction({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'press inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-primary px-3.5 text-ui font-semibold text-primary-foreground hover:opacity-90',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// İkincil aksiyon — beyaz yüzey + hairline
export function GhostAction({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'press inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-ui font-medium text-foreground hover:bg-secondary',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
