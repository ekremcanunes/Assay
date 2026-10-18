import { useLanguage } from '@/contexts/LanguageContext'
import { catOf } from '@/lib/assetColors'
import { formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'

const money = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v ?? 0)

// Portföy sayfalarında hep görünen ince şerit: toplam + ağırlık + kategori ₺/%
export function PortfolioStrip({ total, totalPct, categories }) {
  const { t } = useLanguage()
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="tabular text-figure font-semibold tracking-tight text-foreground">{money(total)}</span>
        <span className={cn('tabular text-ui', totalPct == null ? 'text-muted-foreground' : totalPct >= 0 ? 'text-up' : 'text-down')}>
          {formatPct(totalPct)}
        </span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-border">
        {categories.filter((c) => c.share > 0).map((c) => (
          <span key={c.key} className={catOf(c.key).dot} style={{ width: `${c.share * 100}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {categories.map((c) => (
          <div key={c.key} className="min-w-0">
            <div className="flex items-center gap-1.5 text-micro text-muted-foreground">
              <i className={cn('h-2 w-2 shrink-0 rounded-sm', catOf(c.key).dot)} />
              {t(`assets.${c.key.toLowerCase()}`)}
            </div>
            <div className="tabular truncate text-ui font-semibold text-foreground">
              {money(c.value)} <span className="font-normal text-muted-foreground">%{Math.round(c.share * 100)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
